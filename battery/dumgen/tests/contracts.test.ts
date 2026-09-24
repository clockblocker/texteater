import { expect, test } from "bun:test";
import { createDumgen, validateEncounter } from "dumgen";
import { getExperiment } from "dumgen/development";
import { comparisonInputSchema } from "dumgen/schemas";
import { Effect } from "effect";
import { authoredMembers } from "../src/concrete-lang/de/authored-closed-sets/inventory.js";
import pronounCases from "../src/concrete-lang/de/grammatical-resolution/lexeme/pronoun/corpus.json";
import { grammarSchemas } from "../src/generated/schemas.js";
import { grammarFixture } from "../src/testing.js";

// Expected identities come from the reviewed catalog, independently of each
// corpus answer. Replaying an answer alone only proves schema compatibility.
const reviewedCases = [
	["fixed-jemand-jemand", "jemand", "Nom", "Ind", null, null],
	["fixed-jemand-jemanden", "jemanden", "Acc", "Ind", null, null],
	["fixed-jemand-jemandem", "jemandem", "Dat", "Ind", null, null],
	["fixed-niemand-niemand", "niemand", "Nom", "Neg", null, null],
	["fixed-niemand-niemanden", "niemanden", "Acc", "Neg", null, null],
	["fixed-niemand-niemandem", "niemandem", "Dat", "Neg", null, null],
	["dev-indefinite-jemandem", "jemandem", "Dat", "Ind", null, null],
	["dev-negative-niemanden", "niemanden", "Acc", "Neg", null, null],
	["accept-v4-negative-niemanden-acc", "niemanden", "Acc", "Neg", null, null],
	["dev-demonstrative-das-nom", "das", "Nom", "Dem", "Neut", null],
	["dev-relative-die-nom", "die", "Nom", "Rel", "Fem", null],
	["accept-v4-demonstrative-die-nom-plur", "die", "Nom", "Dem", null, null],
	["accept-v4-relative-dem-dat-neut", "dem", "Dat", "Rel", "Neut", null],
	["fixed-sein-masc", "seiner", "Nom", "Prs", "Masc", "Masc"],
	["fixed-sein-neut", "seines", "Nom", "Prs", "Neut", "Neut"],
	["fixed-wer", "wer", "Nom", "Int", null, null],
	["fixed-wen", "wen", "Acc", "Int", null, null],
	["fixed-wem", "wem", "Dat", "Int", null, null],
	["fixed-wessen", "wessen", "Gen", "Int", null, null],
	["dev-interrogative-wer-nom", "wer", "Nom", "Int", null, null],
	["accept-v4-interrogative-wem-dat", "wem", "Dat", "Int", null, null],
] as const;

