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
    <li><a href="#installation">Installation</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#legal-notice">Legal notice</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->

## About The Project

Proxigram, a free and open source alternative Instagram front-end focused on privacy.
Inspired by [ProxiTox](https://github.com/pablouser1/ProxiTok), [Nitter](https://github.com/zedeus/nitter/), [LibreMdb](https://github.com/zyachel/libremdb), and [many others](https://github.com/digitalblossom/alternative-frontends)


### Why?

We all know the record of bad pactices that Meta has done against user's privacy. Regatherless of that, Instagram still being one of the largest social media in the world, this makes it imposible to not have to check Instagram sometimes. But it can be hard to use Instagram when the website is filled with sign up banners everywhere. This is where Proxigram comes in.

There are others Instagram viewers out there, but some of them can be a little tricky to use since most of them have ads, needs JavaScript or are full of captchas and trackers. Proxigram does the job for you and goes to these services  parse the data, and gives it back to you.

Using an instance of Proxigram, you can browse Instagram without JavaScript while retaining your privacy with all the requests going through the server, client never talks to Instagram and other services providers.

### Screenshots

![instagram profile in proxigram](/public/screenshot.png)

### Features

- See user profile and feed
- See individual post
- See tags
- Api
  - ```/api/{username}``` -> profile info
  - ```/api/{username}/posts``` -> profile feed
    - query:
      - cursor: {postId}_{userId}
  - ```/api/p/{shortcode}``` -> post
  - ```/api/p/{shortcode}/comments``` -> post's comments
  - ```/api/tag/{tag}``` -> tag posts

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->

## Roadmap

- [] Add stories
- [] Add highlights
- [] Add rss feed
- [] Add settings
  - [] Enable or disable proxy
  - [] Infinity scroll
  - [] Redirect URLs
  - [] Choose providers
  - [] Healthiness of providers

See the [open issues](https://codeberg.org/ThePenguinDev/Proxigram/issues) for a full list of proposed features and known issues.

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
pnpm install
pnpm build

# Start redis server.
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

Proxigram does not host any content. All content shown on any Proxigram instances is from Instagram. Any issues with the content shown on any Proxigram instance, needs to be reported to Instagram, not the mantainer's ISP or domain provider. Proxigram is not affiliated with Meta.
