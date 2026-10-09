import "./dom-globals";
import { afterEach } from "bun:test";
import { cleanup } from "@testing-library/react";

/*
 * Opts the importing test file into a happy-dom `window` and `document`, for
 * tests that click, await a state change or re-render with new props.
 *
 * Import it first, as a bare `import "./support/dom";`: libraries decide at
 * module load whether a DOM exists (React DOM, Base UI's layout effects), so
 * the DOM must be registered before they load. `bun run test` runs each file
 * with `--isolate`, so the DOM ends with the file and never reaches a static
 * render or a Convex test.
 */
afterEach(() => {
	cleanup();
});
