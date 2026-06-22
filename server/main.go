package main

import (
	"google-chat-takeout-explorer/controller"
	"google-chat-takeout-explorer/data"
	"log"
)

func main() {

	if data.ShouldBuildData() {
		if err := data.BuildData(); err != nil {
			log.Fatal(err)
		}
	}

	if err := data.Init(); err != nil {
		log.Fatal(err)
	}

	if err := controller.Serve(); err != nil {
		log.Fatal(err)
	}
}
