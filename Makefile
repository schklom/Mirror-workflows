.PHONY: update-swagger-ui

SWAGGER_UI_VERSION = 5.32.15

update-swagger-ui:
	curl -L "https://github.com/swagger-api/swagger-ui/archive/refs/tags/v$(SWAGGER_UI_VERSION).tar.gz" | tar xz --strip-components=2 -C backend/swagger-ui "swagger-ui-$(SWAGGER_UI_VERSION)/dist"
	echo "\033[0;31m!!!!!!!!!\n[WARNING] Keep the custom openapi.yaml path in swagger-initializer.js!\n!!!!!!!!!"
