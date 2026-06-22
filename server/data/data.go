package data

import (
	"archive/zip"
	"encoding/json"
	"errors"
	"fmt"
	_ "google-chat-takeout-explorer/analyser/unigram"
	"google-chat-takeout-explorer/settings"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"log"
	"maps"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	_ "golang.org/x/image/webp"

	"github.com/blevesearch/bleve/v2"
	"github.com/blevesearch/bleve/v2/mapping"
	"github.com/blevesearch/bleve/v2/search"
	"github.com/blevesearch/bleve/v2/search/query"
)

type IndexedMessage struct {
	Sequence  int       `json:"sequence"`
	GroupID   string    `json:"group_id"`
	ThreadID  string    `json:"thread_id"`
	MessageID string    `json:"message_id"`
	IsTopic   bool      `json:"is_topic"`
	Author    string    `json:"author"`
	PostedAt  time.Time `json:"posted_at"`
	Text      string    `json:"text"`
}

type MessagesChunk struct {
	Messages []*Message `json:"messages"`
	Total    uint64     `json:"total"`
}

type Message struct {
	Sequence  int            `json:"sequence"`
	GroupID   string         `json:"group_id"`
	ThreadID  string         `json:"thread_id"`
	MessageID string         `json:"message_id"`
	Replies   uint64         `json:"replies"`
	Contents  map[string]any `json:"contents"`
}

type SearchResult struct {
	Sequence  int      `json:"sequence"`
	GroupID   string   `json:"group_id"`
	ThreadID  string   `json:"thread_id"`
	MessageID string   `json:"message_id"`
	Author    string   `json:"author"`
	PostedAt  string   `json:"posted_at"`
	Texts     []string `json:"texts"`
}

type SearchResults struct {
	Results []*SearchResult `json:"results"`
	Offset  int             `json:"offset"`
	Total   uint64          `json:"total"`
}

var dateTimeRegexp = regexp.MustCompile(settings.Data.DateTimeRegexp)

var index bleve.Index

func Init() error {

	var err error
	index, err = bleve.Open(path.Join(settings.IndexDir))
	if err != nil {
		return err
	}

	return nil
}

func ShouldBuildData() bool {
	var err error
	_, err = os.Stat(settings.DataDir)
	if err != nil {
		return true
	}
	_, err = os.Stat(settings.IndexDir)
	if err != nil {
		return true
	}

	return false
}

func BuildData() error {
	log.Printf("build data")

	var account string
	var groupsMap = make(map[string](map[string]any))
	var usersMap = make(map[string]string)

	if err := unarchiveTakeoutZipFiles(&account, &groupsMap, &usersMap); err != nil {
		return err
	}

	if err := processMessagesJsonFiles(&groupsMap); err != nil {
		return err
	}

	if err := os.WriteFile(path.Join(settings.DataDir, "account.txt"), []byte(account), 0644); err != nil {
		return err
	}

	if err := writeJson(path.Join(settings.DataDir, "groups.json"), groupsMap); err != nil {
		return err
	}

	if err := writeJson(path.Join(settings.DataDir, "users.json"), usersMap); err != nil {
		return err
	}

	return nil
}

func FetchAdjacentGroupMessages(groupId string, sequence int, direction string) (*MessagesChunk, error) {

	query := bleve.NewConjunctionQuery()

	{
		q := bleve.NewTermQuery(groupId)
		q.SetField(("group_id"))
		query.AddQuery(q)
	}

	{
		q := bleve.NewBoolFieldQuery(true)
		q.SetField(("is_topic"))
		query.AddQuery(q)
	}

	results, err := fetchAdjacent(query, sequence, direction)
	if err != nil {
		return nil, err
	}

	chunk := MessagesChunk{}

	chunk.Total = results.Total
	chunk.Messages = make([]*Message, 0, len(results.Hits))
	for _, hit := range results.Hits {
		m := Message{}
		m.Sequence = int(hit.Fields["sequence"].(float64))

		ids := strings.Split(hit.ID, "/")
		m.GroupID = ids[0]
		m.ThreadID = ids[1]
		m.MessageID = ids[2]

		replies, err := countReplies(m.GroupID, m.ThreadID)
		if err != nil {
			return nil, err
		}
		m.Replies = replies

		if err := readJsonFromFile(path.Join(settings.DataDir, m.GroupID, m.ThreadID, m.MessageID)+".json", &m.Contents); err != nil {
			return nil, err
		}

		chunk.Messages = append(chunk.Messages, &m)
	}

	return &chunk, nil
}

