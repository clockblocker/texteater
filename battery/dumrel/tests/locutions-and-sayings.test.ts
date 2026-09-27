import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import {
	applyKnowledgeChange,
	parseReadingKnowledge,
	projectSemanticRelations,
	selectKnowledge,
} from "dumrel";
import type * as Dumrel from "dumrel/types";
import { houseReading, prefixLemma } from "./fixtures.js";

const insGrasBeissen = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Locution",
		kind: "VERB",
		canonicalForm: "ins Gras beißen",
		coreFeatures: {},
	},
	emojiDescription: "🪦",
} as const satisfies Dumling.Reading<"de", "Locution", "VERB">;

const sterben = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm: "sterben",
		coreFeatures: {
			hasSepPrefix: null,
			lexicallyReflexive: null,
			verbType: null,
		},
	},
	emojiDescription: "🪦",
} as const satisfies Dumling.Reading<"de", "Lexeme", "VERB">;

const tutMirLeid = (emojiDescription: string) =>
	({
		unitKind: "Reading",
		lemma: {
			unitKind: "Lemma",
			language: "de",
			family: "Locution",
			kind: "INTJ",
			canonicalForm: "tut mir leid",
			coreFeatures: {},
		},
		emojiDescription,
	}) as const satisfies Dumling.Reading<"de", "Locution", "INTJ">;

const danke = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "INTJ",
		canonicalForm: "danke",
		coreFeatures: { partType: null },
	},
	emojiDescription: "🙏",
} as const satisfies Dumling.Reading<"de", "Lexeme", "INTJ">;

const saying = (canonicalForm: string, emojiDescription: string) =>
	({
		unitKind: "Reading",
		lemma: {
			unitKind: "Lemma",
			language: "de",
			family: "Saying",
			kind: "Saying",
			canonicalForm,
			coreFeatures: {},
		},
		emojiDescription,
	}) as const satisfies Dumling.Reading<"de", "Saying", "Saying">;

const seinOderNichtsein = saying("Sein oder Nichtsein", "💀");
const morgenstund = saying("Morgenstund hat Gold im Mund", "🌅");
const werRastet = saying("Wer rastet, der rostet", "🦥");

function accepts(source: Dumling.Reading, knowledge: unknown): boolean {
	return parseReadingKnowledge({
		source,
		knowledge: knowledge as Dumrel.ReadingKnowledge,
	}).success;
}

test("Locution Type belongs to a Locution Reading, Idiom or Collocation", () => {
	for (const locutionType of ["Idiom", "Collocation"] as const)
		expect(accepts(insGrasBeissen, { locutionType })).toBe(true);
	expect(accepts(tutMirLeid("😔"), { locutionType: "Idiom" })).toBe(true);
	// Only a VERB Locution's verb can support a predicate.
	expect(accepts(tutMirLeid("😔"), { locutionType: "Collocation" })).toBe(
		false,
	);
	// A Locution with neither (zum Teil) stores none.
	expect(accepts(insGrasBeissen, {})).toBe(true);
	expect(accepts(insGrasBeissen, { locutionType: "Proverb" })).toBe(false);
	for (const source of [sterben, danke, seinOderNichtsein])
		expect(accepts(source, { locutionType: "Idiom" })).toBe(false);
});

test("Saying Type belongs to a Saying Reading, with an optional attribution", () => {
	expect(accepts(morgenstund, { sayingType: { type: "Proverb" } })).toBe(
		true,
	);
	const parsed = parseReadingKnowledge({
		source: seinOderNichtsein,
		knowledge: {
			sayingType: { type: "WingedWord", attribution: "  Shakespeare " },
		},
	});
	expect(parsed).toEqual({
		success: true,
		value: {
			sayingType: { type: "WingedWord", attribution: "Shakespeare" },
		},
	});
	expect(accepts(morgenstund, { sayingType: { type: "Aphorism" } })).toBe(
		false,
	);
	expect(
		accepts(morgenstund, {
			sayingType: { type: "Proverb", attribution: "" },
		}),
	).toBe(false);
	for (const source of [insGrasBeissen, sterben])
		expect(accepts(source, { sayingType: { type: "Proverb" } })).toBe(
			false,
		);
});

test("Formula Role belongs to a Lexeme or Locution INTJ Reading", () => {
	expect(accepts(danke, { formulaRole: "Thanks" })).toBe(true);
	expect(accepts(tutMirLeid("😔"), { formulaRole: "Apology" })).toBe(true);
	expect(accepts(tutMirLeid("🫂"), { formulaRole: "Sympathy" })).toBe(true);
	expect(accepts(danke, { formulaRole: "Toast" })).toBe(false);
	for (const source of [insGrasBeissen, sterben, houseReading, werRastet])
		expect(accepts(source, { formulaRole: "Greeting" })).toBe(false);
});

