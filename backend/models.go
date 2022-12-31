package main

type Response struct {
	Result  string `json:"result"`
	Id      string `json:"id"`
	Message string `json:"message"`
}

type InstanceInfo struct {
	Version    string `json:"version"`
	CommitHash string `json:"commit_hash"`
}
