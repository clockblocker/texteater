import { describe, expect, test } from "bun:test";
import { dumling } from "dumling";

import { defaultKnowledgeRequestMask } from "../../src";
import { DE_REL_MAP } from "../../src/applicability/de";
import type { KnowledgeRequestMask, SemanticRelation } from "../../src/types";
import { nounReading } from "./fixtures";

const familyKinds = {
	Lexeme: [
		"ADJ",
		"ADP",
		"ADV",
		"AUX",
		"CCONJ",
		"DET",
		"INTJ",
		"NOUN",
		"NUM",
		"PART",
		"PRON",
		"PROPN",
		"PUNCT",
		"SCONJ",
		"SYM",
		"VERB",
		"X",
	],
	Phraseme: [
		"Aphorism",
		"Collocation",
		"DiscourseFormula",
		"Idiom",
		"Proverb",
	],
	Morpheme: [
		"Circumfix",
		"Clitic",
		"Duplifix",
		"Infix",
		"Interfix",
		"Prefix",
		"Root",
		"Suffix",
		"Suffixoid",
		"ToneMarking",
		"Transfix",
	],
	Construction: ["Fusion"],
} as const;

const relationGroups: ReadonlyArray<
	readonly [
		readonly (readonly [keyof typeof DE_REL_MAP, string])[],
		readonly SemanticRelation[],
	]
> = [
	[
		[["Lexeme", "NOUN"]],
		[
			"synonym",
			"nearSynonym",
			"antonym",
			"nearAntonym",
			"hypernym",
			"holonym",
		],
	],
	[
		[["Lexeme", "VERB"]],
		["synonym", "nearSynonym", "antonym", "nearAntonym", "hypernym"],
	],
	[
		[
			["Lexeme", "ADJ"],
			["Lexeme", "ADP"],
			["Lexeme", "ADV"],
			["Lexeme", "AUX"],
			["Lexeme", "DET"],
			["Lexeme", "INTJ"],
			["Lexeme", "PART"],
			["Lexeme", "PRON"],
			["Lexeme", "SCONJ"],
			["Lexeme", "SYM"],
			["Phraseme", "Aphorism"],
			["Phraseme", "Collocation"],
			["Phraseme", "DiscourseFormula"],
			["Phraseme", "Idiom"],
			["Phraseme", "Proverb"],
		],
		["synonym", "nearSynonym", "antonym", "nearAntonym"],
	],
	[[["Lexeme", "PROPN"]], ["synonym", "hypernym", "holonym"]],
	[[["Lexeme", "CCONJ"]], ["synonym", "antonym", "nearAntonym"]],
	[[["Lexeme", "NUM"]], ["synonym"]],
	[
		[
			["Lexeme", "PUNCT"],
			["Lexeme", "X"],
			...[...familyKinds.Morpheme].map(
				(kind) => ["Morpheme", kind] as const,
			),
			["Construction", "Fusion"],
		],
		[],
	],
];

function maskFor(family: keyof typeof DE_REL_MAP, kind: string) {
	const mask = (DE_REL_MAP[family] as Record<string, KnowledgeRequestMask>)[
		kind
	];
	if (mask === undefined) throw new Error(`Missing ${family}/${kind}.`);
	return mask;
}

function relationKeys(mask: KnowledgeRequestMask): string[] {
	return Object.keys(mask.semanticRelations ?? {});
}

function expectDeepFrozen(value: unknown): void {
	if (typeof value !== "object" || value === null) return;
	expect(Object.isFrozen(value)).toBe(true);
	for (const nested of Object.values(value)) expectDeepFrozen(nested);
}

describe("German Knowledge applicability", () => {
	test("snapshots the complete resolved Family/Kind tree", () => {
		expect(DE_REL_MAP).toMatchSnapshot();
	});

	test("covers all 34 current routes and freezes the whole tree", () => {
		expect(Object.keys(DE_REL_MAP)).toEqual(Object.keys(familyKinds));
		let count = 0;
		for (const [family, kinds] of Object.entries(familyKinds)) {
			expect(
				Object.keys(DE_REL_MAP[family as keyof typeof DE_REL_MAP]),
			).toEqual([...kinds]);
			count += kinds.length;
		}
		expect(count).toBe(34);
		expectDeepFrozen(DE_REL_MAP);
	});

	test("gives every route the base German leaves and no structured leaves", () => {
		for (const [family, kinds] of Object.entries(familyKinds)) {
			for (const kind of kinds) {
				const mask = maskFor(family as keyof typeof DE_REL_MAP, kind);
				expect(mask).toMatchObject({
					transcription: null,
					definition: null,
					translations: { en: null },
				});
				expect(mask).not.toHaveProperty("morphologicalTree");
				expect(mask).not.toHaveProperty("lexicalBreakdown");
			}
		}
	});

	test("matches the frozen relation matrix", () => {
		for (const [routes, expected] of relationGroups) {
			for (const [family, kind] of routes) {
				expect(relationKeys(maskFor(family, kind))).toEqual([
					...expected,
				]);
			}
		}
	});

	test("never requests inverse-only relations and pairs Near Antonym with Antonym", () => {
		for (const [family, kinds] of Object.entries(familyKinds)) {
			for (const kind of kinds) {
				const relations = relationKeys(
					maskFor(family as keyof typeof DE_REL_MAP, kind),
				);
				expect(relations).not.toContain("hyponym");
				expect(relations).not.toContain("meronym");
				expect(relations.includes("nearAntonym")).toBe(
					relations.includes("antonym"),
				);
			}
		}
	});

	test("returns fresh German masks and leaves English and Hebrew unconfigured", () => {
		const first = defaultKnowledgeRequestMask(nounReading);
		const second = defaultKnowledgeRequestMask(nounReading);
		expect(first).toEqual(DE_REL_MAP.Lexeme.NOUN);
		expect(first).not.toBe(DE_REL_MAP.Lexeme.NOUN);
		expect(second).not.toBe(first);

		const englishReading = {
			lemma: dumling.en.create.lemma({
				canonicalForm: "walk",
				family: "Lexeme",
				kind: "VERB",
				coreFeatures: {
					style: null,
					phrasal: null,
					hasGovPrep: null,
					extPos: null,
					abbr: null,
				},
			}),
			emojiDescription: "🚶",
		};
		const hebrewReading = {
			lemma: dumling.he.create.lemma({
				canonicalForm: "כתב",
				family: "Lexeme",
				kind: "VERB",
				coreFeatures: { hebBinyan: "PAAL", hebExistential: null },
			}),
			emojiDescription: "✍️",
		};
		expect(defaultKnowledgeRequestMask(englishReading)).toBeUndefined();
		expect(defaultKnowledgeRequestMask(hebrewReading)).toBeUndefined();
	});
});
