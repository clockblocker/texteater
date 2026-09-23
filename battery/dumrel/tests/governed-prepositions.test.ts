import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import {
	applyKnowledgeChange,
	parseReadingKnowledge,
	projectPrepositionalGovernment,
	selectKnowledge,
} from "dumrel";
import { governmentProjectionSchema } from "dumrel/schema";
import {
	aufLemma,
	fuerLemma,
	houseLemma,
	houseReading,
	wartenReading,
} from "./fixtures.js";

const aufAcc = { preposition: aufLemma, case: "Acc" } as const;
const aufDat = { preposition: aufLemma, case: "Dat" } as const;

test("a two-way preposition takes the construction's case", () => {
	const parsed = parseReadingKnowledge({
		source: wartenReading,
		knowledge: { governedPrepositions: [aufAcc] },
	});
	expect(parsed).toEqual({
		success: true,
		value: { governedPrepositions: [aufAcc] },
	});
});

test("a fixed-case preposition rejects another case", () => {
	const parsed = parseReadingKnowledge({
		source: wartenReading,
		knowledge: {
			governedPrepositions: [{ preposition: fuerLemma, case: "Dat" }],
		},
	});
	expect(parsed.success).toBe(false);
	if (!parsed.success)
		expect(parsed.error.issues[0]?.path).toEqual([
			"knowledge",
			"governedPrepositions",
			0,
			"case",
		]);
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: {
				governedPrepositions: [{ preposition: fuerLemma, case: "Acc" }],
			},
		}).success,
	).toBe(true);
});

test("only an ADP Lemma of the source Language can be governed", () => {
	for (const preposition of [
		houseLemma,
		{ ...aufLemma, language: "en" },
	] as unknown[])
		expect(
			parseReadingKnowledge({
				source: wartenReading,
				knowledge: {
					governedPrepositions: [{ preposition, case: "Acc" }],
				},
			}).success,
		).toBe(false);
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: {
				governedPrepositions: [{ preposition: aufLemma, case: "Nom" }],
			},
		}).success,
	).toBe(false);
});

test("Contribute adds distinct pairs, Correct replaces, Retract removes", () => {
	const contributed = applyKnowledgeChange({
		source: wartenReading,
		knowledge: { governedPrepositions: [aufAcc] },
		change: {
			kind: "Contribute",
			aspect: "governedPrepositions",
			value: [aufAcc, aufDat],
		},
	});
	expect(contributed).toEqual({
		success: true,
		value: { governedPrepositions: [aufAcc, aufDat] },
	});
	const corrected = applyKnowledgeChange({
		source: wartenReading,
		knowledge: { governedPrepositions: [aufAcc, aufDat] },
		change: {
			kind: "Correct",
			aspect: "governedPrepositions",
			value: [aufDat],
		},
	});
	expect(corrected).toEqual({
		success: true,
		value: { governedPrepositions: [aufDat] },
	});
	const retracted = applyKnowledgeChange({
		source: wartenReading,
		knowledge: { definition: "x", governedPrepositions: [aufDat] },
		change: { kind: "Retract", aspect: "governedPrepositions" },
	});
	expect(retracted).toEqual({ success: true, value: { definition: "x" } });
	const invalid = applyKnowledgeChange({
		source: wartenReading,
		knowledge: {},
		change: {
			kind: "Contribute",
			aspect: "governedPrepositions",
			value: [{ preposition: fuerLemma, case: "Gen" }],
		},
	});
	expect(invalid.success).toBe(false);
});

test("German governors request governed prepositions; other Kinds do not", () => {
	for (const [family, kind, expected] of [
		["Lexeme", "VERB", true],
		["Lexeme", "ADJ", true],
		["Lexeme", "NOUN", true],
		["Phraseme", "Collocation", true],
		["Phraseme", "Idiom", true],
		["Lexeme", "ADP", false],
		["Lexeme", "ADV", false],
		["Lexeme", "DET", false],
		["Morpheme", "Root", false],
	] as const) {
		const selected = selectKnowledge({
			route: { language: "de", family, kind } as never,
		});
		expect(selected.success).toBe(true);
		if (selected.success)
			expect(Object.hasOwn(selected.value, "governedPrepositions")).toBe(
				expected,
			);
	}
	const disabled = selectKnowledge({
		route: { language: "de", family: "Lexeme", kind: "VERB" },
		settings: { governedPrepositions: false },
	});
	expect(disabled.success && disabled.value).not.toHaveProperty(
		"governedPrepositions",
	);
});

test("projection stores the governor side and infers the preposition side", () => {
	const aufReading = {
		unitKind: "Reading",
		lemma: aufLemma,
		emojiDescription: "⬆️",
	} as const satisfies Dumling.Reading<"de", "Lexeme", "ADP">;
	const result = projectPrepositionalGovernment([
		{ reading: aufReading, knowledge: {} },
		{
			reading: wartenReading,
			knowledge: { governedPrepositions: [aufAcc] },
		},
		{ reading: houseReading, knowledge: {} },
	]);
	expect(result.success).toBe(true);
	if (!result.success) return;
	for (const edge of result.value)
		expect(governmentProjectionSchema.safeParse(edge).success).toBe(true);
	expect(result.value).toEqual([
		{
			source: wartenReading,
			relation: "governs",
			target: aufLemma,
			case: "Acc",
			provenance: "direct",
		},
		{
			source: aufReading,
			relation: "governedBy",
			target: wartenReading,
			case: "Acc",
			provenance: "inferred",
		},
	]);
	const withoutPreposition = projectPrepositionalGovernment([
		{
			reading: wartenReading,
			knowledge: { governedPrepositions: [aufAcc] },
		},
	]);
	expect(withoutPreposition.success && withoutPreposition.value).toEqual([
		{
			source: wartenReading,
			relation: "governs",
			target: aufLemma,
			case: "Acc",
			provenance: "direct",
		},
	]);
	expect(
		projectPrepositionalGovernment([
			{ reading: wartenReading, knowledge: {} },
			{ reading: wartenReading, knowledge: {} },
		]).success,
	).toBe(false);
});
