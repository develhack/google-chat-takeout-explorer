package controller

import (
	"context"
	"fmt"
	"google-chat-takeout-explorer/data"
	"google-chat-takeout-explorer/settings"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"regexp"
	"strings"
	"syscall"
	"time"

	"github.com/labstack/echo/v5"
)

func Serve() error {

	e := echo.New()

	e.Logger = slog.New(slog.NewTextHandler(os.Stdout, nil))

	api := e.Group("/api")

	api.GET("/messages/:groupId", func(c *echo.Context) error {
		groupId := c.Param("groupId")
		sequence, _ := echo.QueryParamOr(c, "sequence", 0)
		direction, _ := echo.QueryParamOr(c, "direction", "after")

		res, err := data.FetchAdjacentGroupMessages(groupId, sequence, direction)
		if err != nil {
			return err
		}

		return c.JSON(http.StatusOK, res)
	})

	api.GET("/messages/:groupId/:threadId", func(c *echo.Context) error {
		groupId := c.Param("groupId")
		threadId := c.Param("threadId")
		sequence, _ := echo.QueryParamOr(c, "sequence", 0)
		direction, _ := echo.QueryParamOr(c, "direction", "after")

		res, err := data.FetchAdjacentThreadMessages(groupId, threadId, sequence, direction)
		if err != nil {
			return err
		}

		return c.JSON(http.StatusOK, res)
	})

	api.GET("/messages/:groupId/:threadId/:messageId", func(c *echo.Context) error {
		groupId := c.Param("groupId")
		threadId := c.Param("threadId")
		messageId := c.Param("messageId")

		res, err := data.GetMessage(groupId, threadId, messageId)
		if err != nil {
			return err
		}

		return c.JSON(http.StatusOK, res)
	})

	api.GET("/search", func(c *echo.Context) error {
		keywords := c.QueryParam("keywords")
		groupId := c.QueryParam("group-id")
		author := c.QueryParam("author")
		from := c.QueryParam("from")
		to := c.QueryParam("to")
		offset, _ := echo.QueryParamOr(c, "offset", 0)
		sort := c.QueryParam("sort")

		fromTime, _ := time.Parse(time.RFC3339, from)
		toTime, _ := time.Parse(time.RFC3339, to)

		res, err := data.SearchMessages(splitKeywords(keywords), groupId, author, fromTime, toTime, offset, sort)
		if err != nil {
			return err
		}

		return c.JSON(http.StatusOK, res)
	})

	address := fmt.Sprintf("localhost:%d", settings.UI.Port)
	sc := echo.StartConfig{
		Address:    address,
		HideBanner: true,
		HidePort:   true,
		BeforeServeFunc: func(s *http.Server) error {
			log.Printf("open http://%s in your browser", address)
			return nil
		},
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	if err := sc.Start(ctx, e); err != nil {
		return err
	}

	return nil
}

var keywordsRegexp = regexp.MustCompile(`"([^"]*)"|([^\s"]+)`)

func splitKeywords(keywords string) []string {

	matches := keywordsRegexp.FindAllStringSubmatch(keywords, -1)

	var result []string
	for _, match := range matches {
		if strings.HasPrefix(match[0], `"`) {
			result = append(result, match[1])
		} else {
			result = append(result, match[2])
		}
	}

	return result
}