test("pronoun grammar answers hand off to the exact reviewed Reading without generation", async () => {
	const experiment = getExperiment(
		"grammatical-resolution/de/lexeme/pronoun",
	);
	const demos = experiment.source.demonstrations;
	if (!demos || !("ids" in demos))
		throw Error("Missing pronoun demonstrations");
	expect(demos.ids).toContain("grammar-de-pron-fixed-jemand-jemandem");
	for (const [
		suffix,
		form,
		grammaticalCase,
		pronType,
		gender,
		possessorGender,
	] of reviewedCases) {
		const id = `grammar-de-pron-${suffix}` as keyof typeof pronounCases;
		const golden = pronounCases[id];
		const matches = authoredMembers.filter(
			({ lemma }) =>
				lemma.kind === "PRON" &&
				lemma.canonicalForm === form &&
				lemma.coreFeatures.extPos === null &&
				lemma.coreFeatures.case === grammaticalCase &&
				lemma.coreFeatures.pronType === pronType &&
				lemma.coreFeatures.gender === gender &&
				lemma.coreFeatures["gender[psor]"] === possessorGender,
		);
		expect(matches, id).toHaveLength(1);
		const expected = matches[0];
		if (!expected) throw Error(`Missing reviewed identity: ${id}`);
		const segments = golden.input.markedContext
			.split(/(<TARGET>.*?<\/TARGET>)/gu)
			.filter(Boolean)
			.map((text) =>
				text.startsWith("<TARGET>")
					? { kind: "ResolvableText", text: text.slice(8, -9) }
					: { kind: "OpaqueText", text },
			);
		const encounter = validateEncounter({
			sentence: { id, language: "de", segments },
			target: {
				family: "Lexeme",
				kind: "PRON",
				memberSegmentIndices: [
					segments.findIndex((s) => s.kind === "ResolvableText"),
				],
			},
		});
		const calls: string[] = [];
		const dumgen = createDumgen({
			...grammarFixture(golden.idealOutput),
			onModelExchange: (exchange) => calls.push(exchange.request.stage),
		});
		const attestation = await Effect.runPromise(
			dumgen.resolveGrammar(encounter),
		);
		expect(attestation.surface.lemma, id).toEqual(expected.lemma);
		const input = comparisonInputSchema.parse({
			candidates: [],
			encounter,
			lemma: attestation.surface.lemma,
		});
		expect(
			await Effect.runPromise(
				dumgen.resolveOrGenerateReadingEmojiDescription(input),
			),
			id,
		).toEqual({
			decision: "New",
			emojiDescription: expected.reading.emojiDescription,
		});
		expect(
			await Effect.runPromise(
				dumgen.resolveOrGenerateReadingEmojiDescription({
					...input,
					candidates: [expected.reading.emojiDescription],
				}),
			),
			id,
		).toEqual({
			decision: "Reuse",
			emojiDescription: expected.reading.emojiDescription,
		});
		expect(calls, id).toEqual(["resolveGrammar"]);
	}
});

test("pronoun answers preserve case-bearing forms and isolate Surface reflexivity", () => {
	for (const [id, golden] of Object.entries(pronounCases)) {
		if ("decision" in golden.idealOutput) {
			expect(golden.idealOutput.decision, id).toBe("Unresolved");
			continue;
		}
		const answer = grammarSchemas["de/Lexeme/PRON"].parse(
			golden.idealOutput,
		);
		if (
			answer.lemma.coreFeatures.case !== null &&
			answer.surface.spelling === "Canonical"
		)
			expect(answer.lemma.canonicalForm, id).toBe(
				answer.normalizedMembers.join(" "),
			);
		expect(
			answer.surface.inflectionalFeatures === null
				? []
				: Object.keys(answer.surface.inflectionalFeatures),
			id,
		).toEqual(
			answer.surface.inflectionalFeatures === null ? [] : ["reflex"],
		);
	}
});

test("alternate accusative jemand retains the reviewed jemanden identity", async () => {
	const golden =
		pronounCases["grammar-de-pron-fixed-jemand-jemanden"].idealOutput;
	const answer = {
		...golden,
		normalizedMembers: ["jemand"],
		surface: { ...golden.surface, spelling: "Variant" },
	};
	const encounter = {
		sentence: {
			id: "alternate-accusative",
			language: "de",
			segments: [
				{ kind: "OpaqueText", text: "Ich sehe " },
				{ kind: "ResolvableText", text: "jemand" },
				{ kind: "OpaqueText", text: "." },
			],
		},
		target: { family: "Lexeme", kind: "PRON", memberSegmentIndices: [1] },
	} as const;
	let calls = 0;
	const dumgen = createDumgen({
		...grammarFixture(answer),
		onModelExchange: () => calls++,
	});
	const attestation = await Effect.runPromise(
		dumgen.resolveGrammar(encounter),
	);
	expect(attestation.members[0]?.attested).toBe("jemand");
	expect(attestation.surface.spelling).toBe("Variant");
	expect(attestation.surface.lemma.canonicalForm).toBe("jemanden");
	expect(
		await Effect.runPromise(
			dumgen.resolveOrGenerateReadingEmojiDescription(
				comparisonInputSchema.parse({
					candidates: [],
					encounter,
					lemma: attestation.surface.lemma,
				}),
			),
		),
	).toEqual({ decision: "New", emojiDescription: "👤" });
	expect(calls).toBe(1);
});
