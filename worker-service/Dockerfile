FROM golang:1.24-alpine AS builder
RUN apk update && apk add openssh-client gcc g++ musl-dev git
WORKDIR /app
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/root/go/pkg/mod go mod download
COPY . ./
RUN --mount=type=cache,target=/root/.cache/go-build go build -ldflags "-s -w" -trimpath -o outbox cmd/outbox/*.go
RUN --mount=type=cache,target=/root/.cache/go-build go build -ldflags "-s -w" -trimpath -o crawl cmd/crawl/*.go
RUN --mount=type=cache,target=/root/.cache/go-build go build -ldflags "-s -w" -trimpath -o summarize cmd/summarize/*.go

FROM alpine:latest
RUN apk add ca-certificates multirun
WORKDIR /app
COPY --from=builder /app/outbox ./
COPY --from=builder /app/crawl ./
COPY --from=builder /app/summarize ./

EXPOSE 8087 50083
CMD ["multirun", "./outbox", "./crawl", "./summarize"]
#CMD ["multirun", "./outbox"]
