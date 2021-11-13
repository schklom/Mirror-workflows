#!/bin/sh

TMPFILE=$(mktemp)

grep 'hook_.*(' ../classes/pluginhost.php | sed -e 's#[\t ]*/[* ]*##' \
		-e 's# [*]/$##' \
		-e 's# *(byref) *##' \
		-e 's#GLOBAL: ##' | while read F; do

	cat << EOF >> $TMPFILE 
	function $F {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

EOF
done

cat ../classes/plugin.tpl | while IFS=\n read L; do
	case $L in
		*AUTO_GENERATED_HOOKS_GO_HERE* )
			echo "\t/* plugin hook methods (auto-generated) */\n"
			cat $TMPFILE
			;;
		* )
			echo "$L"
			;;
	esac
done > ../classes/plugin.php

rm -f -- $TMPFILE
