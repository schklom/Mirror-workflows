<p align="center"> <b> 🎶 Convert any audio to text 📝 </b></p>

<p align="center"> <a href="https://codeberg.org/pluja/web-whisper/releases"> Changelog </a> · <a href="https://codeberg.org/pluja/web-whisper/wiki/Self-Hosting">Setup</a> · <a href="https://whisper.r3d.red">Demo</a></p>

<br>

<p align="center"> A light user interface for OpenAI's <a href="https://github.com/openai/whisper">Whisper</a> right into your browser! </p>

## WEB WHISPER

- [WEB WHISPER](#web-whisper)
- [✨ Features:](#-features)
- [🧭 Roadmap:](#-roadmap)
- [🧪 Test it!](#-test-it)
- [Screenshots](#screenshots)
      - [Main page](#main-page)
      - [Recording](#recording)
    - [Transcription Options](#transcription-options)
    - [Processing](#processing)
    - [Result](#result)
- [Other information](#other-information)
    - [How fast is this?](#how-fast-is-this)
    - [What is the difference between models?](#what-is-the-difference-between-models)
    - [How accurate is this?](#how-accurate-is-this)
- [Similar projects](#similar-projects)

## ✨ Features:

- [x] Record and transcribe audio right from your browser.
- [x] Upload any media file (video, audio) in any format and transcribe it.
    - [x] Option to cut audio to X seconds before transcription.
    - [x] Option to disable file uploads.
- [x] Enter a video URL to transcribe it to text (uses yt-dlp for getting video).
- [x] Select input audio language.
  - [x] Auto-detect input audio language.
- [x] Option to speed up audio by 2x for faster results (this has negative impact on accuracy).
- [x] Translate input audio transcription to english.
- [x] Download `.srt` subtitle file generated from audio.
- [x] Option to enable transcription history.
- [x] Configure whisper
    - [x] Choose the Whisper model you want to use (tiny, base, small...)
    - [x] Configure the number of **threads** and **processors** to use.
- [x] **Docker compose** for easy self-hosting
- [x] **Privacy respecting**: 
    - All happens locally. No third parties involved.
    - Option to delete all files immediately after processing.
    - Option keep files for later use / download.
- [x] Uses C++ whisper version from [whisper.cpp](https://github.com/ggerganov/whisper.cpp).
    - You don't need a GPU, uses CPU.
    - No need for complex installations.
- [x] Backend written in **Go**
- [x] Lightweight and beautiful UI.
    - [x] Frontend written with **Svelte** and **Tailwind CSS**.

## 🧭 Roadmap:

- [] ...

## 🧪 Test it!

You can easily [**self host**](https://codeberg.org/pluja/web-whisper/wiki/Self-Hosting) your own instance with docker (locally or in a server).

Also, I have made testing instance available at: https://whisper.r3d.red

Note that this instance is limited:
- Maximum of 10 seconds audio recordings 
- File uploads are disabled.
- Uses the `base` model.

## Screenshots

<p align="center"><sub>*Logo generated with Stable Diffusion*</sub></p>

##### Main page
<img width="850" src="https://farside.link/rimgo/C7kGNif.png" align=center>

#### Video options
<img width="850" src="https://farside.link/rimgo/JjXVbt4.png" align=center>

##### Recording
<img width="850" src="https://farside.link/rimgo/M5pW2BB.png" align=center>

#### Transcription Options
<img width="850" src="https://farside.link/rimgo/VLP4KQo.png" align=center>

#### Processing
<img width="850" src="https://farside.link/rimgo/SHOTbh8.png" align=center>

#### Result
<img width="850" src="https://farside.link/rimgo/8EodxT9.png" align=center>
<p align=center>*old version screenshot</p>

## Other information

#### How fast is this?

Whisper.cpp usually provides faster results than the python implementation. Although it will highly depend on your machine resources, the length of the media source and the file size. Here is a little benchmark:

| Processor | RAM | Threads | Processors | Length | Size | Elapsed time |
|---|---|---|---|---|---|---|
| i7 | 16 | 4 | 1 | 30m | 7MB | 7m 38s |
| i7 | 16 | 8 | 1 | 30s | < 1MB | 5s |

#### What is the difference between models?

There are several models, which differ by size. The size difference is related to having more or less parameters. The more parameters the better it can "understand" what it is listening to (less errors). With smaller models, more errors will occur (i.e. confusing words).

Also note that when using bigger models, the transcription time and the memory usage will increase:


| Model  | Disk   | Mem (since v1.6.1)     |
| ---    | ---    | ---     |
| tiny   |  75 MB | ~125 MB |
| base   | 142 MB | ~210 MB |
| small  | 466 MB | ~600 MB |
| medium | 1.5 GB | ~1.7 GB |
| large  | 2.9 GB | ~3.3 GB |

> Table from [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) repo.

#### How accurate is this?

Not all languages provide the same accuracy when using Whisper. Please, take a look at the following graphic to see the Languages and their related WER (Word Error Ratio). The smaller the WER, the better the model will understand the language.

<p align=center><img src="https://github.com/openai/whisper/raw/main/language-breakdown.svg" width=550></p>

> Image from original [Whisper](https://github.com/openai/whisper) repo.



## Similar projects

- [Whisper WASM](https://github.com/ggerganov/whisper.cpp/tree/master/examples/whisper.wasm) - If you want to run Whisper directly in your browser without the need of a server, you can use this project. Note that performance for this version is not very good.