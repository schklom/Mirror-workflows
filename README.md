# Web Whisper

Get OpenAI's [Whisper](https://github.com/openai/whisper) right into your browser!

This is a small personal project I am using to learn Golang and Svelte. It is a light web frontend for OpenAI's whisper.

## Contents:

- [Features](#features)
- [Roadmap](#roadmap)
- [Test it!](#test-it)
- [Self Host](https://codeberg.org/pluja/web-whisper/wiki/Self-Hosting)
- [Screenshots](#screenshots)

## ✨ Features:

- [x] Record and transcribe audio right from your browser.
- [x] Upload any media file (video, audio) in any format and transcribe it.
    - [x] Option to cut audio to X seconds before transcription.
    - [x] Option to disable file uploads.
- [x] Download `.srt` subtitle file generated from audio.
- [x] Lightweight and beautiful UI.
- [x] Self-hosted. No 3rd parties.
- [x] **Docker compose** for easy self-hosting
- [x] Select input audio language
- [x] **Privacy respecting**: 
    - All happens locally. No third parties involved.
    - Audio files are deleted immediately after processing.
- [x] Backend written in **Go**
- [x] Frontend written with **Svelte** and **Tailwind CSS**.
- [x] Uses C++ whisper version from [whisper.cpp](https://github.com/ggerganov/whisper.cpp).
    - You don't need a GPU, uses CPU.
    - No need for complex installations.

## 🧭 Roadmap:

- [ ] Translate input audio transcription to english.
- [x] Allow to upload any file (video, audio) in any format and transcribe it.
	- [ ] Limit max file size for server hosting.
    - [x] Allow to cut audio to X seconds before transcription.
    - [x] Option to disable file uploads.
- [ ] Transcription history / save snippets
    - Publish to some **pastebin**-like service.

## 🧪 Test it!

A testing instance is available at: https://whisper.r3d.red

This instance is limited:
- Maximum of 10 seconds audio recordings 
- File uploads are disabled.

## Screenshots

<p align="center"><sub>*Logo generated with Stable Diffusion*</sub></p>

##### Main page
<img src="https://farside.link/rimgo/GFBHU8V.png" align=center>

##### Recording
<img src="https://farside.link/rimgo/M5pW2BB.png" align=center>

#### Transcription Options
<img src="https://farside.link/rimgo/a4yf4hu.png" align=center>

#### Processing
<img src="https://farside.link/rimgo/SHOTbh8.png" align=center>

#### Result
<img src="https://farside.link/rimgo/8EodxT9.png" align=center>