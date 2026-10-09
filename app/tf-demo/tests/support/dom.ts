import "./dom-globals";
import { afterEach } from "bun:test";
import { cleanup } from "@testing-library/react";

/*
 * Opts the importing test file into a happy-dom `window` and `document`, for
 * tests that click, await a state change or re-render with new props.
 *
 * Import it first, as a bare `import "./support/dom";`: libraries decide at
 * module load whether a DOM exists (React DOM, Base UI's layout effects), so
 * the DOM must be registered before they load. Name the file
 * `*.dom.test.tsx`: `bun run test` runs DOM files in their own process, one
 * fresh global each, so the DOM never reaches a static render or a Convex
 * test.
 */
afterEach(() => {
	cleanup();
});
