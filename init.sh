#!/bin/bash

function initBackend() {
    echo "Preparing backend"
    mkdir backend
    cd backend
    touch main.go
    read -p "Enter go mod name: " goMod
    go mod init $goMod
    go get -u github.com/go-chi/chi/v5
    go get -u github.com/rs/cors

    mv ./templates/main.go.tmpl backend/main.go
    mv ./templates/routes.go.tmpl backend/routes.go
}

function initFrontend () {
    echo "Preparing frontend"
    corepack enable
    read -p "Enter frontend project name: " feName

    echo $feName | yarn create vite --template svelte
    mv $feName frontend
    cd frontend
    yarn add -d tailwindcss postcss autoprefixer @tailwindcss/forms && yarn && cd ..

    sleep 5 && printf "\n ℹ️ Start development server with `yarn dev` inside frontend folder.\n"
}

read -p "Init backend? [Y/n]: " ib
if [ "$ife" = "Y" ] || [ "$ib" = "y" ] || [ "$ib" = "yes" ] || [ "$ib" = "Yes" ] || [ "$ib" = "YES" ]; then
    echo "Preparing backend"
    initBackend
fi

read -p "Init frontend? [Y/n]: " ife
if [ "$ife" = "Y" ] || [ "$ife" = "y" ] || [ "$ife" = "yes" ] || [ "$ife" = "Yes" ] || [ "$ife" = "YES" ]; then
    echo "Preparing frontend"
    initFrontend
fi