import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	findTestFiles,
	isDomTestFile,
	planTestPasses,
} from "../lib/package-test-passes";
import { discoverWorkspaces, findRepositoryRoot } from "../lib/workspaces";

const cwd = "/repo/app/demo";
const files = [
	"src/view.test.tsx",
	"tests/form.dom.test.tsx",
	"tests/server.test.ts",
];
const ignoreDom = ["--path-ignore-patterns", "**/*.dom.test.*"];

test("a workspace without DOM test files keeps one pass that ignores DOM files", () => {
	expect(planTestPasses(["./tests"], ["tests/a.test.ts"], cwd)).toEqual([
		[...ignoreDom, "./tests"],
	]);
});

test("DOM test files run after the main pass in their own isolated process", () => {
	expect(planTestPasses([], files, cwd)).toEqual([
		ignoreDom,
		["--isolate", "./tests/form.dom.test.tsx"],
	]);
});

test("forwarded paths reach only the pass whose files they match", () => {
	expect(planTestPasses(["tests/form.dom.test.tsx"], files, cwd)).toEqual([
		["--isolate", "./tests/form.dom.test.tsx"],
	]);
	expect(planTestPasses([`${cwd}/tests/server.test.ts`], files, cwd)).toEqual(
		[[...ignoreDom, `${cwd}/tests/server.test.ts`]],
	);
	expect(planTestPasses(["./tests"], files, cwd)).toEqual([
		[...ignoreDom, "./tests"],
		["--isolate", "./tests/form.dom.test.tsx"],
	]);
});

test("options reach both passes, and an option's value is not a path filter", () => {
	expect(planTestPasses(["-t", "form", "--bail=1"], files, cwd)).toEqual([
		[...ignoreDom, "-t", "form", "--bail=1"],
		["--isolate", "-t", "form", "--bail=1", "./tests/form.dom.test.tsx"],
	]);
});

test("a filter that matches no file still runs the main pass, so Bun fails it", () => {
	expect(planTestPasses(["missing"], files, cwd)).toEqual([
		[...ignoreDom, "missing"],
	]);
});

// Bun shares one global object across a run's files, so a DOM opt-in in a file
// the main pass loads would leak `window` into every later file (#1135).
const domOptIn =
	/^\s*import\s+(?:[^"']*\sfrom\s+)?["'](?:[^"']*\/support\/dom|@happy-dom\/[^"']+|@testing-library\/react)["']/m;

test("every test file that opts into a DOM is named *.dom.test.*", async () => {
	const root = await findRepositoryRoot(import.meta.dir);
	const misnamed: string[] = [];
	for (const workspace of await discoverWorkspaces(root)) {
		for (const path of findTestFiles(workspace.dir)) {
			if (isDomTestFile(path)) continue;
			const source = await readFile(join(workspace.dir, path), "utf8");
			if (domOptIn.test(source))
				misnamed.push(join(workspace.relativePath, path));
		}
	}
	expect(misnamed).toEqual([]);
});

test("the DOM opt-in check sees tf-demo's support import and the DOM libraries", () => {
	for (const source of [
		'import "./support/dom";',
		'import "../tests/support/dom";',
		'import { render } from "@testing-library/react";',
		'import { GlobalRegistrator } from "@happy-dom/global-registrator";',
	])
		expect(domOptIn.test(source)).toBe(true);
	expect(domOptIn.test('import { x } from "./support/dominoes";')).toBe(
		false,
	);
});