func FetchAdjacentThreadMessages(groupId string, threadId string, sequence int, direction string) (*MessagesChunk, error) {

	query := bleve.NewConjunctionQuery()

	{
		q := bleve.NewTermQuery(groupId)
		q.SetField(("group_id"))
		query.AddQuery(q)
	}

	{
		q := bleve.NewTermQuery(threadId)
		q.SetField(("thread_id"))
		query.AddQuery(q)
	}

	results, err := fetchAdjacent(query, sequence, direction)
	if err != nil {
		return nil, err
	}

	chunk := MessagesChunk{}
	chunk.Total = results.Total

	chunk.Messages = make([]*Message, 0, len(results.Hits))
	for _, hit := range results.Hits {
		m := Message{}
		m.Sequence = int(hit.Fields["sequence"].(float64))

		ids := strings.Split(hit.ID, "/")
		m.GroupID = ids[0]
		m.ThreadID = ids[1]
		m.MessageID = ids[2]

		if err := readJsonFromFile(path.Join(settings.DataDir, m.GroupID, m.ThreadID, m.MessageID)+".json", &m.Contents); err != nil {
			return nil, err
		}

		chunk.Messages = append(chunk.Messages, &m)
	}

	return &chunk, nil
}

func GetMessage(groupId string, threadId string, messageId string) (*Message, error) {

	doc, err := getDocument(groupId + "/" + threadId + "/" + messageId)
	if err != nil {
		return nil, err
	}
	if doc == nil {
		return nil, nil
	}

	m := Message{}

	m.Sequence = int(doc.Fields["sequence"].(float64))
	m.GroupID = groupId
	m.ThreadID = threadId
	m.MessageID = messageId

	if err := readJsonFromFile(path.Join(settings.DataDir, m.GroupID, m.ThreadID, m.MessageID)+".json", &m.Contents); err != nil {
		return nil, err
	}

	return &m, nil
}

func SearchMessages(keywords []string, groupId string, author string, from time.Time, to time.Time, offset int, sort string) (*SearchResults, error) {

	cq := bleve.NewConjunctionQuery()

	for _, keyword := range keywords {
		ts, err := index.Mapping().(*mapping.IndexMappingImpl).AnalyzeText(settings.Data.Analyzer, []byte(keyword))
		if err != nil {
			return nil, err
		}
		if len(ts) > settings.Data.MaxPhrasesForExactMatch { // prevent OOME
			q := bleve.NewMatchQuery(keyword)
			q.SetOperator(query.MatchQueryOperatorAnd)
			q.SetField("text")
			cq.AddQuery(q)
		} else {
			q := bleve.NewMatchPhraseQuery(keyword)
			q.SetField("text")
			cq.AddQuery(q)
		}
	}

	if groupId != "" {
		q := bleve.NewTermQuery(groupId)
		q.SetField("group_id")
		cq.AddQuery(q)
	}

	if author != "" {
		q := bleve.NewTermQuery(author)
		q.SetField("author")
		cq.AddQuery(q)
	}

	if !from.IsZero() || !to.IsZero() {
		q := bleve.NewDateRangeQuery(from, to)
		q.SetField("posted_at")
		cq.AddQuery(q)
	}

	request := bleve.NewSearchRequestOptions(cq, settings.Data.MaxResults, offset, false)
	request.Fields = []string{"sequence", "author", "posted_at"}
	request.Highlight = bleve.NewHighlight()

	switch sort {
	case "n":
		request.SortBy([]string{"-sequence"})
	case "o":
		request.SortBy([]string{"sequence"})
	}

	results, err := index.Search(request)
	if err != nil {
		return nil, err
	}

	rs := SearchResults{}
	rs.Offset = offset
	rs.Total = results.Total

	rs.Results = make([]*SearchResult, 0, len(results.Hits))
	for _, hit := range results.Hits {
		r := SearchResult{}
		r.Sequence = int(hit.Fields["sequence"].(float64))

		ids := strings.Split(hit.ID, "/")
		r.GroupID = ids[0]
		r.ThreadID = ids[1]
		r.MessageID = ids[2]

		r.Author = hit.Fields["author"].(string)
		r.PostedAt = hit.Fields["posted_at"].(string)

		for field, fragment := range hit.Fragments {
			switch field {
			case "text":
				r.Texts = append(r.Texts, fragment...)
			}
		}

		rs.Results = append(rs.Results, &r)
	}

	return &rs, nil
}

