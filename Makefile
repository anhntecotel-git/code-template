################################################################################
# ECOTEL Monorepo - Makefile
# Backend  : Spring Boot 4.0.6 (Java 21, Maven)
# Frontend : React 19 + Vite 8 (TypeScript, Tailwind)
# Infra    : Docker, Kubernetes, Nginx
################################################################################

# ---------- Configuration -----------------------------------------------------
SHELL            := /bin/bash
.DEFAULT_GOAL    := help
.ONESHELL:
.SHELLFLAGS      := -eu -o pipefail -c

# Project metadata
PROJECT_NAME     ?= ecotel
NAMESPACE        ?= ecotel
REGISTRY         ?= ecotel
VERSION          ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "latest")
ENVIRONMENT      ?= development

# Directories
ROOT_DIR         := $(shell pwd)
BACKEND_DIR      := apps/backend
FRONTEND_DIR     := apps/frontend
DOCKER_DIR       := infra/docker
K8S_DIR          := infra/k8s
NGINX_DIR        := infra/nginx
SCRIPTS_DIR      := infra/scripts

# Compose file
COMPOSE_FILE     ?= docker-compose.yml
COMPOSE          := docker compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME)

# Image names
BACKEND_IMAGE    := $(REGISTRY)/backend
FRONTEND_IMAGE   := $(REGISTRY)/frontend

