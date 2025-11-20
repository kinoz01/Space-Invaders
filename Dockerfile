# syntax=docker/dockerfile:1

FROM golang:1.22 AS builder
WORKDIR /app

# Cache go modules first
COPY go.mod ./
RUN go mod download

# Copy the rest of the source
COPY . .

# Build statically linked binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o space-invaders .

FROM gcr.io/distroless/base-debian12:latest
WORKDIR /app

# Copy static assets
COPY --from=builder /app/index.html .
COPY --from=builder /app/style.css .
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/server ./server

# Copy binary last
COPY --from=builder /app/space-invaders /space-invaders

ENV PORT=8080
EXPOSE 8080

CMD ["/space-invaders"]
