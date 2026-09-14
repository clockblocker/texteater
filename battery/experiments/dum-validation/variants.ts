import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { applyCompilation, compiledConsumers } from "./apply-compilation";
import { applyOperationSplitting } from "./apply-operation-splitting";
import { applyRuleReuse } from "./apply-rule-reuse";
import { applyLinkedRules } from "./apply-linked-rules";
import {
	applyCatalogSplitting,
	catalogSelector,
} from "./apply-catalog-splitting";

export const changedPaths = [
	"battery/common-utils/src/validation-artifact.ts",
	"battery/common-utils/package.json",
	"battery/dumling/package.json",
	"battery/dumrel/src/parse-reading-knowledge.ts",
	"battery/dumrel/src/apply-knowledge-change.ts",
	"battery/dumrel/package.json",
	"battery/dumgen/package.json",
	"battery/dumdict/package.json",
	"app/tf-demo/convex/model/compiledRelationVerdict.ts",
	...compiledConsumers,
	"battery/dumdict/tests/internal/relations-entrypoint.test.ts",
	catalogSelector,
] as const;

export interface Variant {
	readonly id: string;
	readonly question: string;
	readonly tradeoff: string;
	apply(root: string): Promise<void>;
}

/** Resolve logical package names without depending on migration directory suffixes. */
export async function resolvePath(root: string, path: string) {
	const match = /^battery\/(dumling|dumrel|dumgen)(\/.*)$/.exec(path);
	if (!match) return path;
	for (const folder of await readdir(join(root, "battery"))) {
		const file = Bun.file(join(root, "battery", folder, "package.json"));
		if ((await file.exists()) && (await file.json()).name === match[1])
			return `battery/${folder}${match[2]}`;
	}
	throw new Error(`Cannot resolve package for ${path}`);
}

async function replace(root: string, path: string, from: string, to: string) {
	const file = join(root, await resolvePath(root, path));
	const source = await readFile(file, "utf8");
	if (!source.includes(from))
		throw new Error(`Experiment patch drift: ${path}`);
	await writeFile(file, source.replace(from, to));
}

// These are deliberately source transformations in an isolated checkout. They
// must never run against the user's checkout. The runner owns that isolation.
const literalDispatch = `
function experimentLiteralCompatible(
	constraint: Constraint,
	input: unknown,
	definitions: Readonly<Record<string, Constraint>>,
	seen = new Set<Constraint>(),
): boolean {
	if (seen.has(constraint)) return true;
	seen.add(constraint);
	if (constraint[0] === "ref") {
		const next = definitions[constraint[1]];
		return next === undefined || experimentLiteralCompatible(next, input, definitions, seen);
	}
	if (constraint[0] === "literal") return Object.is(constraint[1], input);
	if (constraint[0] !== "object" || input === null || typeof input !== "object" || Array.isArray(input)) return true;
	for (const [key, child] of Object.entries(constraint[1])) {
		const descriptor = Object.getOwnPropertyDescriptor(input, key);
		// Accessors, inherited fields and missing fields retain the reference path.
		if (descriptor && "value" in descriptor && !experimentLiteralCompatible(child, descriptor.value, definitions, new Set(seen))) return false;
	}
	return true;
}
`;

const plannedDispatch = `
type ExperimentLiteralCheck = { path: string[]; value: unknown };
const experimentPlans = new WeakMap<readonly Constraint[], WeakMap<object, readonly (readonly ExperimentLiteralCheck[])[]>>();
function experimentCollectChecks(
	constraint: Constraint,
	definitions: Readonly<Record<string, Constraint>>,
	path: string[] = [],
	seen = new Set<Constraint>(),
): ExperimentLiteralCheck[] {
	if (seen.has(constraint)) return [];
	seen.add(constraint);
	if (constraint[0] === "ref") {
		const next = definitions[constraint[1]];
		return next === undefined ? [] : experimentCollectChecks(next, definitions, path, seen);
	}
	if (constraint[0] === "literal") return [{ path, value: constraint[1] }];
	if (constraint[0] !== "object") return [];
	return Object.entries(constraint[1]).flatMap(([key, child]) => experimentCollectChecks(child, definitions, [...path, key], new Set(seen)));
}
function experimentOptions(options: readonly Constraint[], input: unknown, definitions: Readonly<Record<string, Constraint>>) {
	let byDefinitions = experimentPlans.get(options);
	if (!byDefinitions) { byDefinitions = new WeakMap(); experimentPlans.set(options, byDefinitions); }
	let plan = byDefinitions.get(definitions);
	if (!plan) { plan = options.map(option => experimentCollectChecks(option, definitions)); byDefinitions.set(definitions, plan); }
	return options.filter((_, index) => plan[index]?.every(check => {
		let value = input;
		for (const field of check.path) {
			if (value === null || typeof value !== "object") return true;
			const descriptor = Object.getOwnPropertyDescriptor(value, field);
			if (!descriptor || !("value" in descriptor)) return true;
			value = descriptor.value;
		}
		return Object.is(value, check.value);
	}));
}
`;

