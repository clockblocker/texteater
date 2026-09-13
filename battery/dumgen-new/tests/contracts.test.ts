import { expect, test } from "bun:test";
import { createDumgen, validateEncounter } from "dumgen";
import { getExperiment, listExperiments } from "dumgen/development";
import { generationInputSchema } from "dumgen/schemas";
import { Effect } from "effect";
import { z } from "zod";
import { authoredMembers } from "../src/concrete-lang/de/authored/inventory.js";
import pronounCases from "../src/concrete-lang/de/grammatical-resolution/lexeme/pronoun/corpus.json";
import { grammarSchemas } from "../src/generated/schemas.js";

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
	const demos = experiment.promptSource.demonstrations;
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
			execute: async ({ stage }) => {
				calls.push(stage);
				if (stage !== "resolveGrammar")
					throw Error("Unexpected emoji generation");
				return golden.idealOutput;
			},
		});
		const attestation = await Effect.runPromise(
			dumgen.resolveGrammar(encounter),
		);
		expect(attestation.surface.lemma, id).toEqual(expected.lemma);
		const input = generationInputSchema.parse({
			encounter,
			lemma: attestation.surface.lemma,
		});
		expect(
			await Effect.runPromise(
				dumgen.generateReadingEmojiDescription(input),
			),
			id,
		).toBe(expected.reading.emojiDescription);
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

test("production prompt prose matches response schemas without legacy serialization instructions", () => {
	for (const spec of listExperiments().filter((item) =>
		item.id.startsWith("grammatical-resolution/"),
	)) {
		const { body, outputSchema } = getExperiment(spec.id).promptSource;
		const schema = z.toJSONSchema(outputSchema);
		const resolved = schema.anyOf?.find(
			(branch) => branch.properties?.lemma,
		);
		if (!resolved) throw Error(`Missing resolved contract: ${spec.id}`);
		expect(resolved.required?.toSorted(), spec.id).toEqual([
			"lemma",
			"memberOrthographies",
			"normalizedMembers",
			"realizationCoverage",
			"surface",
		]);
		const surface = resolved.properties?.surface;
		const surfaceFields =
			typeof surface === "object" ? surface.required : undefined;
		if (!surfaceFields) throw Error(`Missing Surface contract: ${spec.id}`);
		const declaredSurface = body.match(
			/surface contains exactly ([^.]+)\./,
		)?.[1];
		if (!declaredSurface)
			throw Error(`Missing Surface instructions: ${spec.id}`);
		const proseFields = declaredSurface
			.split(/,? and |, /)
			.map((field) => field.trim())
			.toSorted();
		expect(proseFields, spec.id).toEqual(surfaceFields.toSorted());
		expect(body.match(/<output_contract>/g), spec.id).toHaveLength(1);
		for (const field of [
			"memberOrthographies",
			"normalizedMembers",
			"surface",
			"lemma",
			"realizationCoverage",
		])
			expect(body, spec.id).toContain(field);
		expect(body, spec.id).not.toMatch(
			/\bCitation(?:Surface)?\b|\bInflection(?:Surface)?\b|surfaceKind|referenceGender/,
		);
		expect(body, spec.id).not.toMatch(
			/(?:Never|Do not) return[^.]*realizationCoverage/i,
		);
		expect(body, spec.id).not.toMatch(
			/(?:application|app) (?:injects|supplies|owns)[^.]*realization.?coverage/i,
		);
	}
	const { body } = getExperiment(
		"grammatical-resolution/de/lexeme/pronoun",
	).promptSource;
	expect(body).toContain("gender[psor] belong in lemma.coreFeatures");
	expect(body).toContain(
		'the only Inflectional Feature: use { reflex: "Yes" }',
	);
	for (const id of ["reading-generation/de", "reading-resolution/de"]) {
		const source = getExperiment(id).promptSource;
		expect(source.body).toContain(
			'Return exactly { "emojiDescription": string }',
		);
		expect(z.toJSONSchema(source.outputSchema).required).toEqual([
			"emojiDescription",
		]);
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
		execute: async () => {
			if (++calls > 1) throw Error("Unexpected emoji generation");
			return answer;
		},
	});
	const attestation = await Effect.runPromise(
		dumgen.resolveGrammar(encounter),
	);
	expect(attestation.members[0]?.attested).toBe("jemand");
	expect(attestation.surface.spelling).toBe("Variant");
	expect(attestation.surface.lemma.canonicalForm).toBe("jemanden");
	expect(
		await Effect.runPromise(
			dumgen.generateReadingEmojiDescription(
				generationInputSchema.parse({
					encounter,
					lemma: attestation.surface.lemma,
				}),
			),
		),
	).toBe("👤");
	expect(calls).toBe(1);
});
