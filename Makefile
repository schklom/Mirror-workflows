.PHONY: clean server server-ctl web run update-swagger-ui

.DEFAULT_GOAL := server

SWAGGER_UI_VERSION = 5.32.15
BINARY = fmd-server
CTL_BINARY = fmd-server-ctl

server: web
	go build -o $(BINARY)

clean:
	rm -f $(BINARY)
	go clean -cache
	rm -rf web/dist/
	cd web && pnpm clean

web:
	cd web && pnpm run build

run: server
	./$(BINARY) serve

update-swagger-ui:
	curl -L "https://github.com/swagger-api/swagger-ui/archive/refs/tags/v$(SWAGGER_UI_VERSION).tar.gz" | tar xz --strip-components=2 -C backend/swagger-ui "swagger-ui-$(SWAGGER_UI_VERSION)/dist"
	echo "\033[0;31m!!!!!!!!!\n[WARNING] Keep the custom openapi.yaml path in swagger-initializer.js!\n!!!!!!!!!"

server-ctl:
	go -C ctl build -o $(CTL_BINARY)
	mv ctl/$(CTL_BINARY) .