import { expect, test } from "bun:test";
import { getExperiment } from "dumgen/development";
import { Effect } from "effect";
import { governablePrepositionLemma } from "../src/concrete-lang/de/governable-prepositions.js";
import { grammarFixture } from "../src/testing.js";
import { createDumgen } from "../src/universal/dumgen.js";
import { validateEncounter } from "../src/universal/validation.js";

// A governed preposition stays an Attestation member, named by index in the
// valency evidence, while the normalized Surface projects only Fixed members
// (ADR 0034). Every governor Kind takes it in: verbs, adjectives, nouns and
// Phrasemes.
const examples = [
	[
		"lexeme/verb",
		"VERB",
		"grammar-de-verb-governed-preposition-wartet",
		"wartet",
		1,
		"auf",
		"Acc",
	],
	[
		"lexeme/verb",
		"VERB",
		"grammar-de-verb-separable-imperative-aufpassen",
		"pass auf",
		1,
		"auf",
		"Acc",
	],
	[
		"lexeme/verb",
		"VERB",
		"grammar-de-verb-passive-wurde-gebeten",
		"wurde gebeten",
		1,
		"um",
		"Acc",
	],
	[
		"lexeme/adjective",
		"ADJ",
		"grammar-de-adj-governed-stolz-auf",
		"stolz",
		1,
		"auf",
		"Acc",
	],
	[
		"lexeme/adjective",
		"ADJ",
		"grammar-de-adj-governed-separated-auf-ihn",
		"stolz",
		0,
		"auf",
		"Acc",
	],
	[
		"lexeme/adjective",
		"ADJ",
		"grammar-de-adj-governed-attributive-stolze",
		"stolze",
		0,
		"auf",
		"Acc",
	],
	[
		"lexeme/noun",
		"NOUN",
		"grammar-de-noun-governed-angst-vor",
		"Angst",
		1,
		"vor",
		"Dat",
	],
	[
		"lexeme/noun",
		"NOUN",
		"grammar-de-noun-governed-article-angst-vor",
		"die Angst",
		2,
		"vor",
		"Dat",
	],
	[
		"phraseme/collocation",
		"Collocation",
		"grammar-de-coll-governed-bescheid-ueber",
		"weiß Bescheid",
		2,
		"über",
		"Acc",
	],
] as const;
for (const [
	route,
	kind,
	id,
	surface,
	member,
	preposition,
	governedCase,
] of examples)
	test(`${id}: the governed preposition is evidence, not Surface`, async () => {
		const golden = getExperiment(`grammatical-resolution/de/${route}`)
			.source.goldenCorpus?.cases[id];
		if (!golden) throw Error(`Missing ${id}`);
		const input = golden.input as {
			markedContext: string;
			members: string[];
		};
		const segments = input.markedContext
			.split(/(<TARGET>.*?<\/TARGET>)/gu)
			.filter(Boolean)
			.map((text) => ({
				kind: text.startsWith("<TARGET>")
					? "ResolvableText"
					: "OpaqueText",
				text: text.startsWith("<TARGET>") ? text.slice(8, -9) : text,
			}));
		const output = await Effect.runPromise(
			createDumgen(grammarFixture(golden.idealOutput)).resolveGrammar({
				...validateEncounter({
					sentence: { id, language: "de", segments },
					target: {
						family: kind === "Collocation" ? "Phraseme" : "Lexeme",
						kind,
						memberSegmentIndices: segments.flatMap(
							(segment, index) =>
								segment.kind === "ResolvableText"
									? [index]
									: [],
						),
					},
				}),
				contextAvailable: false,
			}),
		);
		expect(output.members.map((entry) => entry.attested)).toEqual(
			input.members,
		);
		expect(output.surface.normalizedSurface).toBe(surface);
		expect(output).toHaveProperty("valencyEvidence", [
			{
				member,
				complement: {
					kind: "Preposition",
					preposition: governablePrepositionLemma(preposition),
					case: governedCase,
					referent: expect.any(String),
				},
				realizedCase: governedCase,
			},
		]);
	});

/** The Segments of a corpus context, its marked members resolvable. */
function markedSegments(markedContext: string) {
	return markedContext
		.split(/(<TARGET>.*?<\/TARGET>)/gu)
		.filter(Boolean)
		.map((text) => ({
			kind: text.startsWith("<TARGET>")
				? ("ResolvableText" as const)
				: ("OpaqueText" as const),
			text: text.startsWith("<TARGET>") ? text.slice(8, -9) : text,
		}));
}

function resolveAdposition(id: string, overrides?: Record<string, string>) {
	const golden = getExperiment("grammatical-resolution/de/lexeme/adposition")
		.source.goldenCorpus?.cases[id];
	if (!golden) throw Error(`Missing ${id}`);
	const segments = markedSegments(
		(golden.input as { markedContext: string }).markedContext,
	);
	return Effect.runPromise(
		createDumgen(
			grammarFixture(golden.idealOutput, overrides),
		).resolveGrammar({
			...validateEncounter({
				sentence: { id, language: "de", segments },
				target: {
					family: "Lexeme",
					kind: "ADP",
					memberSegmentIndices: segments.flatMap((segment, index) =>
						segment.kind === "ResolvableText" ? [index] : [],
					),
				},
			}),
			contextAvailable: false,
		}),
	);
}

// A free ADP occurrence records the case its complement took; the Lemma
// carries no case (ADR 0034, #608).
const adpositions = [
	["grammar-de-adp-demo-two-way-auf", "auf", "Prep", "Dat"],
	["grammar-de-adp-dev-two-way-auf-acc", "auf", "Prep", "Acc"],
	["grammar-de-adp-dev-wegen-local-dat-lexical-gen", "wegen", "Prep", "Dat"],
	["grammar-de-adp-demo-post-entlang-acc", "entlang", "Post", "Acc"],
	["grammar-de-adp-dev-fused-in-dat", "in", "Prep", "Dat"],
] as const;
for (const [id, canonicalForm, adpType, realizedCase] of adpositions)
	test(`${id}: ${canonicalForm} records realizedCase ${realizedCase}`, async () => {
		const output = await resolveAdposition(id);
		if ("decision" in output) throw Error(String(output.decision));
		expect(output.surface.lemma.canonicalForm).toBe(canonicalForm);
		expect(output.surface.lemma.coreFeatures).toHaveProperty(
			"adpType",
			adpType,
		);
		expect(output.surface.lemma.coreFeatures).not.toHaveProperty(
			"governedCase",
		);
		expect(output).toHaveProperty("valencyEvidence", [
			{
				member: null,
				complement: {
					kind: "Case",
					case: realizedCase,
					referent: "Either",
				},
				realizedCase,
			},
		]);
	});

test("a one-case adposition keeps its table case whatever the judgement says", async () => {
	const output = await resolveAdposition("grammar-de-adp-demo-prep-mit-dat", {
		realizedCase: "Acc",
	});
	expect(output).toHaveProperty("valencyEvidence.0.realizedCase", "Dat");
});

test("an adposition with no nominal complement records no case", async () => {
	const output = await resolveAdposition(
		"grammar-de-adp-dev-extpos-sconj-anstatt",
	);
	expect(output).toHaveProperty("valencyEvidence", []);
});
