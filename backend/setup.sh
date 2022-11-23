#!/bin/bash

source .env
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
bash ./models/download-ggml-$WHISPER_MODEL.sh small
# build the main example
make $WHISPER_MODEL