# Benchmarking

This document describes how to use Locust to load test FMD Server.

## Preparation

1. Install python and pip.
1. Install locust via pip: `pip install -r requirements.txt`
1. Run the locustfile by calling `python -m locust` inside the benchmarking directory.
1. You will receive a URL with which you can specify how many concurrent users should be started.

## Load Testing Setup

The current setup spawns multiple users with the following behavior:

1. Register a new account
1. Randomly selects one of four tasks with equal probability
    - Post a new location
    - Post a new picture
    - Get all locations
    - Get all pictures
1. Repeat step 2

### Data

The current data is randomly generated or uses some placeholder values.
