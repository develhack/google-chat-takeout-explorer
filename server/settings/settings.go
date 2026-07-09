package settings

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"
)

var HomeDir string
var AppCacheDir string
var DataDir string
var IndexDir string

var Data *data
var UI *ui

type data struct {
	TakeoutDir              string `json:"takeout_dir"`
	Analyzer                string `json:"analyzer"`
	MaxPhrasesForExactMatch int    `json:"max_phrases_for_exact_match"`
	DateTimeRegexp          string `json:"date_time_regexp"`
	DateTimeReplacement     string `json:"date_time_replacement"`
	DateTimeParseFormat     string `json:"date_time_parse_format"`
	MaxResults              int    `json:"max_results"`
}

type ui struct {
	Port int `json:"port"`
}

type settings struct {
	Data data `json:"data"`
	UI   ui   `json:"ui"`
}

func init() {
	HomeDir = os.Getenv("GCTE_HOME")
	if HomeDir == "" {
		p, _ := os.Executable()
		HomeDir = filepath.Dir(p)
	}
	os.Chdir(HomeDir)

	settingsData, err := os.ReadFile("settings.json")
	if err != nil {
		log.Fatalf("Failed to read settings.json: %v", err)
	}

	var settings settings
	if err := json.Unmarshal(settingsData, &settings); err != nil {
		log.Fatalf("Failed to unmarshal settings.json: %v", err)
	}

	Data = &settings.Data
	UI = &settings.UI

	userCacheDir, err := os.UserCacheDir()
	if err != nil {
		log.Fatalf("Failed to resolve cache directory: %v", err)
	}

	AppCacheDir = filepath.Join(userCacheDir, "google-chat-takeout-explorer")
	DataDir = filepath.Join(AppCacheDir, "data")
	IndexDir = filepath.Join(AppCacheDir, "index")
}
