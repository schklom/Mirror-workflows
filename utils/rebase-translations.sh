#!/bin/sh
TEMPLATE=messages.pot

xgettext -kT_sprintf -kT_nsprintf:1,2 -k_ngettext:1,2 -kT_ngettext:1,2 -k__ \
	-L PHP -o $TEMPLATE *.php `find classes plugins include -iname '*.php' -type f -not -path '*/vendor/*'`

xgettext --from-code utf-8 -k__ -kNotify.info -kNotify.error -kNotify.progress \
	-kngettext:1,2 -L Java -j -o $TEMPLATE `find js plugins -iname '*.js' -type f -not -path '*/vendor/*'`

xgettext --from-code utf-8 -k__ -kNotify.info -kNotify.error -kNotify.progress \
	-kngettext:1,2 -L JavaScript -j -o $TEMPLATE `find js plugins -iname '*.js' -type f -not -path '*/vendor/*'`

# leave weblate to deal with .po/.mo files
exit 0

update_lang() {
	if [ -f $1.po ]; then
		msgmerge --no-wrap --width 1 -U $1.po $TEMPLATE
		msgfmt --statistics $1.po -o $1.mo
	else
		echo "Usage: $0 [-p|<basename>]"
	fi
}

compile_po() {
	msgfmt --statistics $1.po -o $1.mo
}

LANGS=`find locale -name 'messages.po'`

for lang in $LANGS; do
	echo Updating $lang...
	PO_BASENAME=`echo $lang | sed s/.po//`
	compile_po $PO_BASENAME
done
