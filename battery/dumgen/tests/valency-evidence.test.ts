import { expect, test } from "bun:test";
import { getExperiment } from "dumgen/development";
import { Effect } from "effect";
import { governablePrepositionLemma } from "../src/concrete-lang/de/governable-prepositions.js";
import { grammarFixture } from "../src/testing.js";
import { createDumgen } from "../src/universal/dumgen.js";
import { validateEncounter } from "../src/universal/validation.js";

// A governed preposition stays an Attestation member, named by index in the
// valency evidence, while the normalized Surface projects only Fixed members
// (ADR 0034).
const examples = [
	["grammar-de-verb-governed-preposition-wartet", "wartet", 1, "auf"],
	["grammar-de-verb-separable-imperative-aufpassen", "pass auf", 1, "auf"],
	["grammar-de-verb-passive-wurde-gebeten", "wurde gebeten", 1, "um"],
] as const;
for (const [id, surface, member, preposition] of examples)
	test(`${id}: the governed preposition is evidence, not Surface`, async () => {
		const golden = getExperiment("grammatical-resolution/de/lexeme/verb")
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
						family: "Lexeme",
						kind: "VERB",
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
					case: "Acc",
					referent: expect.any(String),
				},
				realizedCase: "Acc",
			},
		]);
	});
