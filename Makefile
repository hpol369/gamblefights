# GambleFights Makefile

.PHONY: dev-web dev-server dev install

install:
	cd web && npm install
	cd server && go mod tidy

dev-web:
	cd web && npm run dev

dev-server:
	cd server && go run main.go

dev:
	@echo "Run 'make dev-web' and 'make dev-server' in separate terminals."

fmt:
	cd server && go fmt ./...
	cd web && npm run lint
