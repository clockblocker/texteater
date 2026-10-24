import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import type * as Effect from "effect/Effect";
import type { Jev } from "../../src/jev-call.js";
import type { Luna } from "../../src/luna-call.js";
import { operations } from "../../src/operations.js";

/**
 * Everything under `src/` is production code: it ships, and it runs where a
 * host has no file system (a Convex action, a short-lived isolate). None of
 * it may import `node:*`, read files or the environment, or reach the
 * evaluator and the jev lab under `lab/`, and it imports packages only from
 * the list here. Only the TypeSafe ask and the OpenAI Luna touch the
 * network; the stages reach jev and Luna through their ports, and
 * segmentation never Luna. Only the Extracted Text schema imports Zod,
 * and no other production file imports it. Time comes from Effect's
 * `Clock`, so a `TestClock` pins every trace. The models are services
 * (Dumgen ADR 0009), and `segment.inUnits` needs `Jev` alone.
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
	"effect/Clock",
	"effect/Context",
	"effect/Data",
	"effect/Effect",
	"effect/Exit",
	"effect/Fiber",
	"effect/Layer",
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
	/\bDate\.now\b/u,
	/\bperformance\.now\b/u,
];
const zodFiles = new Set([
	"extracted-text/schema.ts",
	"resolve/he/routes.ts",
	"knowledge/he/produce.ts",
]);
// Exact consumer/entry pairs, not a blanket dumling/schema/* permission.
const schemaPackagesByFile = new Map([
	[
		"resolve/he/routes.ts",
		new Set([
			"dumling/schema/he/lexeme/adjective",
			"dumling/schema/he/lexeme/adposition",
			"dumling/schema/he/lexeme/adverb",
			"dumling/schema/he/lexeme/auxiliary",
			"dumling/schema/he/lexeme/coordinating-conjunction",
			"dumling/schema/he/lexeme/determiner",
			"dumling/schema/he/lexeme/interjection",
			"dumling/schema/he/lexeme/noun",
			"dumling/schema/he/lexeme/numeral",
			"dumling/schema/he/lexeme/particle",
			"dumling/schema/he/lexeme/pronoun",
			"dumling/schema/he/lexeme/proper-noun",
			"dumling/schema/he/lexeme/subordinating-conjunction",
			"dumling/schema/he/lexeme/symbol",
			"dumling/schema/he/lexeme/verb",
			"dumling/schema/he/locution/adverb",
			"dumling/schema/he/locution/interjection",
			"dumling/schema/he/saying/saying",
			"dumling/schema/he/foreign/foreign",
		]),
	],
	["knowledge/he/produce.ts", new Set(["dumrel/schema"])],
]);
const schemaRoots = [
	resolve(src, "../../dumling/src"),
	resolve(src, "../../dumrel/src"),
];
const transpiler = new Bun.Transpiler({ loader: "ts" });

function allowsSchemaImport(name: string, specifier: string): boolean {
	return schemaPackagesByFile.get(name)?.has(specifier) ?? false;
}

// Follow emitted runtime edges, including re-exports, but not erased types.
// Zod, emoji-regex and Dumling's already-approved compiled root are pure leaves.
function schemaProblems(
	entries: readonly string[],
	readSource: (file: string) => string = (file) => readFileSync(file, "utf8"),
	resolveImport: (specifier: string, parent: string) => string = (
		specifier,
		parent,
	) => Bun.resolveSync(specifier, dirname(parent)),
): string[] {
	const problems: string[] = [];
	const visited = new Set<string>();
	const pending = [...entries];
	for (const file of pending) {
		if (visited.has(file)) continue;
		visited.add(file);
		if (!schemaRoots.some((root) => file.startsWith(`${root}/`))) {
			problems.push(`${file} reaches outside the schema runtime`);
			continue;
		}
		const source = readSource(file);
		for (const pattern of forbidden)
			if (pattern.test(source)) problems.push(`${file} uses ${pattern}`);
		if (network.test(source)) problems.push(`${file} uses the network`);
		for (const dependency of transpiler.scanImports(source)) {
			const specifier = dependency.path;
			if (dependency.kind !== "import-statement") {
				problems.push(`${file} uses ${dependency.kind}: ${specifier}`);
				continue;
			}
			if (["zod", "emoji-regex", "dumling"].includes(specifier)) continue;
			if (
				specifier.startsWith(".") ||
				specifier.startsWith("dumling/schema/")
			)
				pending.push(resolveImport(specifier, file));
			else problems.push(`${file} imports ${specifier}`);
		}
	}
	return problems;
}
const network = /\bfetch\(/u;
const networkFiles = new Set(["segment/typesafe-ask.ts", "openai-luna.ts"]);

const files = readdirSync(src, { recursive: true, withFileTypes: true })
	.filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
	.map((entry) => join(entry.parentPath, entry.name));
const production = new Set(files);
const importPattern = /^(import|export)(\s+type)?[^;]*?from\s+"([^"]+)"/gmu;

test("schema permissions are limited to reviewed consumer/entry pairs", () => {
	expect(
		allowsSchemaImport(
			"resolve/he/routes.ts",
			"dumling/schema/he/lexeme/noun",
		),
	).toBe(true);
	expect(
		allowsSchemaImport(
			"segment/routes.ts",
			"dumling/schema/he/lexeme/noun",
		),
	).toBe(false);
	expect(
		allowsSchemaImport(
			"resolve/he/routes.ts",
			"dumling/schema/de/lexeme/noun",
		),
	).toBe(false);
	expect(allowsSchemaImport("resolve/he/routes.ts", "dumrel/schema")).toBe(
		false,
	);
});

test("permitted schema entries have a pure transitive runtime graph", () => {
	const entries = [...schemaPackagesByFile.values()].flatMap((packages) =>
		[...packages].map((specifier) => Bun.resolveSync(specifier, src)),
	);
	expect(entries).toHaveLength(20);
	expect(schemaProblems(entries)).toEqual([]);
});

test("the schema graph guard catches indirect filesystem and host access", () => {
	const entry = join(
		schemaRoots[0] ?? "",
		"generated/schemas/he/lexeme/noun.ts",
	);
	const child = join(schemaRoots[0] ?? "", "schemas/unsafe.ts");
	const inspect = (source: string) =>
		schemaProblems(
			[entry],
			(file) =>
				file === entry
					? 'export { schema } from "./child.js";'
					: source,
			() => child,
		);
	expect(inspect('import { readFileSync } from "node:fs";')).toContain(
		`${child} imports node:fs`,
	);
	expect(inspect('import "node:fs";')).toContain(`${child} imports node:fs`);
	expect(inspect("process.env.SECRET;")).not.toEqual([]);
	expect(inspect('fetch("https://example.com");')).toContain(
		`${child} uses the network`,
	);
	expect(inspect('import("node:fs");')).not.toEqual([]);
	expect(
		inspect(
			'import type { Schema } from "node:fs"; export const schema = {};',
		),
	).toEqual([]);
	expect(
		schemaProblems(
			[entry],
			() => 'export { schema } from "./lab.js";',
			() => join(lab, "schema.ts"),
		),
	).toContain(`${join(lab, "schema.ts")} reaches outside the schema runtime`);
});

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
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
				else if (relative(src, target) === "extracted-text/schema.ts")
					problems.push(`${name} imports the Zod schema entry`);
			} else if (specifier === "zod" && zodFiles.has(name)) continue;
			else if (allowsSchemaImport(name, specifier)) continue;
			else if (!allowedPackages.has(specifier))
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

test("segment.inUnits needs Jev alone: its type shows it never reaches Luna", () => {
	type Needs = Effect.Services<ReturnType<typeof operations.segment.inUnits>>;
	// Each fails to compile once Luna, or anything but Jev, joins `Needs`.
	const lunaFree: [Extract<Needs, Luna>] extends [never] ? true : false =
		true;
	const jevAlone: [Needs] extends [Jev]
		? [Jev] extends [Needs]
			? true
			: false
		: false = true;
	expect([lunaFree, jevAlone]).toEqual([true, true]);
	expect(typeof operations.segment.inUnits).toBe("function");
});