test("the type aspects are atomic and checked against the change's source", () => {
	const contributed = applyKnowledgeChange({
		source: tutMirLeid("😔"),
		knowledge: {},
		change: { kind: "Contribute", aspect: "formulaRole", value: "Apology" },
	});
	expect(contributed).toEqual({
		success: true,
		value: { formulaRole: "Apology" },
	});
	expect(
		applyKnowledgeChange({
			source: tutMirLeid("😔"),
			knowledge: { formulaRole: "Apology" },
			change: {
				kind: "Contribute",
				aspect: "formulaRole",
				value: "Sympathy",
			},
		}).success,
	).toBe(false);
	expect(
		applyKnowledgeChange({
			source: tutMirLeid("😔"),
			knowledge: { formulaRole: "Apology" },
			change: {
				kind: "Correct",
				aspect: "formulaRole",
				value: "Sympathy",
			},
		}),
	).toEqual({ success: true, value: { formulaRole: "Sympathy" } });
	expect(
		applyKnowledgeChange({
			source: insGrasBeissen,
			knowledge: { locutionType: "Idiom" },
			change: { kind: "Retract", aspect: "locutionType" },
		}),
	).toEqual({ success: true, value: {} });
	expect(
		applyKnowledgeChange({
			source: werRastet,
			knowledge: {},
			change: {
				kind: "Contribute",
				aspect: "sayingType",
				value: { type: "Proverb" },
			},
		}),
	).toEqual({ success: true, value: { sayingType: { type: "Proverb" } } });
	const wrongRoute = applyKnowledgeChange({
		source: sterben,
		knowledge: {},
		change: { kind: "Contribute", aspect: "locutionType", value: "Idiom" },
	});
	expect(wrongRoute.success).toBe(false);
	if (!wrongRoute.success)
		expect(wrongRoute.error.issues[0]?.path).toEqual(["change", "aspect"]);
});

test("each route requests the type aspects it has", () => {
	const mask = (route: Dumling.UnitRoute | Record<string, string>) => {
		const selected = selectKnowledge({ route } as never);
		if (!selected.success) throw selected.error;
		return selected.value;
	};
	const de = { language: "de" } as const;
	const locutionVerb = mask({ ...de, family: "Locution", kind: "VERB" });
	expect(locutionVerb).toHaveProperty("locutionType", null);
	expect(locutionVerb).toHaveProperty("valency", null);
	expect(locutionVerb).not.toHaveProperty("formulaRole");
	const locutionInterjection = mask({
		...de,
		family: "Locution",
		kind: "INTJ",
	});
	expect(locutionInterjection).toHaveProperty("locutionType", null);
	expect(locutionInterjection).toHaveProperty("formulaRole", null);
	const lexemeInterjection = mask({ ...de, family: "Lexeme", kind: "INTJ" });
	expect(lexemeInterjection).toHaveProperty("formulaRole", null);
	expect(lexemeInterjection).not.toHaveProperty("locutionType");
	const sayingMask = mask({ ...de, family: "Saying", kind: "Saying" });
	expect(sayingMask).toHaveProperty("sayingType", null);
	expect(sayingMask).not.toHaveProperty("locutionType");
	expect(sayingMask).not.toHaveProperty("formulaRole");
	for (const kind of ["VERB", "NOUN", "ADV"])
		for (const aspect of ["locutionType", "sayingType", "formulaRole"])
			expect(mask({ ...de, family: "Lexeme", kind })).not.toHaveProperty(
				aspect,
			);
	const disabled = selectKnowledge({
		route: { ...de, family: "Locution", kind: "INTJ" },
		settings: { formulaRole: false },
	});
	expect(disabled.success && disabled.value).not.toHaveProperty(
		"formulaRole",
	);
});

test("Lexeme and Locution share one relation space", () => {
	expect(
		accepts(insGrasBeissen, {
			semanticRelations: { synonym: [sterben.lemma] },
		}),
	).toBe(true);
	expect(
		accepts(sterben, {
			semanticRelations: { synonym: [insGrasBeissen.lemma] },
		}),
	).toBe(true);
	expect(
		accepts(sterben, {
			semanticRelations: {
				targetKind: "reading",
				synonym: [insGrasBeissen],
			},
		}),
	).toBe(true);
	const projected = projectSemanticRelations([
		{
			reading: insGrasBeissen,
			knowledge: { semanticRelations: { synonym: [sterben.lemma] } },
		},
		{ reading: sterben, knowledge: {} },
	]);
	expect(projected).toEqual({
		success: true,
		value: [
			{
				source: insGrasBeissen,
				relation: "synonym",
				target: sterben.lemma,
				provenance: "direct",
			},
			{
				source: sterben,
				relation: "synonym",
				target: insGrasBeissen.lemma,
				provenance: "inferred",
			},
		],
	});
});

test("a Saying relates only to Sayings", () => {
	expect(
		accepts(werRastet, {
			semanticRelations: { nearSynonym: [morgenstund.lemma] },
		}),
	).toBe(true);
	for (const [source, target] of [
		[werRastet, sterben.lemma],
		[werRastet, insGrasBeissen.lemma],
		[sterben, werRastet.lemma],
		[insGrasBeissen, werRastet.lemma],
		[houseReading, prefixLemma],
	] as const) {
		const parsed = parseReadingKnowledge({
			source,
			knowledge: { semanticRelations: { synonym: [target] } } as never,
		});
		expect(parsed.success).toBe(false);
		if (!parsed.success)
			expect(parsed.error.issues[0]?.path.at(-1)).toBe("family");
	}
	expect(
		applyKnowledgeChange({
			source: sterben,
			knowledge: {},
			change: {
				kind: "Contribute",
				aspect: "semanticRelations",
				relation: "synonym",
				value: [werRastet.lemma],
			},
		}).success,
	).toBe(false);
});
