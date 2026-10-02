import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

/**
 * The production code, the package entry and everything under
 * `src/segment/`, runs where a host has no file system (a Convex action, a
 * short-lived isolate): none of it may import `node:*`, read files or the
 * environment, or reach the evaluator or the lab, and it imports packages
 * only from the list here. Only the TypeSafe ask touches the network; the
 * segmenter's stages reach jev through their `ask` port.
 */
const src = resolve(import.meta.dir, "../../src");
const segment = join(src, "segment");
const allowedPackages = new Set([
	// Reads no files (dumspec ADR 0025).
	"dumspec/inventories",
	"dumling/types",
	"promptsmith/typesafe",
]);
const typeOnlyPackages = new Set(["dumling/types", "promptsmith/typesafe"]);
const forbidden = [
	/\bBun\./u,
	/\bprocess\./u,
	/\bimport\.meta\b/u,
	/\breadFile(?:Sync)?\b/u,
];
const network = /\bfetch\(/u;
const networkFiles = new Set(["segment/typesafe-ask.ts"]);

const files = [
	join(src, "index.ts"),
	...readdirSync(segment, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
		.map((entry) => join(entry.parentPath, entry.name)),
];
const production = new Set(files);

test("the production code imports nothing that needs a file system", () => {
	expect(files.length).toBeGreaterThan(1);
	const problems: string[] = [];
	for (const file of files) {
		const source = readFileSync(file, "utf8");
		const name = relative(src, file);
		for (const match of source.matchAll(
			/^(import|export)(\s+type)?[^;]*?from\s+"([^"]+)"/gmu,
		)) {
			const typeOnly = match[2] !== undefined;
			const specifier = match[3] ?? "";
			if (specifier.startsWith(".")) {
				const target = resolve(dirname(file), specifier).replace(
					/\.js$/u,
					".ts",
				);
				if (!production.has(target))
					problems.push(
						`${name} reaches outside the production code: ${specifier}`,
					);
			} else if (!allowedPackages.has(specifier))
				problems.push(`${name} imports ${specifier}`);
			else if (typeOnlyPackages.has(specifier) && !typeOnly)
				problems.push(`${name} imports ${specifier} at runtime`);
		}
		for (const pattern of forbidden)
			if (pattern.test(source)) problems.push(`${name} uses ${pattern}`);
		if (network.test(source) && !networkFiles.has(name))
			problems.push(`${name} uses the network`);
	}
	expect(problems).toEqual([]);
});