async function dispatch(root: string, cached: boolean) {
	const path = changedPaths[0];
	await replace(
		root,
		path,
		"function parseUnion(",
		`${cached ? plannedDispatch : literalDispatch}\nfunction parseUnion(`,
	);
	await replace(
		root,
		path,
		"\tconst nonAborted: ParseFailure[] = [];",
		`
	// Successful fast paths preserve option order and still execute full validation.
	// Failure always reruns the original algorithm for exact issue structure/order.
	const candidates = ${cached ? "experimentOptions(options, input, definitions)" : "options.filter(option => experimentLiteralCompatible(option, input, definitions))"};
	for (const option of candidates) {
		const parsed = parseConstraint(option, input, [], definitions, operations);
		if (parsed.ok) return parsed;
	}
	const nonAborted: ParseFailure[] = [];`,
	);
}

async function sharedChunks(root: string) {
	for (const path of [changedPaths[1], changedPaths[2]]) {
		const file = join(root, await resolvePath(root, path));
		const manifest = JSON.parse(await readFile(file, "utf8"));
		const script: string = manifest.scripts["build:js"];
		if (!script.includes("--bundle"))
			throw new Error(`Missing bundle script: ${path}`);
		manifest.scripts["build:js"] = script.replace(
			"--bundle",
			"--bundle --splitting",
		);
		await writeFile(file, `${JSON.stringify(manifest, null, "\t")}\n`);
	}
}

async function sourceOnce(root: string) {
	const path = changedPaths[3];
	await replace(
		root,
		path,
		"\tconst knowledge = parseKnowledgeShape(input.knowledge);",
		`\treturn parseKnowledgeForValidatedSource({ source, knowledge: input.knowledge });
}

/** Experiment-only internal seam: the enclosing operation already validated source. */
export function parseKnowledgeForValidatedSource<const R extends Dumling.Reading>(input: {
	source: R;
	knowledge: unknown;
}) {
	const source = input.source;
	const knowledge = parseKnowledgeShape(input.knowledge);`,
	);
	const file = join(root, await resolvePath(root, changedPaths[4]));
	const source = await readFile(file, "utf8");
	if (!source.includes("parseReadingKnowledge"))
		throw new Error("Missing Knowledge parser");
	await writeFile(
		file,
		source.replaceAll(
			"parseReadingKnowledge",
			"parseKnowledgeForValidatedSource",
		),
	);
}

async function externalRuntime(root: string) {
	for (const path of [changedPaths[2], ...changedPaths.slice(5, 8)]) {
		const file = join(root, await resolvePath(root, path));
		const manifest = JSON.parse(await readFile(file, "utf8"));
		const script: string = manifest.scripts["build:js"];
		if (!script.includes("--bundle"))
			throw new Error(`Missing bundle script: ${path}`);
		manifest.scripts["build:js"] = script.replace(
			"--bundle",
			"--bundle --external:common-utils --external:dumling --external:dumrel",
		);
		await writeFile(file, `${JSON.stringify(manifest, null, "\t")}\n`);
	}
}

