import { expect, test } from "bun:test";
import {
	hasProjectReferences,
	packageOwnFiles,
	splitTypeCheckOutput,
	typeCheckArgs,
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
	expect(packageOwnFiles(listedFiles, "/repo/app/demo")).toEqual([
		"/repo/app/demo/src/a.ts",
	]);
});
