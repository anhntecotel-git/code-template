dev:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

backend:
	cd apps/backend && ./mvnw spring-boot:run

frontend:
	cd apps/frontend && npm run dev