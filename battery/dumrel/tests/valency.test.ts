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

const aufAcc = {
	kind: "Preposition",
	preposition: aufLemma,
	case: "Acc",
	referent: "Either",
} as const;
const aufDat = { ...aufAcc, case: "Dat" } as const;
const optional = <C>(complement: C) =>
	({ status: "Optional", complement }) as const;
const required = <C>(complement: C) =>
	({ status: "Required", complement }) as const;
const nom = { kind: "Case", case: "Nom", referent: "Someone" } as const;

const stolzReading = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "ADJ",
		canonicalForm: "stolz",
		coreFeatures: {
			abbr: null,
			foreign: null,
			numType: null,
			variant: null,
		},
	},
	emojiDescription: "🦚",
} as const satisfies Dumling.Reading<"de", "Lexeme", "ADJ">;
const aufReading = {
	unitKind: "Reading",
	lemma: aufLemma,
	emojiDescription: "⬆️",
} as const satisfies Dumling.Reading<"de", "Lexeme", "ADP">;

test("a two-way preposition takes the construction's case", () => {
	const parsed = parseReadingKnowledge({
		source: wartenReading,
		knowledge: { valency: [required(nom), optional(aufAcc)] },
	});
	expect(parsed).toEqual({
		success: true,
		value: { valency: [required(nom), optional(aufAcc)] },
	});
});

test("a fixed-case preposition rejects another case", () => {
	const parsed = parseReadingKnowledge({
		source: wartenReading,
		knowledge: {
			valency: [
				optional({ ...aufAcc, preposition: fuerLemma, case: "Dat" }),
			],
		},
	});
	expect(parsed.success).toBe(false);
	if (!parsed.success)
		expect(parsed.error.issues[0]?.path).toEqual([
			"knowledge",
			"valency",
			0,
			"complement",
			"case",
		]);
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: {
				valency: [optional({ ...aufAcc, preposition: fuerLemma })],
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
				knowledge: { valency: [optional({ ...aufAcc, preposition })] },
			}).success,
		).toBe(false);
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: { valency: [optional({ ...aufAcc, case: "Nom" })] },
		}).success,
	).toBe(false);
});

test("each route allows its own complements, and lists each once", () => {
	const noun = parseReadingKnowledge({
		source: houseReading,
		knowledge: { valency: [optional(nom)] },
	});
	expect(noun.success).toBe(false);
	if (!noun.success)
		expect(noun.error.issues[0]?.path).toEqual([
			"knowledge",
			"valency",
			0,
			"complement",
			"kind",
		]);
	expect(
		parseReadingKnowledge({
			source: houseReading,
			knowledge: { valency: [optional(aufAcc)] },
		}).success,
	).toBe(true);
	expect(
		parseReadingKnowledge({
			source: aufReading,
			knowledge: { valency: [optional(aufAcc)] },
		}).success,
	).toBe(false);
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: { valency: [optional(aufAcc), required(aufAcc)] },
		}).success,
	).toBe(false);
});

test("Contribute adds missing Slots, Correct replaces the frame, Retract removes a Slot or the frame", () => {
	const someone = { ...aufAcc, referent: "Someone" } as const;
	expect(
		applyKnowledgeChange({
			source: wartenReading,
			knowledge: { valency: [required(nom), optional(someone)] },
			change: {
				kind: "Contribute",
				aspect: "valency",
				value: [optional(aufAcc), optional(aufDat)],
			},
		}),
	).toEqual({
		success: true,
		value: {
			valency: [required(nom), optional(someone), optional(aufDat)],
		},
	});
	expect(
		applyKnowledgeChange({
			source: wartenReading,
			knowledge: { valency: [optional(aufAcc)] },
			change: {
				kind: "Correct",
				aspect: "valency",
				value: [required(aufAcc)],
			},
		}),
	).toEqual({ success: true, value: { valency: [required(aufAcc)] } });
	expect(
		applyKnowledgeChange({
			source: wartenReading,
			knowledge: { valency: [required(nom), optional(aufAcc)] },
			change: { kind: "Retract", aspect: "valency", complement: aufAcc },
		}),
	).toEqual({ success: true, value: { valency: [required(nom)] } });
	expect(
		applyKnowledgeChange({
			source: wartenReading,
			knowledge: { definition: "x", valency: [optional(aufAcc)] },
			change: { kind: "Retract", aspect: "valency", complement: aufAcc },
		}),
	).toEqual({ success: true, value: { definition: "x" } });
	expect(
		applyKnowledgeChange({
			source: wartenReading,
			knowledge: { definition: "x", valency: [optional(aufDat)] },
			change: { kind: "Retract", aspect: "valency" },
		}),
	).toEqual({ success: true, value: { definition: "x" } });
	const invalid = applyKnowledgeChange({
		source: wartenReading,
		knowledge: {},
		change: {
			kind: "Contribute",
			aspect: "valency",
			value: [
				optional({ ...aufAcc, preposition: fuerLemma, case: "Gen" }),
			],
		},
	});
	expect(invalid.success).toBe(false);
});

test("German governors request valency; other Kinds do not", () => {
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
			expect(Object.hasOwn(selected.value, "valency")).toBe(expected);
	}
	const disabled = selectKnowledge({
		route: { language: "de", family: "Lexeme", kind: "VERB" },
		settings: { valency: false },
	});
	expect(disabled.success && disabled.value).not.toHaveProperty("valency");
});

test("projection reads Preposition Slots and infers the preposition side", () => {
	const result = projectPrepositionalGovernment([
		{ reading: aufReading, knowledge: {} },
		{
			reading: wartenReading,
			knowledge: { valency: [required(nom), optional(aufAcc)] },
		},
		{ reading: stolzReading, knowledge: { valency: [optional(aufAcc)] } },
		{ reading: houseReading, knowledge: {} },
	]);
	expect(result.success).toBe(true);
	if (!result.success) return;
	for (const edge of result.value)
		expect(governmentProjectionSchema.safeParse(edge).success).toBe(true);
	expect(
		result.value
			.filter((edge) => edge.relation === "governedBy")
			.map((edge) => edge.target),
	).toEqual([wartenReading, stolzReading]);
	expect(result.value).toContainEqual({
		source: wartenReading,
		relation: "governs",
		target: aufLemma,
		case: "Acc",
		provenance: "direct",
	});
	const withoutPreposition = projectPrepositionalGovernment([
		{
			reading: wartenReading,
			knowledge: { valency: [optional(aufAcc)] },
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
