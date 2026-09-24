import { expect, test } from "bun:test";
import { Effect } from "effect";
import { createDumgen } from "../src/universal/dumgen.js";
import { validateEncounter } from "../src/universal/validation.js";
import { grammarFixture } from "./grammar-fixture.js";

const encounter = validateEncounter({
	sentence: {
		id: "known-noun",
		language: "de",
		segments: [
			{ kind: "ResolvableText", text: "der" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "Aufstieg" },
		],
	},
	target: { family: "Lexeme", kind: "NOUN", memberSegmentIndices: [0, 2] },
});
const expected = {
	lemma: {
		canonicalForm: "Aufstieg",
		coreFeatures: { gender: "Masc", hyph: null },
	},
	surface: {
		spelling: "Canonical",
		surfaceFeatures: null,
		inflectionalFeatures: {
			article: "Definite",
			case: "Nom",
			number: "Sing",
		},
	},
	normalizedMembers: ["der", "Aufstieg"],
	memberOrthographies: ["Standard", "Standard"],
	realizationCoverage: "Full",
	articleEvidence: { attested: "der", orthography: "Standard" },
};
test("article+noun selects the supplied headword without text generation", async () => {
	const output = await Effect.runPromise(
		createDumgen({
			...grammarFixture(expected),
			execute: async () => {
				throw Error(
					"An available headword must not require generation",
				);
			},
		}).resolveGrammar(encounter),
	);
	expect(output.surface.lemma.canonicalForm).toBe("Aufstieg");
	expect(output.surface.normalizedSurface).toBe("der Aufstieg");
	expect(output.members.map((member) => member.attested)).toEqual([
		"der",
		"Aufstieg",
	]);
});

test("an inflected noun can select a stored headword without generating text", async () => {
	const inflected = validateEncounter({
		...encounter,
		sentence: {
			...encounter.sentence,
			segments: [
				{ kind: "ResolvableText", text: "den" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "Aufstiegen" },
			],
		},
	});
	const fixture = {
		...expected,
		normalizedMembers: ["den", "Aufstiegen"],
		articleEvidence: { attested: "den", orthography: "Standard" },
		surface: {
			...expected.surface,
			inflectionalFeatures: {
				article: "Definite",
				case: "Dat",
				number: "Plur",
			},
		},
	};
	const output = await Effect.runPromise(
		createDumgen({
			...grammarFixture(fixture),
			execute: async () => {
				throw Error("Stored headword should be selected");
			},
		}).resolveGrammar(inflected, [
			{
				lemma: {
					unitKind: "Lemma",
					language: "de",
					family: "Lexeme",
					kind: "NOUN",
					...expected.lemma,
					coreFeatures: { gender: "Masc", hyph: null },
				},
				foundUnder: ["den Aufstiegen"],
			},
		]),
	);
	expect(output.surface.lemma.canonicalForm).toBe("Aufstieg");
	expect(output.surface.normalizedSurface).toBe("den Aufstiegen");
});

test("uncertain headword selection never falls through to generation", async () => {
	let generated = false;
	const result = await Effect.runPromise(
		Effect.either(
			createDumgen({
				...grammarFixture(expected, { canonical: "Unresolved" }),
				execute: async () => {
					generated = true;
					return { output: { canonicalForm: "Aufstieg" } };
				},
			}).resolveGrammar(encounter),
		),
	);
	expect(result).toMatchObject({
		_tag: "Left",
		left: { _tag: "Unresolved" },
	});
	expect(generated).toBe(false);
});

test("missing headword text still generates and its trace preserves the actual request", async () => {
	const traces: import("../src/types.js").OperationTrace[] = [];
	const inflected = validateEncounter({
		...encounter,
		sentence: {
			...encounter.sentence,
			segments: [
				{ kind: "ResolvableText", text: "den" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "Aufstiegen" },
			],
		},
	});
	const fixture = {
		...expected,
		normalizedMembers: ["den", "Aufstiegen"],
		articleEvidence: { attested: "den", orthography: "Standard" },
		surface: {
			...expected.surface,
			inflectionalFeatures: {
				article: "Definite",
				case: "Dat",
				number: "Plur",
			},
		},
	};
	const output = await Effect.runPromise(
		createDumgen({
			...grammarFixture(fixture),
			onOperation: (trace) => traces.push(trace),
		}).resolveGrammar(inflected),
	);
	expect(output.surface.lemma.canonicalForm).toBe("Aufstieg");
	expect(
		"inflectionalFeatures" in output.surface
			? output.surface.inflectionalFeatures
			: null,
	).toMatchObject({
		article: "Definite",
		case: "Dat",
	});
	const generation = traces[0]?.calls.filter(
		(call) => call.executor === "Luna",
	);
	expect(generation).toHaveLength(1);
	expect(generation?.[0]?.request.input).toMatchObject({
		needed: { canonicalForm: expect.any(String) },
		judgedCore: expect.any(Object),
		canonicalFormPolicy: expect.any(String),
	});
	expect(generation?.[0]?.request.input).not.toHaveProperty("judgedSurface");
	expect(generation?.[0]?.request.input).not.toHaveProperty(
		"memberOrthographies",
	);
});
