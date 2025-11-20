APP_NAME ?= space-invaders
PORT ?= 8080

.PHONY: run build fmt test clean fly-deploy docker-build docker-run

run:
	@echo "Starting $(APP_NAME) on port $(PORT)..."
	PORT=$(PORT) go run .

docker-run:
	docker run --rm -p $(PORT):8080 -e PORT=8080 $(APP_NAME):latest
