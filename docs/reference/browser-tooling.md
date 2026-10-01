# Browser tooling

Poke an app with `browse`; write anything meant to be rerun as a Playwright
test.

## Poking with browse

A poke is interactive, step-by-step exploration of an app's UI by an agent or a
human: open a page, read its accessibility snapshot, click or hover, read
state. `browse` is Browserbase's CLI, installed globally with
`npm install -g browse` rather than as a repository dependency.

Open every session with `--local`, and name the session on every command:

```sh
browse open <url> --local --session <name>
browse snapshot --session <name>
browse click @0-5 --session <name>
browse stop --session <name>
```

`--local` drives Chrome on this machine with no API key and no cost; add
`--headed` to watch it. When `BROWSERBASE_API_KEY` is set, `browse` defaults to
remote mode, a billed Browserbase cloud browser that cannot reach a dev server
on `127.0.0.1`. A command without `--session` targets the `default` session
rather than the one you opened. `browse skills show` covers the other commands.

## Checks with Playwright

Write UI tests, regression checks and CI gates as Playwright tests. Locators act
on elements directly, so `locator.hover()` needs no coordinates; assertions
such as `expect(locator).toHaveCSS(...)` retry instead of sleeping; and the
runner keeps traces and can run in CI. When a poke finds behaviour worth
keeping, turn it into a Playwright test.

An app without a Playwright setup starts from
`app/tf-demo/playwright.config.ts`.

Playwright is the repository's only browser-automation library. Puppeteer
would duplicate it while driving only Chrome and offering no test runner.
