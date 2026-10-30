import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

/**
 * Everything under `src/` ships, and it runs where a host has no file
 * system: a Convex isolate, an Obsidian plugin. None of it may import
 * `node:*`, read files or the environment, or use the network, and it
 * imports only `common-utils`. Only the Extracted Text schema imports Zod,
 * and no other production file imports it, so the root loads no Zod.
 */
const src = resolve(import.meta.dir, "../src");
const allowedPackages = new Set(["common-utils"]);
const zodFiles = new Set(["extracted-text/schema.ts"]);
const forbidden = [
	/\bBun\./u,
	/\bprocess\./u,
	/\bimport\.meta\b/u,
	/\breadFile(?:Sync)?\b/u,
	/\bfetch\(/u,
	/\bDate\.now\b/u,
];

const files = readdirSync(src, { recursive: true, withFileTypes: true })
	.filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
	.map((entry) => join(entry.parentPath, entry.name));
const production = new Set(files);
const importPattern = /^(import|export)(\s+type)?[^;]*?from\s+"([^"]+)"/gmu;

function problemsOf(file: string): string[] {
	const source = readFileSync(file, "utf8");
	const name = relative(src, file);
	const problems: string[] = [];
	for (const match of source.matchAll(importPattern)) {
		const specifier = match[3] ?? "";
		if (specifier.startsWith(".")) {
			const target = resolve(dirname(file), specifier).replace(
				/\.js$/u,
				".ts",
			);
			if (!production.has(target))
				problems.push(`${name} reaches outside src: ${specifier}`);
			else if (zodFiles.has(relative(src, target)))
				problems.push(`${name} imports the Zod schema`);
		} else if (!(specifier === "zod" && zodFiles.has(name))) {
			if (!allowedPackages.has(specifier))
				problems.push(`${name} imports ${specifier}`);
		}
	}
	for (const pattern of forbidden)
		if (pattern.test(source)) problems.push(`${name} uses ${pattern}`);
	return problems;
}

test("the production code imports nothing that needs a file system", () => {
	expect(files.length).toBeGreaterThan(1);
	expect(files.flatMap(problemsOf)).toEqual([]);
});
