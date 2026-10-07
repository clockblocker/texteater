import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

/**
 * Everything under `src/` is production code: it ships, and it runs where a
 * host has no file system (a Convex action, a short-lived isolate). None of
 * it may import `node:*`, read files or the environment, or reach the
 * evaluator and the jev lab under `lab/`, and it imports packages only from
 * the list here. Only the TypeSafe ask and the OpenAI Luna touch the
 * network; the stages reach jev and Luna through their ports, and
 * segmentation never Luna.
 */
const src = resolve(import.meta.dir, "../../src");
const lab = resolve(import.meta.dir, "../../lab");
const segment = join(src, "segment");
const allowedPackages = new Set([
	// The root entry's small shared helpers: no files, no Zod.
	"common-utils",
	// Reads no files (dumcorpus ADR 0025).
	"dumcorpus/inventories",
	"dumcorpus/types",
	// Dumling's operational entry: compiled validation, no files.
	"dumling",
	"dumling/types",
	// Dumrel's compiled validation and policies, no files.
	"dumrel",
	"dumrel/types",
	"effect/Cause",
	"effect/Data",
	"effect/Effect",
	"effect/Exit",
	"effect/Fiber",
	"effect/Result",
	"effect/Scope",
	"effect/Semaphore",
	"@typesafe-ai/sdk",
]);
const typeOnlyPackages = new Set([
	"dumling/types",
	"dumrel/types",
	"dumcorpus/types",
	"@typesafe-ai/sdk",
]);
const forbidden = [
	/\bBun\./u,
	/\bprocess\./u,
	/\bimport\.meta\b/u,
	/\breadFile(?:Sync)?\b/u,
];
const network = /\bfetch\(/u;
const networkFiles = new Set(["segment/typesafe-ask.ts", "openai-luna.ts"]);

const files = readdirSync(src, { recursive: true, withFileTypes: true })
	.filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
	.map((entry) => join(entry.parentPath, entry.name));
const production = new Set(files);
const importPattern = /^(import|export)(\s+type)?[^;]*?from\s+"([^"]+)"/gmu;

test("the production code imports nothing that needs a file system", () => {
	expect(files.length).toBeGreaterThan(1);
	const problems: string[] = [];
	for (const file of files) {
		const source = readFileSync(file, "utf8");
		const name = relative(src, file);
		for (const match of source.matchAll(importPattern)) {
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

test("no production file imports the lab, not even a type", () => {
	const reaching = files.flatMap((file) =>
		[
			...[...readFileSync(file, "utf8").matchAll(importPattern)].map(
				(match) => match[3] ?? "",
			),
			...[
				...readFileSync(file, "utf8").matchAll(
					/\bimport\(\s*"([^"]+)"/gu,
				),
			].map((match) => match[1] ?? ""),
		]
			.filter(
				(specifier) =>
					specifier.startsWith(".") &&
					`${resolve(dirname(file), specifier)}/`.startsWith(
						`${lab}/`,
					),
			)
			.map((specifier) => `${relative(src, file)} imports ${specifier}`),
	);
	expect(reaching).toEqual([]);
});

test("segmentation never receives Luna", () => {
	const reaching = files
		.filter((file) => file.startsWith(`${segment}/`))
		.filter((file) =>
			/\bluna\.js"|\bLunaAsk\b/u.test(readFileSync(file, "utf8")),
		)
		.map((file) => relative(src, file));
	expect(reaching).toEqual([]);
});
