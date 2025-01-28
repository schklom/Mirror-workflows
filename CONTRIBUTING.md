# Contributing to FMD Server

## Code Style

Logging:

- Log security-relevant events (e.g., password changes).
- Use log level "ERROR" for application errors/potential bugs.
  These are issues that the server operator should be aware of.
- Use log level "WARNING" -- among other things -- for user errors (e.g., invalid inputs).
  First, because these are user-facing anyway.
  Second, because they are less relevant to the server operator (since it is not something that they can fix).

