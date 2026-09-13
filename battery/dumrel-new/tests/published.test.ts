import { afterAll, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import { closeTestingSessions, inferredType } from "prinfer/testing";

afterAll(closeTestingSessions);
const consumer = new URL("./consumer/types.ts", import.meta.url);

test("published schema composition retains the structured Knowledge types", async () => {
	const schemas = new URL("./schema-consumer/schemas.ts", import.meta.url);
	expect(
		await inferredType(schemas, {
			name: "DefinitionModel",
			full: true,
			backend: "typescript7",
		}),
	).toBe("type DefinitionModel = { definition?: string | undefined; }");
	expect(
		await inferredType(schemas, {
			name: "ReadingFamily",
			full: true,
			backend: "typescript7",
		}),
	).toBe('type ReadingFamily = "Morpheme"');
	expect(
		await inferredType(schemas, {
			name: "BreakdownFamily",
			full: true,
			backend: "typescript7",
		}),
	).toBe('type BreakdownFamily = "Lexeme"');
}, 30_000);

test("published operations infer the source Family without narrowing the target Kind", async () => {
	for (const name of ["ParsedTargetFamily", "ChangedTargetFamily"]) {
		expect(
			await inferredType(consumer, {
				name,
				full: true,
				backend: "typescript7",
			}),
		).toBe(`type ${name} = "Lexeme"`);
	}
	expect(
		await inferredType(consumer, {
			name: "RelatedProperNoun",
			full: true,
			backend: "typescript7",
		}),
	).toBe(
		'type RelatedProperNoun = { unitKind: "Lemma"; language: "de"; family: "Lexeme"; kind: "PROPN"; canonicalForm: string; coreFeatures: { abbr: "Yes" | null; foreign: "Yes" | null; gender: "Fem" | "Masc" | "Neut" | null; }; }',
	);
}, 30_000);

test("recursive Reading leaves retain their grammatical coordinates and features", async () => {
	expect(
		await inferredType(consumer, {
			name: "PrefixCoordinates",
			full: true,
			backend: "typescript7",
		}),
	).toBe(
		'type PrefixCoordinates = { language: "de"; family: "Morpheme"; kind: "Prefix"; }',
	);
	expect(
		await inferredType(consumer, {
			name: "PrefixFeature",
			full: true,
			backend: "typescript7",
		}),
	).toBe("type PrefixFeature = string | null");
}, 30_000);

test("recursive Reading leaves can be consumed as Dumling Readings", async () => {
	expect(
		await inferredType(consumer, {
			name: "MorphemeReadingCompatible",
			full: true,
			backend: "typescript7",
		}),
	).toBe("type MorphemeReadingCompatible = true");
}, 30_000);

test("Lexical Breakdown inference admits only Lexeme shadows", async () => {
	expect(
		await inferredType(consumer, {
			name: "BreakdownFamily",
			full: true,
			backend: "typescript7",
		}),
	).toBe('type BreakdownFamily = "Lexeme"');
}, 30_000);

test("source-specific retractions have no inferred value branch", async () => {
	expect(
		await inferredType(consumer, {
			name: "RetractionCarriesValue",
			full: true,
			backend: "typescript7",
		}),
	).toBe("type RetractionCarriesValue = false");
}, 30_000);

test("published operational and type imports exclude the authoring declaration graph", async () => {
	const child = Bun.spawn(
		[
			process.execPath,
			fileURLToPath(
				new URL(
					"../../../node_modules/typescript/bin/tsc",
					import.meta.url,
				),
			),
			"-p",
			fileURLToPath(new URL("./consumer/tsconfig.json", import.meta.url)),
			"--listFiles",
		],
		{ stdout: "pipe", stderr: "pipe" },
	);
	const [output, error, exit] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	expect(exit, output + error).toBe(0);
	expect(
		output
			.split("\n")
			.filter((path) => /\/zod\/|\/schemas[/.]|\/codegen\//.test(path)),
	).toEqual([]);
}, 30_000);
