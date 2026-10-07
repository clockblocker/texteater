import { expect, test } from "bun:test";
import {
	mkdirSync,
	mkdtempSync,
	realpathSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	hasProjectReferences,
	packageOwnFiles,
	splitTypeCheckOutput,
	typeCheckArgs,
	uncoveredFiles,
} from "../lib/package-types";

const base = {
	pretty: false,
	tsconfig: "tsconfig.json",
	typescriptPath: "tsc",
};

test("a tsconfig with references is built, so tsc follows them", () => {
	expect(typeCheckArgs({ ...base, hasReferences: true })).toEqual([
		"bun",
		"tsc",
		"-b",
		"tsconfig.json",
		"--force",
		"--listFiles",
	]);
	expect(
		typeCheckArgs({ ...base, hasReferences: false, pretty: true }),
	).toEqual([
		"bun",
		"tsc",
		"-p",
		"tsconfig.json",
		"--noEmit",
		"--listFiles",
		"--pretty",
	]);
});

test("only a non-empty references array counts as references", () => {
	expect(hasProjectReferences({ references: [{ path: "./a.json" }] })).toBe(
		true,
	);
	expect(hasProjectReferences({ references: [] })).toBe(false);
	expect(hasProjectReferences({ include: ["src"] })).toBe(false);
	expect(hasProjectReferences(null)).toBe(false);
});

test("listed files are split from diagnostics and kept to the package", () => {
	const existing = new Set([
		"/repo/app/demo/src/a.ts",
		"/repo/app/demo/node_modules/x/index.d.ts",
		"/repo/battery/lib/src/b.ts",
	]);
	const output = [
		"/repo/app/demo/src/a.ts",
		"/repo/app/demo/node_modules/x/index.d.ts",
		"/repo/battery/lib/src/b.ts",
		"src/a.ts(1,7): error TS2322: Type 'number' is not assignable to type 'string'.",
		"/repo/app/demo/src/a.ts",
		"",
	].join("\n");

	const { diagnostics, listedFiles } = splitTypeCheckOutput(output, (path) =>
		existing.has(path),
	);

	expect(diagnostics).toEqual([
		"src/a.ts(1,7): error TS2322: Type 'number' is not assignable to type 'string'.",
	]);
	expect(
		packageOwnFiles(listedFiles, "/repo/app/demo", (path) => path),
	).toEqual(["/repo/app/demo/src/a.ts"]);
});

test("a package under a symlinked directory still owns its listed files", () => {
	// tsc names globbed files by the logical $PWD path and resolved modules by
	// their real path, so one listing can mix both (#1070).
	const realRoot = realpathSync(
		mkdtempSync(join(tmpdir(), "package-types-")),
	);
	const realPackage = join(realRoot, "repo/battery/demo");
	mkdirSync(join(realPackage, "src"), { recursive: true });
	mkdirSync(join(realPackage, "node_modules/x"), { recursive: true });
	mkdirSync(join(realRoot, "repo/battery/lib"), { recursive: true });
	for (const file of [
		"repo/battery/demo/src/a.ts",
		"repo/battery/demo/src/b.ts",
		"repo/battery/demo/node_modules/x/index.d.ts",
		"repo/battery/lib/c.ts",
	]) {
		writeFileSync(join(realRoot, file), "");
	}
	const linkedRoot = `${realRoot}-link`;
	symlinkSync(realRoot, linkedRoot);
	const linkedPackage = join(linkedRoot, "repo/battery/demo");

	const listedFiles = [
		join(linkedPackage, "src/a.ts"),
		join(realPackage, "src/b.ts"),
		join(linkedPackage, "node_modules/x/index.d.ts"),
		join(realRoot, "repo/battery/lib/c.ts"),
	];
	const expected = [
		join(realPackage, "src/a.ts"),
		join(realPackage, "src/b.ts"),
	];

	try {
		expect(
			packageOwnFiles(listedFiles, linkedPackage, realpathSync),
		).toEqual(expected);
		expect(packageOwnFiles(listedFiles, realPackage, realpathSync)).toEqual(
			expected,
		);
	} finally {
		rmSync(linkedRoot);
		rmSync(realRoot, { recursive: true });
	}
});

test("a package TypeScript file in no checked project is uncovered", () => {
	const packageFiles = [
		"/repo/app/demo/tests/b.test.ts",
		"/repo/app/demo/src/a.ts",
		"/repo/app/demo/src/view.tsx",
		"/repo/app/demo/tooling/run.mts",
		"/repo/app/demo/tooling/legacy.cts",
		"/repo/app/demo/src/env.d.ts",
		"/repo/app/demo/src/shim.d.mts",
		"/repo/app/demo/README.md",
		"/repo/app/demo/scripts/build.js",
	];
	const checkedFiles = [
		"/repo/app/demo/src/a.ts",
		"/repo/app/demo/tooling/run.mts",
		"/repo/battery/lib/src/b.ts",
	];

	expect(uncoveredFiles(packageFiles, checkedFiles)).toEqual([
		"/repo/app/demo/src/view.tsx",
		"/repo/app/demo/tests/b.test.ts",
		"/repo/app/demo/tooling/legacy.cts",
	]);
	expect(uncoveredFiles(packageFiles.slice(1, 2), checkedFiles)).toEqual([]);
});
