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
		lexicallyReflexive: "Yes",
		verbType: null,
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
			abbr: null,
			foreign: null,
			numType: null,
			variant: null,
		},
	},
	emojiDescription: "💘",
} as const satisfies Dumling.Reading<"de", "Lexeme", "ADJ">;

test("an ADJ Reading stores a VERB Lemma of its Language as its Participle Source", () => {
	expect(
		parseReadingKnowledge({
			source: verliebtReading,
			knowledge: { participleSource: verlieben },
		}),
	).toEqual({ success: true, value: { participleSource: verlieben } });
	for (const [source, participleSource] of [
		[verliebtReading, houseLemma],
		[verliebtReading, wartenReading],
		[verliebtReading, { ...verlieben, language: "en" }],
		[wartenReading, verlieben],
	] as const)
		expect(
			parseReadingKnowledge({
				source,
				knowledge: { participleSource },
			}).success,
		).toBe(false);
});

test("a Participle Source is atomic: Contribute conflicts, Correct replaces, Retract removes", () => {
	const lieben = { ...verlieben, canonicalForm: "lieben" } as const;
	const contributed = applyKnowledgeChange({
		source: verliebtReading,
		knowledge: {},
		change: {
			kind: "Contribute",
			aspect: "participleSource",
			value: verlieben,
		},
	});
	expect(contributed).toEqual({
		success: true,
		value: { participleSource: verlieben },
	});
	expect(
		applyKnowledgeChange({
			source: verliebtReading,
			knowledge: { participleSource: verlieben },
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
			knowledge: { participleSource: verlieben },
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
			knowledge: { definition: "x", participleSource: verlieben },
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

test("projection stores the adjective side and infers the verb side", () => {
	const result = projectParticipleSources([
		{ reading: verliebenReading, knowledge: {} },
		{
			reading: verliebtReading,
			knowledge: { participleSource: verlieben },
		},
		{ reading: wartenReading, knowledge: {} },
	]);
	expect(result.success).toBe(true);
	if (!result.success) return;
	for (const edge of result.value)
		expect(participleProjectionSchema.safeParse(edge).success).toBe(true);
	expect(result.value).toEqual([
		{
			source: verliebtReading,
			relation: "participleSource",
			target: verlieben,
			provenance: "direct",
		},
		{
			source: verliebenReading,
			relation: "participialAdjective",
			target: verliebtReading,
			provenance: "inferred",
		},
	]);
	const withoutVerb = projectParticipleSources([
		{
			reading: verliebtReading,
			knowledge: { participleSource: verlieben },
		},
	]);
	expect(withoutVerb.success && withoutVerb.value).toEqual([
		{
			source: verliebtReading,
			relation: "participleSource",
			target: verlieben,
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
