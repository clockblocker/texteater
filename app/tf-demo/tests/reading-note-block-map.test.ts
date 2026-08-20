import { describe, expect, test } from "bun:test";
import { schemasFor } from "dumling/schema";
import { defaultKnowledgeRequestMask } from "dumrel";

import { DE_READING_NOTE_BLOCK_MAP } from "../src/notes/reading/de/block-map";

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
} as const;

const universalBlocks = [
	"Header",
	"SourceContexts",
	"Definition",
	"Translations",
] as const;

describe("German Reading Note Block applicability", () => {
	test("fully materializes all 33 Unit Reading routes without Construction", () => {
		expect(Object.keys(DE_READING_NOTE_BLOCK_MAP)).toEqual(
			Object.keys(familyKinds),
		);
		let routeCount = 0;
		for (const [family, kinds] of Object.entries(familyKinds)) {
			expect(
				Object.keys(
					DE_READING_NOTE_BLOCK_MAP[
						family as keyof typeof DE_READING_NOTE_BLOCK_MAP
					],
				),
			).toEqual([...kinds]);
			routeCount += kinds.length;
		}
		expect(routeCount).toBe(33);
		expect(DE_READING_NOTE_BLOCK_MAP).not.toHaveProperty("Construction");
	});

	test("includes every universal Block and omits unfrozen structure Blocks", () => {
		for (const blocks of allBlockSets()) {
			for (const block of universalBlocks)
				expect(blocks.has(block)).toBeTrue();
			expect(blocks.has("MorphologicalTree")).toBeFalse();
			expect(blocks.has("LexicalBreakdown")).toBeFalse();
			expect(blocks.has("Routes" as never)).toBeFalse();
		}
	});

	test("matches Dumrel's frozen German Relations applicability contract", () => {
		for (const [family, kinds] of Object.entries(familyKinds)) {
			for (const kind of kinds) {
				const blocks = blockSetFor(family, kind);
				const lemmaSchema = lemmaSchemaFor(family, kind);
				const coreFeatures = Object.fromEntries(
					Object.keys(lemmaSchema.shape.coreFeatures.shape).map(
						(name) => [name, null],
					),
				);
				const lemma = lemmaSchema.parse({
					language: "de",
					family,
					kind,
					canonicalForm: "contract probe",
					coreFeatures,
				});
				const applicable = defaultKnowledgeRequestMask({
					lemma,
					emojiDescription: "🧭",
				} as never);

				expect(blocks.has("Relations")).toBe(
					Object.keys(applicable?.semanticRelations ?? {}).length > 0,
				);
			}
		}
	});
});

type RuntimeLemmaSchema = {
	readonly shape: {
		readonly coreFeatures: {
			readonly shape: Readonly<Record<string, unknown>>;
		};
	};
	parse(input: unknown): unknown;
};

const runtimeLemmaSchemas = schemasFor.de.entity.Lemma as unknown as Readonly<
	Record<string, Readonly<Record<string, () => RuntimeLemmaSchema>>>
>;

function lemmaSchemaFor(family: string, kind: string): RuntimeLemmaSchema {
	const schema = runtimeLemmaSchemas[family]?.[kind]?.();
	if (!schema)
		throw new Error(`Missing Dumling schema for ${family}/${kind}.`);
	return schema;
}

function blockSetFor(family: string, kind: string) {
	const familyMap = DE_READING_NOTE_BLOCK_MAP[
		family as keyof typeof DE_READING_NOTE_BLOCK_MAP
	] as Readonly<Record<string, ReadonlySet<string>>>;
	const blocks = familyMap[kind];
	if (!blocks)
		throw new Error(`Missing Reading Block map for ${family}/${kind}.`);
	return blocks;
}

function allBlockSets() {
	return Object.values(DE_READING_NOTE_BLOCK_MAP).flatMap((familyMap) =>
		Object.values(familyMap),
	);
}
