FROM golang:1.24-alpine AS builder
RUN apk update && apk add openssh-client gcc g++ musl-dev git
WORKDIR /app
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/root/go/pkg/mod go mod download
COPY . ./
# Build API server
RUN --mount=type=cache,target=/root/.cache/go-build go build -ldflags "-s -w" -trimpath -o api ./cmd/api/*.go

FROM alpine:latest
RUN apk add ca-certificates multirun
WORKDIR /app
COPY --from=builder /app/. ./

EXPOSE 8086
CMD ["multirun", "./api serve"]