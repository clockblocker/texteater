import { expect, test } from "bun:test";
import { Effect } from "effect";
import verbCases from "../src/concrete-lang/de/grammatical-resolution/lexeme/verb/corpus.json";
import review from "../src/evaluation/redesign/review-cases.json";
import type { OperationTrace } from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";
import { validateEncounter } from "../src/universal/validation.js";
import { grammarFixture } from "./grammar-fixture.js";

for (const example of review.constructions)
	test(`${example.id}: complete scoped grammar and independent supplied targets`, async () => {
		for (const target of example.targets) {
			const segments = example.sourceSentence
				.match(/\s+|[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu)!
				.map((text) => ({
					text,
					kind: /^\s+$/u.test(text)
						? "Whitespace"
						: /^[\p{L}\p{N}]+$/u.test(text)
							? "ResolvableText"
							: "Punctuation",
				}));
			let cursor = -1;
			const members = target.members.map((text) => {
				cursor = segments.findIndex(
					(segment, index) => index > cursor && segment.text === text,
				);
				return cursor;
			});
			const encounter = validateEncounter({
				sentence: { id: example.id, language: "de", segments },
				target: {
					family: "Lexeme",
					kind: target.kind,
					memberSegmentIndices: members,
				},
			});
			const features = {
				verbForm: target.form,
				tense: target.finiteTense,
				mood: target.form === "Fin" ? "Ind" : null,
				person: target.form === "Fin" ? "3" : null,
				number: target.form === "Fin" ? "Sing" : null,
				perfect: target.perfect ? "Yes" : null,
				future: target.future ? "Yes" : null,
				voice: target.passive ? "Pass" : null,
				passive: target.passive,
			};
			const golden = {
				lemma: {
					canonicalForm: target.canonicalForm,
					coreFeatures:
						target.kind === "AUX"
							? { verbType: "Mod" }
							: {
									hasGovPrep: null,
									hasSepPrefix: null,
									lexicallyReflexive: null,
									verbType: null,
								},
				},
				surface: {
					spelling: "Canonical",
					surfaceFeatures: null,
					inflectionalFeatures: features,
				},
				memberOrthographies: target.members.map(() => "Standard"),
				normalizedMembers: target.members,
				realizationCoverage: "Full",
			};
			const traces: OperationTrace[] = [];
			const options = grammarFixture(
				golden,
				target.form === "Inf"
					? {
							"surface.inflectionalFeatures.tense": "Unresolved",
							"surface.inflectionalFeatures.person": "Unresolved",
							"surface.inflectionalFeatures.number": "Unresolved",
							"surface.inflectionalFeatures.mood": "Unresolved",
						}
					: {},
			);
			const output = await Effect.runPromise(
				createDumgen({
					...options,
					onOperation: (trace) => traces.push(trace),
				}).resolveGrammar(encounter),
			);
			expect(output.surface).toHaveProperty(
				"inflectionalFeatures",
				features,
			);
			expect(output.surface.lemma.canonicalForm).toBe(
				target.canonicalForm,
			);
			expect(output.realizationCoverage).toBe("Full");
			expect(output.members.map((member) => member.attested)).toEqual(
				target.members,
			);
			expect(traces[0]?.calls[0]?.request.route).toEndWith("/features");
			expect(
				traces[0]?.calls.filter((call) => call.executor === "TypeSafe"),
			).toHaveLength(1);
			if (
				target.kind === "AUX" ||
				target.members.includes(target.canonicalForm)
			)
				expect(traces[0]?.calls).toHaveLength(1);
		}
	});
test("incompatible applicable features stop before missing-text generation", async () => {
	const traces: OperationTrace[] = [];
	const expected = verbCases["grammar-de-verb-finite-liest"].idealOutput;
	const options = grammarFixture(expected, {
		"surface.inflectionalFeatures.mood": "Unresolved",
	});
	const result = await Effect.runPromise(
		Effect.either(
			createDumgen({
				...options,
				onOperation: (trace) => traces.push(trace),
			}).resolveGrammar(
				validateEncounter({
					sentence: {
						id: "invalid",
						language: "de",
						segments: [{ kind: "ResolvableText", text: "liest" }],
					},
					target: {
						family: "Lexeme",
						kind: "VERB",
						memberSegmentIndices: [0],
					},
				}),
			),
		),
	);
	expect(result).toMatchObject({
		_tag: "Left",
		left: { _tag: "Unresolved" },
	});
	expect(traces[0]?.calls).toHaveLength(1);
});

test("AUX catalog absence and uncertainty remain distinct and never invoke Luna", async () => {
	const encounter = validateEncounter({
		sentence: {
			id: "aux",
			language: "de",
			segments: [{ kind: "ResolvableText", text: "muss" }],
		},
		target: { family: "Lexeme", kind: "AUX", memberSegmentIndices: [0] },
	});
	const output = {
		lemma: { canonicalForm: "müssen", coreFeatures: { verbType: "Mod" } },
		surface: {
			spelling: "Canonical",
			surfaceFeatures: null,
			inflectionalFeatures: {
				verbForm: "Fin",
				tense: "Pres",
				mood: "Ind",
				person: "3",
				number: "Sing",
				perfect: null,
				future: null,
				passive: null,
				voice: null,
			},
		},
		memberOrthographies: ["Standard"],
		normalizedMembers: ["muss"],
		realizationCoverage: "Full",
	};
	for (const [identity, expected] of [
		["NoMatch", "CatalogMiss"],
		["Unresolved", "Unresolved"],
	]) {
		const options = grammarFixture(output, { identity: identity! });
		const traces: OperationTrace[] = [];
		const result = await Effect.runPromise(
			Effect.either(
				createDumgen({
					...options,
					execute: async () => {
						throw Error("Must not generate");
					},
					onOperation: (trace) => traces.push(trace),
				}).resolveGrammar(encounter),
			),
		);
		expect(result).toMatchObject({
			_tag: "Left",
			left: { _tag: expected },
		});
		expect(traces[0]?.calls).toHaveLength(1);
	}
});
