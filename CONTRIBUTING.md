## Contributing code the right way

TLDR: it works *almost* like Github.

Due to spam, new Gitlab users are set to [external](https://docs.gitlab.com/ee/user/admin_area/external_users.html). In order to do anything, you'll need to ask for your account to be promoted. Sorry for the inconvenience.

1. Register on the [Gitlab](https://gitlab.tt-rss.org);
2. Post on the forums asking for your account to be promoted;
3. Fork the repository you're interested in;
4. Do the needful;
6. File a PR against master branch and verify that CI pipeline (especially, PHPStan) passes;

If you have any other questions, see this [forum thread](https://discourse.tt-rss.org/t/how-to-contribute-code-via-pull-requests-on-git-tt-rss-org/1850).

Please don't inline patches in forum posts, attach files instead (``.patch`` or ``.diff`` file extensions should work).

### FAQ

#### How do I push or pull without SSH?

You can't use SSH directly because tt-rss Gitlab is behind Cloudflare. You can use HTTPS with personal access tokens instead.

Create a personal access token in [Gitlab preferences](https://gitlab.tt-rss.org/-/user_settings/personal_access_tokens);

Optionally, configure Git to transparently work with tt-rss Gitlab repositories using HTTPS:

```
git config --global \
  --add url."https://gitlab-token:your-personal-access-token@gitlab.tt-rss.org/".insteadOf \
  "git@gitlab.tt-rss.org:"
```

Alternatively, checkout over HTTPS while adding the token manually:

```
git clone https://gitlab-token:your-personal-access-token@gitlab.tt-rss.org/tt-rss/tt-rss.git tt-rss
```

That's it.