# Colors
CYAN             := \033[36m
GREEN            := \033[32m
YELLOW           := \033[33m
RED              := \033[31m
RESET            := \033[0m

# ---------- Help --------------------------------------------------------------
.PHONY: help
help: ## Show this help message
	@printf "\n$(CYAN)ECOTEL Monorepo - Available targets$(RESET)\n\n"
	@printf "  $(YELLOW)Usage:$(RESET) make $(GREEN)<target>$(RESET) [VAR=value]\n\n"
	@awk 'BEGIN {FS = ":.*?## "} \
		/^[a-zA-Z0-9_-]+:.*?## / { \
			printf "  $(GREEN)%-26s$(RESET) %s\n", $$1, $$2 \
		} \
		/^##@/ { \
			printf "\n$(YELLOW)%s$(RESET)\n", substr($$0, 5) \
		}' $(MAKEFILE_LIST)
	@printf "\n  $(YELLOW)Variables:$(RESET)\n"
	@printf "    VERSION=$(VERSION)  ENV=$(ENVIRONMENT)  REGISTRY=$(REGISTRY)\n\n"

##@ Setup
.PHONY: init install install-backend install-frontend

init: ## Initialize project (chmod scripts, copy env files)
	@printf "$(CYAN)→ Initializing project...$(RESET)\n"
	@chmod +x $(SCRIPTS_DIR)/*.sh
	@chmod +x $(NGINX_DIR)/test-nginx.sh
	@test -f $(FRONTEND_DIR)/.env || cp $(FRONTEND_DIR)/.env.example $(FRONTEND_DIR)/.env
	@printf "$(GREEN)✓ Project initialized$(RESET)\n"

install: install-backend install-frontend ## Install all dependencies

install-backend: ## Install backend dependencies (Maven)
	@printf "$(CYAN)→ Resolving Maven dependencies...$(RESET)\n"
	@cd $(BACKEND_DIR) && ./mvnw dependency:go-offline -B

install-frontend: ## Install frontend dependencies (npm ci)
	@printf "$(CYAN)→ Installing npm packages...$(RESET)\n"
	@cd $(FRONTEND_DIR) && npm ci

##@ Local Development
.PHONY: dev backend frontend nginx-local

dev: ## Start full stack via docker compose (build + up)
	@$(COMPOSE) up --build

backend: ## Run backend locally with Maven (hot reload)
	@printf "$(CYAN)→ Starting Spring Boot backend on :8080$(RESET)\n"
	@cd $(BACKEND_DIR) && ./mvnw spring-boot:run

frontend: ## Run frontend locally with Vite (hot reload)
	@printf "$(CYAN)→ Starting Vite dev server on :5173$(RESET)\n"
	@cd $(FRONTEND_DIR) && npm run dev

nginx-local: ## Test local nginx configuration
	@printf "$(CYAN)→ Testing nginx configuration...$(RESET)\n"
	@bash $(NGINX_DIR)/test-nginx.sh

##@ Build
.PHONY: build build-backend build-frontend

build: build-backend build-frontend ## Build backend JAR and frontend bundle

build-backend: ## Build backend JAR (skipTests)
	@printf "$(CYAN)→ Building backend JAR...$(RESET)\n"
	@cd $(BACKEND_DIR) && ./mvnw clean package -DskipTests -q
	@printf "$(GREEN)✓ JAR built: $(BACKEND_DIR)/target/$(RESET)\n"

build-frontend: ## Build frontend production bundle
	@printf "$(CYAN)→ Building frontend bundle...$(RESET)\n"
	@cd $(FRONTEND_DIR) && npm run build
	@printf "$(GREEN)✓ Bundle built: $(FRONTEND_DIR)/dist/$(RESET)\n"

##@ Quality
.PHONY: test test-backend test-frontend lint lint-frontend format

test: test-backend test-frontend ## Run all tests

test-backend: ## Run backend tests (Maven)
	@printf "$(CYAN)→ Running backend tests...$(RESET)\n"
	@cd $(BACKEND_DIR) && ./mvnw test

test-frontend: ## Run frontend tests
	@printf "$(CYAN)→ Running frontend tests...$(RESET)\n"
	@cd $(FRONTEND_DIR) && npm test --if-present

lint: lint-frontend ## Lint all code

lint-frontend: ## Lint frontend (ESLint)
	@printf "$(CYAN)→ Linting frontend...$(RESET)\n"
	@cd $(FRONTEND_DIR) && npm run lint

format: ## Format frontend code
	@cd $(FRONTEND_DIR) && npx prettier --write "src/**/*.{ts,tsx,js,jsx,css}" 2>/dev/null || true

##@ Docker
.PHONY: docker-build docker-build-backend docker-build-frontend \
        docker-push docker-up docker-down docker-restart \
        docker-logs docker-ps docker-clean docker-prune

docker-build: docker-build-backend docker-build-frontend ## Build all Docker images

docker-build-backend: ## Build backend Docker image
	@printf "$(CYAN)→ Building $(BACKEND_IMAGE):$(VERSION)$(RESET)\n"
	@docker build \
		-f $(DOCKER_DIR)/backend.Dockerfile \
		-t $(BACKEND_IMAGE):$(VERSION) \
		-t $(BACKEND_IMAGE):latest \
		.

docker-build-frontend: ## Build frontend Docker image
	@printf "$(CYAN)→ Building $(FRONTEND_IMAGE):$(VERSION)$(RESET)\n"
	@docker build \
		-f $(DOCKER_DIR)/frontend.Dockerfile \
		-t $(FRONTEND_IMAGE):$(VERSION) \
		-t $(FRONTEND_IMAGE):latest \
		.

docker-push: ## Push images to registry
	@printf "$(CYAN)→ Pushing images to $(REGISTRY)...$(RESET)\n"
	@docker push $(BACKEND_IMAGE):$(VERSION)
	@docker push $(BACKEND_IMAGE):latest
	@docker push $(FRONTEND_IMAGE):$(VERSION)
	@docker push $(FRONTEND_IMAGE):latest

docker-up: ## Start stack via docker compose (detached)
	@$(COMPOSE) up -d --build

docker-down: ## Stop and remove docker compose stack
	@$(COMPOSE) down

docker-restart: ## Restart docker compose stack
	@$(COMPOSE) restart

docker-logs: ## Follow logs (usage: make docker-logs [SERVICE=backend])
	@$(COMPOSE) logs -f $(SERVICE)

docker-ps: ## List running containers
	@$(COMPOSE) ps

docker-clean: ## Remove containers, volumes, and networks
	@printf "$(YELLOW)⚠ Removing containers, volumes, networks...$(RESET)\n"
	@$(COMPOSE) down -v --remove-orphans

docker-prune: ## Prune dangling images and build cache
	@docker image prune -f
	@docker builder prune -f

##@ Kubernetes
.PHONY: k8s-deploy k8s-apply k8s-delete k8s-status k8s-pods \
        k8s-logs-backend k8s-logs-frontend k8s-rollout k8s-rollback \
        k8s-port-forward-backend k8s-port-forward-frontend k8s-shell-backend

k8s-deploy: ## Full deploy via deploy.sh (usage: make k8s-deploy ENV=staging VERSION=v1.0.0)
	@bash $(SCRIPTS_DIR)/deploy.sh $(ENVIRONMENT) $(VERSION)

k8s-apply: ## Apply all Kubernetes manifests
	@printf "$(CYAN)→ Applying Kubernetes manifests to namespace '$(NAMESPACE)'...$(RESET)\n"
	@kubectl apply -f $(K8S_DIR)/namespace.yaml
	@kubectl apply -f $(K8S_DIR)/secret.yaml
	@kubectl apply -f $(K8S_DIR)/configmap.yaml
	@kubectl apply -f $(K8S_DIR)/service.yaml
	@kubectl apply -f $(K8S_DIR)/backend-deployment.yaml
	@kubectl apply -f $(K8S_DIR)/frontend-deployment.yaml
	@kubectl apply -f $(K8S_DIR)/ingress.yaml
	@printf "$(GREEN)✓ Manifests applied$(RESET)\n"

k8s-delete: ## Delete all Kubernetes resources in namespace
	@printf "$(YELLOW)⚠ Deleting all resources in '$(NAMESPACE)'...$(RESET)\n"
	@kubectl delete -f $(K8S_DIR)/ingress.yaml --ignore-not-found
	@kubectl delete -f $(K8S_DIR)/frontend-deployment.yaml --ignore-not-found
	@kubectl delete -f $(K8S_DIR)/backend-deployment.yaml --ignore-not-found
	@kubectl delete -f $(K8S_DIR)/service.yaml --ignore-not-found
	@kubectl delete -f $(K8S_DIR)/configmap.yaml --ignore-not-found
	@kubectl delete -f $(K8S_DIR)/secret.yaml --ignore-not-found

k8s-status: ## Show all resources in namespace
	@kubectl get all -n $(NAMESPACE) -o wide
	@printf "\n"
	@kubectl get ingress -n $(NAMESPACE)

k8s-pods: ## List pods with wide output
	@kubectl get pods -n $(NAMESPACE) -o wide

k8s-logs-backend: ## Tail backend logs
	@kubectl logs -n $(NAMESPACE) -f deployment/backend

k8s-logs-frontend: ## Tail frontend logs
	@kubectl logs -n $(NAMESPACE) -f deployment/frontend

k8s-rollout: ## Watch rollout status
	@kubectl rollout status deployment/backend -n $(NAMESPACE)
	@kubectl rollout status deployment/frontend -n $(NAMESPACE)

k8s-rollback: ## Rollback deployments to previous revision
	@printf "$(YELLOW)⚠ Rolling back deployments...$(RESET)\n"
	@kubectl rollout undo deployment/backend -n $(NAMESPACE)
	@kubectl rollout undo deployment/frontend -n $(NAMESPACE)

k8s-port-forward-backend: ## Forward backend :8080 to localhost
	@kubectl port-forward -n $(NAMESPACE) svc/backend 8080:8080

k8s-port-forward-frontend: ## Forward frontend :80 to localhost:8081
	@kubectl port-forward -n $(NAMESPACE) svc/frontend 8081:80

k8s-shell-backend: ## Open a shell inside the backend pod
	@kubectl exec -it -n $(NAMESPACE) deployment/backend -- /bin/sh

##@ Operations
.PHONY: deploy backup start health

deploy: ## Run deploy.sh wrapper (ENV=production VERSION=v1.0.0)
	@bash $(SCRIPTS_DIR)/deploy.sh $(ENVIRONMENT) $(VERSION)

backup: ## Run backup.sh wrapper
	@bash $(SCRIPTS_DIR)/backup.sh

start: ## Run start.sh local launcher
	@bash $(SCRIPTS_DIR)/start.sh

health: ## Quick health probe of running services
	@printf "$(CYAN)→ Backend: $(RESET)"
	@curl -fsS http://localhost:8080/actuator/health || printf "$(RED)down$(RESET)\n"
	@printf "$(CYAN)→ Frontend:$(RESET) "
	@curl -fsS -o /dev/null -w "%{http_code}\n" http://localhost:80/ || printf "$(RED)down$(RESET)\n"

##@ Cleanup
.PHONY: clean clean-backend clean-frontend clean-all

clean: clean-backend clean-frontend ## Clean build artifacts

clean-backend: ## Clean backend target directory
	@cd $(BACKEND_DIR) && ./mvnw clean -q

clean-frontend: ## Clean frontend build & cache
	@rm -rf $(FRONTEND_DIR)/dist $(FRONTEND_DIR)/.vite $(FRONTEND_DIR)/node_modules/.vite

clean-all: clean docker-clean ## Remove builds, containers, volumes
	@rm -rf $(FRONTEND_DIR)/node_modules
	@printf "$(GREEN)✓ Workspace cleaned$(RESET)\n"

##@ Info
.PHONY: version env-check

version: ## Show version info
	@printf "Project : $(PROJECT_NAME)\n"
	@printf "Version : $(VERSION)\n"
	@printf "Env     : $(ENVIRONMENT)\n"
	@printf "Registry: $(REGISTRY)\n"
	@printf "Namespace: $(NAMESPACE)\n"

env-check: ## Verify required tools are installed
	@for tool in docker kubectl java node npm mvn; do \
		if command -v $$tool >/dev/null 2>&1; then \
			printf "$(GREEN)✓$(RESET) %-10s %s\n" "$$tool" "$$(command -v $$tool)"; \
		else \
			printf "$(RED)✗$(RESET) %-10s not found\n" "$$tool"; \
		fi; \
	done
