#!/bin/bash

# make sure all git repositories are safe
git config --global --add safe.directory .

bundle exec /app/bin/repolinter.js "$@"
