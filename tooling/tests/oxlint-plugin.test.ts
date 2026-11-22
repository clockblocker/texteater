import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { toolPaths } from "../lib/tools";
import { findRepositoryRoot } from "../lib/workspaces";

const repositoryRoot = await findRepositoryRoot(import.meta.dir);
const pluginPath = join(repositoryRoot, "tooling/oxlint-plugin/index.ts");
const tempDirs: string[] = [];

afterEach(() => {
	while (tempDirs.length > 0) {
		const dir = tempDirs.pop();
		if (dir) rmSync(dir, { recursive: true, force: true });
	}
});

interface LintDiagnostic {
	readonly code: string;
	readonly severity: string;
	readonly message: string;
}

function lintSnippet(
	rule: string,
	filename: string,
	source: string,
): readonly LintDiagnostic[] {
	const dir = mkdtempSync(join(tmpdir(), "tf-oxlint-plugin-"));
	tempDirs.push(dir);
	const configPath = join(dir, "oxlint.json");
	const filePath = join(dir, filename);
	writeFileSync(
		configPath,
		JSON.stringify({
			jsPlugins: [pluginPath],
			rules: { [`textfresser/${rule}`]: "error" },
		}),
	);
	writeFileSync(filePath, source);
	const result = Bun.spawnSync(
		[
			process.execPath,
			toolPaths(repositoryRoot).oxlint,
			"--config",
			configPath,
			"--format=json",
			filePath,
		],
		{ cwd: dir, stdout: "pipe", stderr: "pipe" },
	);
	const stdout = result.stdout.toString();
	expect(stdout.length, result.stderr.toString()).toBeGreaterThan(0);
	const parsed = JSON.parse(stdout) as { diagnostics?: LintDiagnostic[] };
	return (parsed.diagnostics ?? []).filter(
		(diag) => diag.code === `textfresser(${rule})`,
	);
}

describe("tooling/oxlint-plugin", () => {
	test("no-inline-schema-compile flags per-call compilers inside functions and allows module scope", () => {
		const invalid = lintSnippet(
			"no-inline-schema-compile",
			"sample.ts",
			`
import * as Schema from "effect/Schema";
const User = Schema.Struct({ name: Schema.String });
export function check(input: unknown) {
	return Schema.decodeUnknownSync(User)(input);
}
`,
		);
		expect(invalid).toHaveLength(1);

		const valid = lintSnippet(
			"no-inline-schema-compile",
			"sample.ts",
			`
import * as Schema from "effect/Schema";
const User = Schema.Struct({ name: Schema.String });
const decodeUser = Schema.decodeUnknownSync(User);
export function check(input: unknown) {
	return decodeUser(input);
}
`,
		);
		expect(valid).toHaveLength(0);
	});

	test("prefer-catch-tags flags Effect.catchTag and allows Effect.catchTags", () => {
		const invalid = lintSnippet(
			"prefer-catch-tags",
			"sample.ts",
			`
import * as Effect from "effect/Effect";
export const run = (e: Effect.Effect<void, { _tag: "Boom" }>) =>
	e.pipe(Effect.catchTag("Boom", () => Effect.void));
`,
		);
		expect(invalid).toHaveLength(1);

		const valid = lintSnippet(
			"prefer-catch-tags",
			"sample.ts",
			`
import * as Effect from "effect/Effect";
export const run = (e: Effect.Effect<void, { _tag: "Boom" }>) =>
	e.pipe(Effect.catchTags({ Boom: () => Effect.void }));
`,
		);
		expect(valid).toHaveLength(0);
	});

	test("no-unreasoned-state-sync flags useEffect in source files and ignores test files", () => {
		const invalid = lintSnippet(
			"no-unreasoned-state-sync",
			"component.tsx",
			`
import { useEffect } from "react";
export function Demo() {
	useEffect(() => {}, []);
	return null;
}
`,
		);
		expect(invalid).toHaveLength(1);

		const ignoredInTests = lintSnippet(
			"no-unreasoned-state-sync",
			"component.test.tsx",
			`
import { useEffect } from "react";
export function Demo() {
	useEffect(() => {}, []);
	return null;
}
`,
		);
		expect(ignoredInTests).toHaveLength(0);
	});

	test("no-real-time-wait-in-tests flags real sleeps and allows TestClock-driven testEffect", () => {
		const invalid = lintSnippet(
			"no-real-time-wait-in-tests",
			"sample.test.ts",
			`
import { test } from "bun:test";
test("waits", async () => {
	await new Promise((resolve) => setTimeout(resolve, 10));
});
`,
		);
		expect(invalid).toHaveLength(1);

		const valid = lintSnippet(
			"no-real-time-wait-in-tests",
			"sample.test.ts",
			`
import * as Effect from "effect/Effect";
import { TestClock } from "effect/testing";
import { testEffect } from "common-utils/effect-test";
testEffect("virtual time", () =>
	Effect.gen(function* () {
		yield* Effect.forkChild(Effect.sleep("1 second"));
		yield* TestClock.adjust("1 second");
	}),
);
`,
		);
		expect(valid).toHaveLength(0);
	});

	test("no-polling-loop-in-tests flags predicate polling loops and allows fixed flushes", () => {
		const invalid = lintSnippet(
			"no-polling-loop-in-tests",
			"sample.test.ts",
			`
import * as Effect from "effect/Effect";
export const poll = Effect.gen(function* () {
	let ready = false;
	while (!ready) {
		yield* Effect.yieldNow;
	}
});
`,
		);
		expect(invalid).toHaveLength(1);

		const valid = lintSnippet(
			"no-polling-loop-in-tests",
			"sample.test.ts",
			`
import * as Effect from "effect/Effect";
export const flush = Effect.gen(function* () {
	for (let i = 0; i < 3; i++) {
		yield* Effect.yieldNow;
	}
});
`,
		);
		expect(valid).toHaveLength(0);
	});

	test("no-wall-clock-in-tests flags Date.now() and allows setSystemTime seeding", () => {
		const invalid = lintSnippet(
			"no-wall-clock-in-tests",
			"sample.test.ts",
			`
import { test } from "bun:test";
test("reads wall clock", () => {
	const t = Date.now();
	return t;
});
`,
		);
		expect(invalid).toHaveLength(1);

		const valid = lintSnippet(
			"no-wall-clock-in-tests",
			"sample.test.ts",
			`
import { setSystemTime, test } from "bun:test";
test("seeds system clock", () => {
	setSystemTime(new Date(Date.now() + 1000));
});
`,
		);
		expect(valid).toHaveLength(0);
	});
});