func createIndexMapping() *mapping.IndexMappingImpl {
	mapping := bleve.NewIndexMapping()
	mapping.DefaultAnalyzer = settings.Data.Analyzer
	mapping.DefaultMapping.AddFieldMappingsAt("sequence", bleve.NewNumericFieldMapping())
	mapping.DefaultMapping.AddFieldMappingsAt("group_id", bleve.NewKeywordFieldMapping())
	mapping.DefaultMapping.AddFieldMappingsAt("thread_id", bleve.NewKeywordFieldMapping())
	mapping.DefaultMapping.AddFieldMappingsAt("message_id", bleve.NewKeywordFieldMapping())
	mapping.DefaultMapping.AddFieldMappingsAt("is_topic", bleve.NewBooleanFieldMapping())
	mapping.DefaultMapping.AddFieldMappingsAt("author", bleve.NewKeywordFieldMapping())
	mapping.DefaultMapping.AddFieldMappingsAt("posted_at", bleve.NewDateTimeFieldMapping())
	mapping.DefaultMapping.AddFieldMappingsAt("text", bleve.NewTextFieldMapping())
	return mapping
}

func readJsonFromFile(p string, v any) error {

	r, err := os.Open(p)
	if err != nil {
		return err
	}
	defer r.Close()

	return readJson(r, v)
}

func readJsonFromZip(f *zip.File, v any) error {

	r, err := f.Open()
	if err != nil {
		return err
	}
	defer r.Close()

	return readJson(r, v)
}

func readJson(r io.Reader, v any) error {

	b, err := io.ReadAll(r)
	if err != nil {
		return err
	}

	if err := json.Unmarshal(b, v); err != nil {
		return err
	}

	return nil
}

