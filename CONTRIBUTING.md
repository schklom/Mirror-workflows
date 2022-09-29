## Contributing code the right way

TLDR: it works like Github.

1. Register on the [development website](https://dev.tt-rss.org);
2. Fork the repository you're interested in;
3. Do the needful;
4. Verify that your changes pass through PHPStan (see below);
4. File a PR against master branch;

If you have any other questions, see this [forum thread](https://discourse.tt-rss.org/t/how-to-contribute-code-via-pull-requests-on-git-tt-rss-org/1850).

Please don't inline patches in forum posts, attach files instead (``.patch`` or ``.diff`` file
extensions should work).

## PHPStan

Here's an example on how to run the analyzer using Docker:

```sh
docker run --rm -v $(pwd):/app -v /tmp/phpstan-8.1:/tmp/phpstan --workdir /app php:8.1-cli php -d memory_limit=-1 ./vendor/bin/phpstan --memory-limit=2G --error-format=raw
```

Any errors break CI pipeline so you'll have to make sure it's clean.

## Contributing translations

Believe it or not, people also spam using Weblate. Therefore, some minor jumping through hoops is involved here:

1. Register on [Weblate](https://weblate.tt-rss.org/) / forums;
2. Post in the [Weblate discussion thread](https://community.tt-rss.org/t/easier-translations-with-weblate/1680) on the forum, ask to be added to a project
you're interested in;
3. You'll be given proper access rights and will be able to edit translations.

That's it. If the language you're interested is not available yet, ask and we'll add it;
