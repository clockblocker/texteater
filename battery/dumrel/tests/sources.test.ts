import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import {
	applyKnowledgeChange,
	parseReadingKnowledge,
	projectSources,
	selectKnowledge,
} from "dumrel";
import { sourceProjectionSchema } from "dumrel/schema";
import { houseLemma, prefixLemma, wartenReading } from "./fixtures.js";

const verlieben = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "VERB",
	canonicalForm: "verlieben",
	coreFeatures: {
		hasSepPrefix: null,
	},
} as const satisfies Dumling.Lemma<"de", "Lexeme", "VERB">;
const verliebenReading = {
	unitKind: "Reading",
	lemma: verlieben,
	emojiDescription: "🪞😍",
} as const satisfies Dumling.Reading<"de", "Lexeme", "VERB">;
const verliebtReading = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "ADJ",
		canonicalForm: "verliebt",
		coreFeatures: {
			comparable: "Yes",
		},
	},
	emojiDescription: "💘",
} as const satisfies Dumling.Reading<"de", "Lexeme", "ADJ">;
const laufReading = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Lauf",
		coreFeatures: { gender: "Masc" },
	},
	emojiDescription: "🏃",
} as const satisfies Dumling.Reading<"de", "Lexeme", "NOUN">;
const laufenShadow = {
	language: "de",
	canonicalForm: "laufen",
	family: "Lexeme",
	kind: "VERB",
} as const;

const verbal = { target: verlieben, meaning: "Verbal" } as const;

test("a participle's Source names a VERB of its Language and a Participle Meaning", () => {
	expect(
		parseReadingKnowledge({
			source: verliebtReading,
			knowledge: { source: verbal },
		}),
	).toEqual({ success: true, value: { source: verbal } });
	expect(
		parseReadingKnowledge({
			source: verliebtReading,
			knowledge: {
				source: { target: verlieben, meaning: "Drifted" },
			},
		}).success,
	).toBe(true);
	for (const source of [
		{ target: verlieben },
		{ target: laufenShadow },
		{ target: verlieben, meaning: "Lexicalized" },
		{ target: wartenReading, meaning: "Verbal" },
		{ target: { ...verlieben, language: "en" }, meaning: "Verbal" },
		{ target: houseLemma, meaning: "Verbal" },
		verlieben,
	] as const)
		expect(
			parseReadingKnowledge({
				source: verliebtReading,
				knowledge: { source },
			}).success,
		).toBe(false);
});

test("a conversion's Source names its base, pending or resolved, and no meaning", () => {
	for (const target of [laufenShadow, wartenReading.lemma])
		expect(
			parseReadingKnowledge({
				source: laufReading,
				knowledge: { source: { target } },
			}).success,
		).toBe(true);
	for (const source of [
		{ target: laufenShadow, meaning: "Verbal" },
		{ target: prefixLemma },
		{ target: { ...laufenShadow, language: "en" } },
	] as const)
		expect(
			parseReadingKnowledge({
				source: laufReading,
				knowledge: { source },
			}).success,
		).toBe(false);
});

test("a Source is atomic: Contribute conflicts, Correct replaces, Retract removes", () => {
	const lieben = {
		target: { ...verlieben, canonicalForm: "lieben" },
		meaning: "Verbal",
	} as const;
	expect(
		applyKnowledgeChange({
			source: verliebtReading,
			knowledge: {},
			change: { kind: "Contribute", aspect: "source", value: verbal },
		}),
	).toEqual({ success: true, value: { source: verbal } });
	expect(
		applyKnowledgeChange({
			source: verliebtReading,
			knowledge: { source: verbal },
			change: { kind: "Contribute", aspect: "source", value: lieben },
		}).success,
	).toBe(false);
	expect(
		applyKnowledgeChange({
			source: verliebtReading,
			knowledge: { source: verbal },
			change: { kind: "Correct", aspect: "source", value: lieben },
		}),
	).toEqual({ success: true, value: { source: lieben } });
	expect(
		applyKnowledgeChange({
			source: verliebtReading,
			knowledge: { definition: "x", source: verbal },
			change: { kind: "Retract", aspect: "source" },
		}),
	).toEqual({ success: true, value: { definition: "x" } });
});

test("German ADJ, NOUN and VERB Lexemes request a Source, and no Locution does (ADR 0050)", () => {
	for (const [family, kind, expected] of [
		["Lexeme", "ADJ", true],
		["Lexeme", "VERB", true],
		["Lexeme", "NOUN", true],
		["Lexeme", "ADV", false],
		["Lexeme", "PROPN", false],
		["Locution", "VERB", false],
		["Locution", "ADJ", false],
	] as const) {
		const selected = selectKnowledge({
			route: { language: "de", family, kind } as never,
		});
		expect(selected.success).toBe(true);
		if (selected.success)
			expect(Object.hasOwn(selected.value, "source")).toBe(expected);
	}
});

test("projection stores the owning side and infers a Verbal participle's verb Lemma side", () => {
	const result = projectSources([
		{ reading: verliebenReading, knowledge: {} },
		{ reading: verliebtReading, knowledge: { source: verbal } },
		{ reading: wartenReading, knowledge: {} },
	]);
	expect(result.success).toBe(true);
	if (!result.success) return;
	for (const edge of result.value)
		expect(sourceProjectionSchema.safeParse(edge).success).toBe(true);
	const edges = [
		{
			source: verlieben,
			relation: "participialAdjective",
			target: verliebtReading,
			provenance: "inferred",
		},
		{
			source: verliebtReading,
			relation: "source",
			target: verlieben,
			meaning: "Verbal",
			provenance: "direct",
		},
	] as const;
	expect(result.value).toEqual(edges);
	// The inverse starts at the verb's Lemma, so it needs no stored verb.
	const withoutVerb = projectSources([
		{ reading: verliebtReading, knowledge: { source: verbal } },
	]);
	expect(withoutVerb.success && withoutVerb.value).toEqual(edges);
	// A drifted meaning keeps its link but is no participial adjective.
	const drifted = projectSources([
		{
			reading: verliebtReading,
			knowledge: { source: { target: verlieben, meaning: "Drifted" } },
		},
	]);
	expect(drifted.success && drifted.value).toEqual([
		{
			source: verliebtReading,
			relation: "source",
			target: verlieben,
			meaning: "Drifted",
			provenance: "direct",
		},
	]);
	// A conversion has no inverse.
	const conversion = projectSources([
		{
			reading: laufReading,
			knowledge: { source: { target: laufenShadow } },
		},
	]);
	expect(conversion.success && conversion.value).toEqual([
		{
			source: laufReading,
			relation: "source",
			target: laufenShadow,
			provenance: "direct",
		},
	]);
	expect(
		projectSources([
			{ reading: verliebtReading, knowledge: {} },
			{ reading: verliebtReading, knowledge: {} },
		]).success,
	).toBe(false);
});
