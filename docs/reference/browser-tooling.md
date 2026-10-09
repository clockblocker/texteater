# Browser tooling

Poke an app with local `browse`; write anything meant to be rerun as a
Playwright test.

## Poking with browse

A poke is interactive, step-by-step exploration of an app's UI by an agent or a
human: open a page, read its accessibility snapshot, click or hover, read
state. `browse` is Browserbase's CLI, installed globally with
`npm install -g browse` rather than as a repository dependency.

Run `browse` locally only. Don't open `--remote` sessions or run
`browse cloud`, `browse functions` or anything else that calls Browserbase,
and keep `BROWSERBASE_API_KEY` out of the environment.

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
rather than the one you opened. `browse skills show` covers the other commands;
skip its remote and cloud ones.

## Checks with Playwright

Write browser UI tests, regression checks and CI gates as Playwright tests.
Locators act on elements directly, so `locator.hover()` needs no coordinates;
assertions such as `expect(locator).toHaveCSS(...)` retry instead of
sleeping; and the runner keeps traces and can run in CI. When a poke finds
behaviour worth keeping, turn it into a Playwright test.

An app without a Playwright setup starts from
`app/tf-demo/playwright.config.ts`.

Playwright is the repository's only browser-automation library. Puppeteer
would duplicate it while driving only Chrome and offering no test runner.

## Component tests in tf-demo

tf-demo tests a component one of three ways, cheapest first:

- **Static markup**: `renderToStaticMarkup` from `react-dom/server`, when the
  test only asserts what one render shows for some props or data.
- **DOM renderer**: happy-dom with `@testing-library/react`, when the test
  clicks, awaits a state change or re-renders with new props, and fakes what
  sits behind the component (for example, a Convex client whose `mutation`
  the test answers). Name the file `*.dom.test.tsx` (or `*.dom.test.ts`) and
  make `import "./support/dom";` its first import;
  `tests/knowledge-settings-form.dom.test.tsx` is the example.
- **Playwright**: when the behaviour needs a real browser, such as layout,
  pointer gestures, motion, focus across the page or a running Convex backend.

A DOM test file gets happy-dom only through that import. Bun shares one
global object across the files of a run, so `bun run test` (the shared
`tooling/run-package-tests.ts`) runs the other files in a pass that ignores
`*.dom.test.*`, then the DOM files in a second process with `--isolate`.
Static-markup and Convex tests never see DOM globals. Root
`bun run test:tooling` fails a test file that imports `support/dom`, happy-dom
or `@testing-library/react` without the suffix. A global happy-dom preload
would replace `fetch`, `setTimeout`, `URL`, `Request` and `Response` for every
test, and libraries such as TanStack Query would take their browser branch
inside static renders.
