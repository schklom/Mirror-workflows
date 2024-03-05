## Contributing code the right way

TLDR: it works *almost* like Github.

Due to spam, new Gitlab users are set to [external](https://docs.gitlab.com/ee/user/admin_area/external_users.html). In order to do anything, you'll need to ask for your account to be promoted. Sorry for the inconvenience.

1. Register on the [development website](https://dev.tt-rss.org);
2. Post on the forums asking for your account to be promoted;
3. Fork the repository you're interested in;
4. Do the needful;
6. File a PR against master branch and verify that CI pipeline (especially, PHPStan) passes;

If you have any other questions, see this [forum thread](https://discourse.tt-rss.org/t/how-to-contribute-code-via-pull-requests-on-git-tt-rss-org/1850).

Please don't inline patches in forum posts, attach files instead (``.patch`` or ``.diff`` file extensions should work).
