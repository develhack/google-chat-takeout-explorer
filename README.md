# Google Chat Takeout Explorer

An application for viewing and searching exported Google Chat data.

Run the server locally and access it from your browser.

## Features

- Works completely offline. No data is sent externally.
- Full-text search functionality and selectable analyzers powered by [Bleve](https://blevesearch.com/).
- By changing the settings, it is (likely) possible to support various locales.
- Supports multiple platforms.

## Basic Usage
1. Download the binary appropriate for your environment from the [release page](https://github.com/develhack/google-chat-takeout-explorer/releases) and place it in a directory of your choice.
1. Download the `settings_xx-XX.json` file according to your locale from [here](./settings), rename it to `settings.json`, and place it in the same directory as the binary.
1. Edit `settings.json` and change the value of `takeout_dir` to the path of the directory where `takeout-*.zip` is located.
1. Execute the binary (it will take some time upon the first execution as it performs decompression of compressed files and index creation).
1. Access `http://localhost:1110` from your browser.

## Advanced Usage

TODO
