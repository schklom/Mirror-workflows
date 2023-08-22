<a name="readme-top"></a>

<br />
<div align="center">
  <h3 align="center">Proxigram</h3>

  <p align="center">
    A privacy focused and open source alternative front-end for Instagram
    <br/>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
       <li><a href="#why">Why?</a></li>
       <li><a href="#screenshots">Screenshots</a></li>
       <li><a href="#features">Features</a></li>
      </ul>
    </li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#resources">Resources</a></li>
    <li><a href="#installation">Installation</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#legal-notice">Legal notice</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->

## About The Project

Proxigram: A privacy focused and and open source front-end for Instagram.
Inspired by [ProxiTox](https://github.com/pablouser1/ProxiTok), [Nitter](https://github.com/zedeus/nitter/), [LibreMdb](https://codeberg.org/zyachel/libremdb), and [many others](https://github.com/digitalblossom/alternative-frontends)


### Why?

We all know the record of bad practices that Meta has done against user's privacy. Regardless of that, Instagram still is one of the largest social media in the world. This makes it imposible to not have to check Instagram sometimes, but it can be hard to use Instagram when the website is filled with sign-up banners everywhere, is tracking all your activity and wants you to install the official app. This is where Proxigram comes in.

There are other Instagram viewers out there, but some of them can be a little tricky to use since most of them have ads, need JavaScript or are full of captchas and trackers. Proxigram does the job for you and goes to these services, parses the data, and gives it back to you.

Using an instance of Proxigram, you can browse Instagram without JavaScript while retaining your privacy with all the requests going through the server. The client never talks to Instagram or other service providers (unless it is specified).

### Screenshots

![instagram profile in proxigram](/public/screenshot.png)

### Features

- See user profile and feed
- See individual post
- See tags
- RSS feeds
  - ```/{username}/rss```
- API
  - ```/api/{username}``` -> profile info
  - ```/api/{username}/posts``` -> profile feed
    - query:
      - cursor
  - ```/api/p/{shortcode}``` -> post
  - ```/api/p/{shortcode}/comments``` -> post's comments
  - ```/api/tag/{tag}``` -> tag posts

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->

## Roadmap

- [ ] Add stories
- [ ] Add highlights
- [X] Add rss feed
- [ ] Add settings
  - [ ] Enable or disable proxy
  - [ ] Infinity scroll
  - [ ] Redirect URLs
  - [ ] Choose providers
  - [ ] Healthiness of providers 

See the [open issues](https://codeberg.org/ThePenguinDev/Proxigram/issues) for a full list of proposed features and known issues.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Resources

-  [Wiki page of public instances](https://codeberg.org/ThePenguinDev/Proxigram/wiki/Instances)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- Installation -->

## Installation
As Proxigram is made with Next.js, you can deploy it anywhere where Next.js is supported. Below are a few other methods:

### Manual
1. Install Node.js ([Node.js website](https://nodejs.org))
2. Install git ([Git website](https://git-scm.com))
3. Install redis ([Redis website](https://redis.io))
4. Clone and setup the project
```bash
# Clone the repository.
git clone https://codeberg.org/ThePenguinDev/proxigram.git

# Move to the folder.
cd proxigram

# Change the configuration to your needs.
cp .env.local.example .env.local

# Replace 'pnpm' with yarn or npm if you use those.
# If headless providers are enabled, you need to install the browser.
# Use one of these commands to install the browser binary:
# pnpm install playwright-chromium@1.34.3
# npm install playwright-chromium@1.34.3
# yarn install playwright-chromium@1.34.3

pnpm install
pnpm build

# Start redis server.
# If "CACHE" is set to false, it is not necessary. Check .env.local
redis-server (or docker)

pnpm start
```

### Docker

Not at the moment

<!-- LICENSE -->

<p align="right">(<a href="#readme-top">back to top</a>)</p>


## License

Distributed under the AGPLv3 License. See `LICENSE` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Legal Notice

Proxigram does not host any content. All content shown on any Proxigram instances is from Instagram. Any issue with the content shown on any instance of Proxigram, needs to be reported to Instagram, not the maintainer's ISP or domain provider. Proxigram is not affiliated with Meta Platforms, Inc.