func writeJson(p string, obj any) error {

	data, err := json.MarshalIndent(obj, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(p, data, 0644); err != nil {
		return err
	}

	return nil
}

func resolveGroupID(p string) (string, error) {

	if p2, found := strings.CutPrefix(p, "Takeout/Google Chat/Groups/DM "); found {
		return filepath.Dir(p2), nil
	}

	if p2, found := strings.CutPrefix(p, "Takeout/Google Chat/Groups/Space "); found {
		return filepath.Dir(p2), nil
	}

	return filepath.Base(filepath.Dir(p)), nil
}

func unarchiveTakeoutZipFiles(account *string, groupsMap *map[string](map[string]any), usersMap *map[string]string) error {

	takeoutFiles, err := filepath.Glob(path.Join(settings.Data.TakeoutDir, "takeout-*.zip"))
	if err != nil {
		return err
	}

	for _, takeoutFile := range takeoutFiles {

		log.Printf("unarchive %s", takeoutFile)

		if err := func() error {

			r, err := zip.OpenReader(takeoutFile)
			if err != nil {
				return err
			}
			defer r.Close()

			for _, f := range r.File {

				if f.FileInfo().IsDir() {
					continue
				}

				if !strings.HasPrefix(f.Name, "Takeout/Google Chat/") {
					continue
				}

				base := filepath.Base(f.Name)
				switch base {
				case "archive_browser.html", "unsentmessages.json":
					// skip
					continue
				case "user_info.json":
					if err := processUserInfoJson(f, account); err != nil {
						return err
					}
				case "group_info.json":
					if err := processGroupInfoJson(f, groupsMap, usersMap); err != nil {
						return err
					}
				default:
					if err := extractFile(f); err != nil {
						log.Printf("%v", err)
					}
				}
			}
			return nil
		}(); err != nil {
			return err
		}
	}

	return nil
}

func processUserInfoJson(f *zip.File, account *string) error {

	log.Printf("process %s", f.Name)

	var userInfo map[string]any
	if err := readJsonFromZip(f, &userInfo); err != nil {
		return err
	}

	if user, ok := userInfo["user"].(map[string]any); ok {
		*account = user["email"].(string)
		return nil
	}

	return errors.New("account unable to resolve")
}

func processGroupInfoJson(f *zip.File, groupsMap *map[string](map[string]any), usersMap *map[string]string) error {

	// log.Printf("process %s", f.Name)

	var group map[string]any
	if err := readJsonFromZip(f, &group); err != nil {
		return err
	}

	if members, ok := group["members"].([]any); ok {
		// delete(group, "members")
		// emails := make([]string, 0, len(members))
		for _, member := range members {
			m := member.(map[string]any)
			if email, found := m["email"]; found {
				// emails = append(emails, email.(string))
				if name, found := m["name"]; found {
					(*usersMap)[email.(string)] = name.(string)
				}
			}
		}
		// group["members"] = emails
	}

	id, err := resolveGroupID(f.Name)
	if err != nil {
		return err
	}

	if existingGroup, found := (*groupsMap)[id]; found {
		maps.Copy(existingGroup, group)
	} else {
		(*groupsMap)[id] = group
	}

	return nil
}

func processMessagesJsonFiles(groupsMap *map[string](map[string]any)) error {

	log.Println("find all messages.json")
	messagesJsonFiles, err := filepath.Glob(path.Join(settings.DataDir, "*", "messages.json"))
	if err != nil {
		return err
	}

	index, err := bleve.New(path.Join(settings.IndexDir), createIndexMapping())
	if err != nil {
		return err
	}
	defer index.Close()

	batch := index.NewBatch()

	l := len(messagesJsonFiles)
	for i, messagesJsonFile := range messagesJsonFiles {

		log.Printf("process %s (%d/%d)", messagesJsonFile, i+1, l)

		groupId, err := resolveGroupID(messagesJsonFile)
		if err != nil {
			return err
		}

		if err := func() error {

			r, err := os.Open(messagesJsonFile)
			if err != nil {
				return err
			}
			defer r.Close()

			includingDeletedUsers := false
			physicalFileNameBranchNumbers := make(map[string]int)

			dec := json.NewDecoder(r)
			_, _ = dec.Token() // {
			_, _ = dec.Token() // "messages"
			_, _ = dec.Token() // [
			var i = 1
			var lastPostedAt time.Time
			for dec.More() {

				if batch.Size() >= 1000 {
					index.Batch(batch)
					batch.Reset()
				}

				var m map[string]any
				if err := dec.Decode(&m); err != nil {
					return err
				}

				id, ok := m["message_id"].(string)
				if !ok {
					continue
				}

				creator, ok := m["creator"].(map[string]any)
				if !ok {
					continue
				}
				var author string
				author, _ = creator["email"].(string)
				if author == "" {
					author, _ = creator["name"].(string)
					if author == "Deleted User" {
						includingDeletedUsers = true
					}
				}
				if author == "" {
					continue
				}

				createDate, ok := m["created_date"].(string)
				if !ok {
					continue
				}
				postedAt, err := time.Parse(settings.Data.DateTimeParseFormat, dateTimeRegexp.ReplaceAllString(createDate, settings.Data.DateTimeReplacement))
				if err != nil {
					return err
				}
				lastPostedAt = postedAt

				text, _ := m["text"].(string)

				attachedFiles, ok := m["attached_files"].([]any)
				var logicalFileNames []string
				for _, attachedFile := range attachedFiles {
					e, ok := attachedFile.(map[string]any)
					if !ok {
						continue
					}
					logicalFileName, ok := e["original_name"].(string)
					if !ok {
						continue
					}
					physicalFileName, ok := e["export_name"].(string)
					if !ok {
						continue
					}

					if utf8.RuneCountInString(physicalFileName) > 51 {
						ext := filepath.Ext(physicalFileName)
						physicalFileName = string(([]rune(physicalFileName))[0:51-len(ext)]) + ext
					}

					physicalFileNameBranchNumber, _ := physicalFileNameBranchNumbers[physicalFileName]
					physicalFileNameBranchNumbers[physicalFileName] = physicalFileNameBranchNumber + 1
					if physicalFileNameBranchNumber > 0 {
						ext := filepath.Ext(physicalFileName)
						if ext == "" {
							physicalFileName = fmt.Sprintf("%s(%d)", physicalFileName, physicalFileNameBranchNumber)
						} else {
							physicalFileName = fmt.Sprintf("%s(%d)%s", strings.TrimSuffix(physicalFileName, ext), physicalFileNameBranchNumber, ext)
						}
						e["export_name"] = physicalFileName
					}

					if isImageFile(physicalFileName) {
						path := path.Join(settings.DataDir, groupId, physicalFileName)
						width, height, err := getImageSize(path)
						if err == nil {
							e["width"] = width
							e["height"] = height
						} else {
							log.Printf("failed to get size of %s: %v", path, err)
						}
					}

					logicalFileNames = append(logicalFileNames, logicalFileName)
				}

				ids := strings.Split(id, "/")
				im := IndexedMessage{
					Sequence:  i,
					GroupID:   ids[0],
					ThreadID:  ids[1],
					MessageID: ids[2],
					IsTopic:   ids[1] == ids[2],
					Author:    author,
					PostedAt:  postedAt,
					Text:      strings.ReplaceAll(text+"\n"+strings.Join(logicalFileNames, "\n"), "�", ""),
				}

				if err := batch.Index(id, im); err != nil {
					return err
				}

				i++

				m["posted_at"] = postedAt

				p := path.Join(settings.DataDir, id) + ".json"
				d := filepath.Dir(p)
				os.MkdirAll(d, 0755)
				if err := writeJson(p, m); err != nil {
					return err
				}
			}

			id, err := resolveGroupID(messagesJsonFile)
			if err != nil {
				return err
			}

			if existingGroup, found := (*groupsMap)[id]; found {
				existingGroup["message_count"] = i - 1
				existingGroup["last_posted_at"] = lastPostedAt
				existingGroup["including_deleted_users"] = includingDeletedUsers
			} else {
				group := map[string]any{
					"message_count":           i - 1,
					"last_posted_at":          lastPostedAt,
					"including_deleted_users": includingDeletedUsers,
				}
				(*groupsMap)[id] = group
			}

			return nil

		}(); err != nil {
			return nil
		}

	}

	if batch.Size() > 0 {
		index.Batch(batch)
	}

	return nil
}

func extractFile(f *zip.File) error {

	id, err := resolveGroupID(f.Name)
	if err != nil {
		log.Printf("ignore %s", f.Name)
		return err
	}

	d := path.Join(settings.DataDir, id)
	if err := os.MkdirAll(d, 0755); err != nil {
		return err
	}

	p := path.Join(d, filepath.Base(f.Name))
	w, err := os.Create(p)
	if err != nil {
		return err
	}
	defer w.Close()

	r, err := f.Open()
	if err != nil {
		return err
	}
	defer r.Close()

	_, err = io.Copy(w, r)
	if err != nil {
		return err
	}

	return nil
}

func fetchAdjacent(query *query.ConjunctionQuery, sequence int, direction string) (*bleve.SearchResult, error) {

	s := float64(sequence)
	var min, max *float64
	var sort string
	switch direction {
	case "after":
		min = &s
		sort = "sequence"
	case "before":
		max = &s
		sort = "-sequence"

	default:
		return nil, errors.New("invalid direction: " + direction)
	}

	if s > 0 {
		q := bleve.NewNumericRangeQuery(min, max)
		q.SetField("sequence")
		query.AddQuery(q)
	}

	request := bleve.NewSearchRequestOptions(query, settings.Data.MaxResults, 0, false)
	request.Fields = []string{"sequence"}
	request.SortBy([]string{sort})

	results, err := index.Search(request)
	if err != nil {
		return nil, err
	}

	return results, nil
}

func countReplies(groupId string, threadId string) (uint64, error) {

	query := bleve.NewConjunctionQuery()

	{
		q := bleve.NewTermQuery(groupId)
		q.SetField(("group_id"))
		query.AddQuery(q)
	}

	{
		q := bleve.NewTermQuery(threadId)
		q.SetField(("thread_id"))
		query.AddQuery(q)
	}

	{
		q := bleve.NewBoolFieldQuery(false)
		q.SetField(("is_topic"))
		query.AddQuery(q)
	}

	request := bleve.NewSearchRequestOptions(query, 0, 0, false)
	results, err := index.Search(request)
	if err != nil {
		return 0, err
	}

	return results.Total, nil
}

func getDocument(id string) (*search.DocumentMatch, error) {
	query := bleve.NewDocIDQuery([]string{id})

	request := bleve.NewSearchRequestOptions(query, 1, 0, false)
	request.Fields = []string{"sequence"}

	results, err := index.Search(request)
	if err != nil {
		return nil, err
	}

	if len(results.Hits) == 0 {
		return nil, nil
	}

	return results.Hits[0], nil
}

func isImageFile(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".jpg", ".jpeg", ".png", ".apng", ".gif", ".webp":
		return true
	default:
		return false
	}
}

func getImageSize(path string) (width int, height int, err error) {

	file, err := os.Open(path)
	if err != nil {
		return 0, 0, err
	}
	defer file.Close()

	config, _, err := image.DecodeConfig(file)
	if err == nil {
		return config.Width, config.Height, nil
	}

	file2, err := os.Open(path)
	if err != nil {
		return 0, 0, err
	}
	defer file2.Close()

	img, _, err := image.Decode(file2)
	if err == nil {
		return img.Bounds().Dx(), img.Bounds().Dy(), nil
	}

	return 0, 0, err
}