export const variants: readonly Variant[] = [
	{
		id: "linked-rules",
		question:
			"Can a compiler link pass eliminate duplicate rules across Dumling, Dumrel, and Dumgen without changing validation?",
		tradeoff:
			"Experimental compiled-artifact subpaths, split bundles, and exact provider fingerprints. No parser delegation or duplicate fallback. Recursive graphs are linked by ordered graph equivalence.",
		apply: async (root) => {
			await externalRuntime(root);
			await applyLinkedRules(root);
		},
	},
	{
		id: "required-rule-groups",
		question:
			"What does decoding only the requested Dumgen validation root and its shared rules save?",
		tradeoff:
			"Synchronous decoding; encoded strings still ship upfront. Same explicit dependency externalization as the reference.",
		apply: async (root) => {
			await externalRuntime(root);
			await applyRuleReuse(root, false);
		},
	},
	{
		id: "required-rules-and-reuse",
		question:
			"Can successful unit validation reuse equivalent Dumling validators while preserving exact invalid-input diagnostics?",
		tradeoff:
			"Build-time structural equivalence proof; plain-data successful paths delegate to Dumling. Original rules remain as an exact-error fallback.",
		apply: async (root) => {
			await externalRuntime(root);
			await applyRuleReuse(root, true);
		},
	},
	{
		id: "catalog-lazy",
		question:
			"What does initializing only the requested authored catalog group save?",
		tradeoff:
			"Synchronous per-Kind module initialization; code still ships upfront. Same explicit externalization as the reference.",
		apply: async (root) => {
			await externalRuntime(root);
			await applyCatalogSplitting(root);
		},
	},
	{
		id: "catalog-and-registries",
		question:
			"Do lazy catalog groups and operation registries complement one another?",
		tradeoff:
			"Same synchronous public interfaces, two independently deferred data sources.",
		apply: async (root) => {
			await externalRuntime(root);
			await applyOperationSplitting(root, true);
			await applyCatalogSplitting(root);
		},
	},
	{
		id: "baseline",
		question:
			"What does the current implementation cost under the same workload?",
		tradeoff:
			"Reference behavior; existing RSS caps are reported, not silently changed.",
		apply: async () => {},
	},
	{
		id: "literal-dispatch",
		question:
			"Can provably mismatched literal branches be skipped on successful inputs?",
		tradeoff:
			"Computes routing evidence per call; failed inputs retain the reference diagnostic algorithm.",
		apply: (root) => dispatch(root, false),
	},
	{
		id: "planned-dispatch",
		question:
			"Does compiling literal tests once improve throughput enough to justify retained plans?",
		tradeoff:
			"Weak caches retain plans while artifacts are alive; artifact mutation is explicitly stress-tested.",
		apply: (root) => dispatch(root, true),
	},
	{
		id: "shared-chunks",
		question:
			"Can build-time sharing remove duplicated validators and Unicode helpers?",
		tradeoff:
			"More ESM chunks and imports; the schema-isolation and published-package gates must still pass.",
		apply: sharedChunks,
	},
	{
		id: "source-once",
		question:
			"Does a private validated-source seam avoid repeated work without changing callers?",
		tradeoff:
			"One internal function carries the validated-source precondition; public operations still validate unknown inputs.",
		apply: sourceOnce,
	},
	{
		id: "external-runtime",
		question:
			"Can explicit package externalization preserve shared runtime identities and avoid duplicate bundled implementations?",
		tradeoff:
			"Uses declared workspace/package dependencies at runtime; fresh installation and isolated published failure paths must pass.",
		apply: externalRuntime,
	},
	{
		id: "aot-validators",
		question:
			"Does ahead-of-time JavaScript validation reduce interpretation costs while preserving exact semantics?",
		tradeoff:
			"Direct node calls and unrolled object/union checks replace three internal registries; more generated code may cost memory. Compare with external-runtime, which shares the same packaging correction.",
		apply: async (root) => {
			await externalRuntime(root);
			await applyCompilation(root, resolvePath);
		},
	},
	{
		id: "operation-split-dumgen",
		question:
			"How much does lazy operation-level registry materialization save in Dumgen alone?",
		tradeoff:
			"Public parsers stay synchronous; encoded strings remain bundled. Compare against external-runtime with the same packaging correction.",
		apply: async (root) => {
			await externalRuntime(root);
			await applyOperationSplitting(root, false);
		},
	},
	{
		id: "operation-split-chain",
		question:
			"Does participation by Dumling and Dumrel improve lazy registry materialization across the chain?",
		tradeoff:
			"Each package owns its private operation groups and shared definitions. No public raw-artifact API or new async parser contract.",
		apply: async (root) => {
			await externalRuntime(root);
			await applyOperationSplitting(root, true);
		},
	},
];
