import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

/**
 * The production segmenter runs where a host has no file system (a database
 * transaction, a short-lived isolate): nothing under `src/segment/` may
 * import `node:*`, read files or reach outside it except through the
 * packages listed here.
 */
const root = resolve(import.meta.dir, "../../src/segment");
const allowedPackages = new Set([
	// Reads no files (dumspec ADR 0025).
	"dumspec/inventories",
	"promptsmith/typesafe",
]);
const typeOnlyPackages = new Set(["promptsmith/typesafe"]);
const forbidden = [
	/\bBun\./u,
	/\bprocess\./u,
	/\bimport\.meta\b/u,
	/\breadFile(?:Sync)?\b/u,
	/\bfetch\(/u,
];

const files = readdirSync(root, { recursive: true, withFileTypes: true })
	.filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
	.map((entry) => join(entry.parentPath, entry.name));

test("the production segmenter imports nothing that needs a file system", () => {
	expect(files.length).toBeGreaterThan(0);
	const problems: string[] = [];
	for (const file of files) {
		const source = readFileSync(file, "utf8");
		const name = relative(root, file);
		for (const match of source.matchAll(
			/^(import|export)(\s+type)?[^;]*?from\s+"([^"]+)"/gmu,
		)) {
			const typeOnly = match[2] !== undefined;
			const specifier = match[3] ?? "";
			if (specifier.startsWith(".")) {
				const target = resolve(dirname(file), specifier);
				if (!target.startsWith(`${root}/`))
					problems.push(
						`${name} reaches outside src/segment: ${specifier}`,
					);
			} else if (!allowedPackages.has(specifier))
				problems.push(`${name} imports ${specifier}`);
			else if (typeOnlyPackages.has(specifier) && !typeOnly)
				problems.push(`${name} imports ${specifier} at runtime`);
		}
		for (const pattern of forbidden)
			if (pattern.test(source)) problems.push(`${name} uses ${pattern}`);
	}
	expect(problems).toEqual([]);
});
