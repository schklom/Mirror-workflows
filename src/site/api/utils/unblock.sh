# Good on you for looking at shell scripts before blindly running them.
# This script contacts Instagram to get the profile's user ID, then sends the ID to Bibliogram. Bibliogram can take over from there.

# Make a temporary directory
tempdir=$(mktemp -d) || exit 1

# Try to request from Instagram
curl 'https://www.instagram.com/<username>/' -Ss > $tempdir/page.html

if test -s $tempdir/page.html; then
	# Request returned a page (file not empty)
	grep -oE '"id":"[0-9]+"' $tempdir/page.html | head -n 1 | grep -oE '[0-9]+' | curl --data-urlencode 'username=<username>' --data-urlencode 'user_id@-' '<website_origin>/api/suggest_user/v1?plaintext=1'
else
	# Request was a redirect
	echo "Your network is blocked by Instagram."
	echo "You won't be able to unblock any more profiles."
	echo "To be unblocked, wait a few hours without running this script."
fi

# Clean up, safely.
rm -f $tempdir/page.html
rm -d $tempdir
