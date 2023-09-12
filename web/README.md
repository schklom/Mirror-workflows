# Web Readme

Most dependencies are bundled with npm.
Simply run `npm install` from the `web/` directory.

`crypto-js` needs to be bundled manually because npm only contains the
sources, and no compiled release.
`jsencrypt` is bundled manually because the npm package contains crazy many dependencies that we don't need.
They have been downloaded from:

- https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.0.0/crypto-js.js
- https://cdnjs.cloudflare.com/ajax/libs/jsencrypt/2.3.1/jsencrypt.min.js

Note that `crypto-js` and `jsencrypt` can be removed once support for
the pre-0.4.0 crypto is dropped.
