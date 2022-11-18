# 🎤 Web Whisper 📝

Get OpenAI's [Whipser]() right into your browser!

This is a Web-UI for the AI whisper. 

## ✨ Features:

- Backend written in **Go**
- Frontend written with **Svelte** and **Tailwind CSS**.
- Whisper from [whisper.cpp](https://github.com/ggerganov/whisper.cpp).
    - You don't need a GPU, uses CPU.
    - No need for complex installations.
- Record and transcribe audio right from your browser.
- Lightweight and beautiful UI.
- Self-hosted. No 3rd parties.

## 🧭 Roadmap:

- [ ] Docker compose for easy self-hosting
- [ ] Upload any files (video, audio...)
- [ ] Download `.srt` subtitle files
- [ ] Get a history of your transcriptions

## 🪺 Self-hosting

### Docker-compose (coming soon)

### Manual

This is a small guide on how to self-host this project.

It is built of two parts; the `backend` and the `frontend`. Both need to be running at the same time so you can make use of it.

First step is to clone this repository:

`git clone https://codeberg.org/pluja/web-whisper`

And enter the directory:

`cd web-whisper`

#### Running the backend

You will need `go` (Golang) installed on your computer.

- Now head to the `backend` directory: `cd backend`
- Simply run `go mod download` to get all de dependencies.
- Setup the `whipser.cpp` dependency: `bash setup.sh`
    - You can edit the `setup.sh` to download a better model other than the `small` if you want ([See this link](https://github.com/ggerganov/whisper.cpp#more-audio-samples))
- Run the backend `go run .`
    - The backend starts at `localhost:9090`; you can edit the `main.go` file to change the default port.

#### Running the frontend

You will need `npm` and `yarn` to run the frontend.

- Head to the `frontend` folder: `cd frontend`
- Run `npm i`
- Run `yarn`
- Run the frontend with `yarn dev`
    - The frontend will be available at the address in the console output.

## Screenshots

##### Main page
![](misc/MainPage.png)

##### Recording
![](misc/Recording.png)

##### Result
![](misc/Transcribed.png)