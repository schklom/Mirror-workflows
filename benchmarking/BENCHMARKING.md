# Benchmarking

This document describes how to use Locust to load test FMD Server.

## Preparation

1. Install python and pip.
1. Create a virtual environment: `python3 -m venv venv`
1. Enter the venv: `source venv/bin/activate` (to exit, run `deactivate`)
1. Install locust via pip: `pip3 install -r requirements.txt`

## Running a test

1. Run the locustfile by calling `python3 -m locust` inside the benchmarking directory.
1. You will receive a URL. Open it in the browser and start the load test from the GUI.
1. As the host, enter the base URL to your FMD Server instance

> [!WARNING]
> Do **not** run this against productive instances.
> It will impact real users, and it will spam the database.

## Load Testing Setup

The current setup spawns multiple users with the following behavior:

1. Register a new account
1. Randomly selects one of four tasks with equal probability
    - Post a new location
    - Post a new picture
    - Get all locations
    - Get all pictures
1. Repeat
