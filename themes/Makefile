.PHONY: clean

ALL: compact.css compact_night.css light.css night_blue.css night.css

%.css: %.less light/*.less
	lessc --source-map=$(patsubst %.less,%.css.map,${<}) ${<} ${@}

clean:
	rm -f *.css *.css.map
