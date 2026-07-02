#!/bin/bash

# Set default values
JOB=${1:-outbox}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}
DB_NAME=${DB_NAME:-cinema_db}
DB_SSLMODE=${DB_SSLMODE:-disable}

REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}
REDIS_PASSWORD=${REDIS_PASSWORD:-}
REDIS_DB=${REDIS_DB:-0}

OUTBOX_INTERVAL=${OUTBOX_INTERVAL:-5s}
CRAWL_INTERVAL=${CRAWL_INTERVAL:-1h}

export DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME DB_SSLMODE
export REDIS_HOST REDIS_PORT REDIS_PASSWORD REDIS_DB
export OUTBOX_INTERVAL CRAWL_INTERVAL

case $JOB in
  "outbox")
    echo "Starting outbox worker..."
    go run ./cmd/outbox
    ;;
  "crawl")
    echo "Starting crawl worker..."
    go run ./cmd/crawl
    ;;
  *)
    echo "Unknown job: $JOB"
    echo "Available jobs: outbox, crawl"
    exit 1
    ;;
esac
