# Third-party notices

openGym — Copyright (C) 2026 Duarte Santos.
openGym's own code is licensed under the **GNU AGPL v3.0** (see [LICENSE](LICENSE)).

## App store exception

As an additional permission under section 7 of the AGPL v3.0, the copyright holder permits
distribution of the openGym mobile application through app store platforms (such as the
Apple App Store and Google Play) whose terms of service would otherwise be incompatible
with the AGPL, provided the corresponding source code remains available under the AGPL at
the project repository. This permission applies to the distribution channel only and does
not otherwise limit the license.

## Body diagram geometry

The muscle outlines the body maps are drawn from (`frontend/src/lib/body-paths.js`) are derived
from [**MuscleMap**](https://github.com/melihcolpan/MuscleMap) by Melih Colpan, used under the
**MIT License** and reproduced below. MuscleMap ships its path data as Swift source rather than
`.svg` files; the paths were converted to a JSON module, its sub-group shapes were dropped, and
nothing else about the artwork was changed.

```
MIT License

Copyright (c) 2026 Melih Colpan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Exercise data & media

Both come from [**hasaneyldrm/exercises-dataset**](https://github.com/hasaneyldrm/exercises-dataset),
and that dataset licenses them differently. Neither is covered by openGym's AGPL license.

### Metadata & instruction text — MIT

The exercise names, attributes and instructions (English in `frontend/src/lib/exercises-data.js`,
other languages in `frontend/src/instr/`, regenerated via `scripts/build-instructions.mjs`) are
MIT-licensed, reproduced below.

```
MIT License

Copyright (c) 2026 Hasan Emir Yıldırım

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation and data files (the "Software"),
to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Images & animations — © Gym visual, not MIT and not AGPL

> **© Gym visual — https://gymvisual.com/**

The exercise thumbnails (180×180) and animations are **© [Gym visual](https://gymvisual.com/)**.
They are in the upstream dataset with the rights holder's written permission, granted to that
dataset; that permission is **not transferable**. Their use is governed by Gym visual's
[Terms & Conditions](https://gymvisual.com/content/3-terms-and-conditions-of-use) — not by the MIT
license above, and not by openGym's AGPL.

**openGym does not redistribute this media.** It is not in this repository, not in its history,
and not in the published Docker images or the Android APK. A self-hosted instance downloads it
from the upstream source on first `docker compose up`; the mobile and demo builds load it from a
CDN at runtime.

If you want to reuse the media — in openGym or anywhere else, commercially or not — **obtain your
own license from Gym visual first**, and keep the `© Gym visual — https://gymvisual.com/`
attribution intact wherever it appears.
