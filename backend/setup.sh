#!/bin/bash

git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
bash ./models/download-ggml-model.sh small
# build the main example
make small