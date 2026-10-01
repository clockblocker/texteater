import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import {
	applyKnowledgeChange,
	parseReadingKnowledge,
	projectParticipleSources,
	selectKnowledge,
} from "dumrel";
import { participleProjectionSchema } from "dumrel/schema";
import { houseLemma, wartenReading } from "./fixtures.js";

const verlieben = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "VERB",
	canonicalForm: "sich verlieben",
	coreFeatures: {
		hasSepPrefix: null,
		lexicallyReflexive: "Acc",
	},
} as const satisfies Dumling.Lemma<"de", "Lexeme", "VERB">;
const verliebenReading = {
	unitKind: "Reading",
	lemma: verlieben,
	emojiDescription: "😍",
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

const verbal = { verb: verlieben, meaning: "Verbal" } as const;

test("an ADJ Reading stores a VERB Lemma of its Language and a meaning as its Participle Source", () => {
	expect(
		parseReadingKnowledge({
			source: verliebtReading,
			knowledge: { participleSource: verbal },
		}),
	).toEqual({ success: true, value: { participleSource: verbal } });
	expect(
		parseReadingKnowledge({
			source: verliebtReading,
			knowledge: {
				participleSource: { verb: verlieben, meaning: "Drifted" },
			},
		}).success,
	).toBe(true);
	for (const [source, participleSource] of [
		[verliebtReading, { verb: houseLemma, meaning: "Verbal" }],
		[verliebtReading, { verb: wartenReading, meaning: "Verbal" }],
		[
			verliebtReading,
			{ verb: { ...verlieben, language: "en" }, meaning: "Verbal" },
		],
		[verliebtReading, verlieben],
		[verliebtReading, { verb: verlieben }],
		[verliebtReading, { verb: verlieben, meaning: "Lexicalized" }],
		[wartenReading, verbal],
	] as const)
		expect(
			parseReadingKnowledge({
				source,
				knowledge: { participleSource },
			}).success,
		).toBe(false);
});

test("a Participle Source is atomic: Contribute conflicts, Correct replaces, Retract removes", () => {
	const lieben = {
		verb: { ...verlieben, canonicalForm: "lieben" },
		meaning: "Verbal",
	} as const;
	const contributed = applyKnowledgeChange({
		source: verliebtReading,
		knowledge: {},
		change: {
			kind: "Contribute",
			aspect: "participleSource",
			value: verbal,
		},
	});
	expect(contributed).toEqual({
		success: true,
		value: { participleSource: verbal },
	});
	expect(
		applyKnowledgeChange({
			source: verliebtReading,
			knowledge: { participleSource: verbal },
			change: {
				kind: "Contribute",
				aspect: "participleSource",
				value: lieben,
			},
		}).success,
	).toBe(false);
	expect(
		applyKnowledgeChange({
			source: verliebtReading,
			knowledge: { participleSource: verbal },
			change: {
				kind: "Correct",
				aspect: "participleSource",
				value: lieben,
			},
		}),
	).toEqual({ success: true, value: { participleSource: lieben } });
	expect(
		applyKnowledgeChange({
			source: verliebtReading,
			knowledge: { definition: "x", participleSource: verbal },
			change: { kind: "Retract", aspect: "participleSource" },
		}),
	).toEqual({ success: true, value: { definition: "x" } });
});

test("only German ADJ Readings request a Participle Source", () => {
	for (const [kind, expected] of [
		["ADJ", true],
		["VERB", false],
		["NOUN", false],
		["ADV", false],
	] as const) {
		const selected = selectKnowledge({
			route: { language: "de", family: "Lexeme", kind } as never,
		});
		expect(selected.success).toBe(true);
		if (selected.success)
			expect(Object.hasOwn(selected.value, "participleSource")).toBe(
				expected,
			);
	}
});

test("projection stores the adjective side and infers the verb Lemma side", () => {
	const result = projectParticipleSources([
		{ reading: verliebenReading, knowledge: {} },
		{
			reading: verliebtReading,
			knowledge: { participleSource: verbal },
		},
		{ reading: wartenReading, knowledge: {} },
	]);
	expect(result.success).toBe(true);
	if (!result.success) return;
	for (const edge of result.value)
		expect(participleProjectionSchema.safeParse(edge).success).toBe(true);
	const edges = [
		{
			source: verlieben,
			relation: "participialAdjective",
			target: verliebtReading,
			provenance: "inferred",
		},
		{
			source: verliebtReading,
			relation: "participleSource",
			target: verlieben,
			meaning: "Verbal",
			provenance: "direct",
		},
	] as const;
	expect(result.value).toEqual(edges);
	// The inverse starts at the verb's Lemma, so it needs no stored verb.
	const withoutVerb = projectParticipleSources([
		{
			reading: verliebtReading,
			knowledge: { participleSource: verbal },
		},
	]);
	expect(withoutVerb.success && withoutVerb.value).toEqual(edges);
	// A drifted meaning keeps its link but is no participial adjective.
	const drifted = projectParticipleSources([
		{
			reading: verliebtReading,
			knowledge: {
				participleSource: { verb: verlieben, meaning: "Drifted" },
			},
		},
	]);
	expect(drifted.success && drifted.value).toEqual([
		{
			source: verliebtReading,
			relation: "participleSource",
			target: verlieben,
			meaning: "Drifted",
			provenance: "direct",
		},
	]);
	expect(
		projectParticipleSources([
			{ reading: verliebtReading, knowledge: {} },
			{ reading: verliebtReading, knowledge: {} },
		]).success,
	).toBe(false);
});
