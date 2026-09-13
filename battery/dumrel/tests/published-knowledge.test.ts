import { expect, test } from "bun:test";
import type * as Dumrel from "dumrel/types";
import { applyKnowledgeChange, parseReadingKnowledge } from "../dist/index.js";
import {
	knowledgeChangeSchema,
	readingKnowledgeSchema,
} from "../dist/schemas.js";
import { berlinLemma, houseReading, prefixLemma } from "./fixtures.js";

const nounShadow = {
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Haus",
} as const;
const verbShadow = {
	language: "de",
	family: "Lexeme",
	kind: "VERB",
	canonicalForm: "bauen",
} as const;
const prefixShadow = {
	language: "de",
	family: "Morpheme",
	kind: "Prefix",
	canonicalForm: "un-",
} as const;

test("published schemas and runtime agree on normalized, structured Knowledge", () => {
	const knowledge = {
		transcription: " haʊs ",
		definition: " Geba\u0308ude ",
		translations: { en: [" house "] },
		morphologicalTree: {
			root: {
				nodeKind: "structure",
				children: [
					{
						nodeKind: "morphemeReading",
						reading: {
							unitKind: "Reading",
							lemma: prefixLemma,
							emojiDescription: "🧩",
						},
					},
					{ nodeKind: "unitShadow", unitShadow: nounShadow },
				],
			},
		},
		lexicalBreakdown: [nounShadow, verbShadow],
		semanticRelations: { nearSynonym: [berlinLemma] },
	} satisfies Dumrel.ReadingKnowledge;
	const expected = {
		...knowledge,
		transcription: "haʊs",
		definition: "Gebäude",
		translations: { en: ["house"] },
	};
	expect(readingKnowledgeSchema.parse(knowledge)).toEqual(expected);
	expect(parseReadingKnowledge({ source: houseReading, knowledge })).toEqual({
		success: true,
		value: expected,
	});
});

test.each([
	[
		"a primitive Reading",
		{
			morphologicalTree: {
				root: {
					nodeKind: "structure",
					children: [{ nodeKind: "morphemeReading", reading: 123 }],
				},
			},
		},
	],
	[
		"Morpheme shadows in Lexical Breakdown",
		{ lexicalBreakdown: [prefixShadow, prefixShadow] },
	],
])("published schemas and runtime reject %s", (_, knowledge) => {
	expect(readingKnowledgeSchema.safeParse(knowledge).success).toBe(false);
	expect(
		parseReadingKnowledge({ source: houseReading, knowledge }).success,
	).toBe(false);
});

test("published changes reject Retract values without changing Knowledge", () => {
	const knowledge = { semanticRelations: { synonym: [berlinLemma] } };
	const snapshot = structuredClone(knowledge);
	const change = {
		kind: "Retract",
		aspect: "semanticRelations",
		relation: "synonym",
		value: [berlinLemma],
	};
	expect(knowledgeChangeSchema.safeParse(change).success).toBe(false);
	const result = applyKnowledgeChange({
		source: houseReading,
		knowledge,
		change,
	});
	expect(result.success).toBe(false);
	expect(result).not.toHaveProperty("value");
	expect(knowledge).toEqual(snapshot);
	expect(
		applyKnowledgeChange({
			source: houseReading,
			knowledge,
			change: {
				kind: "Retract",
				aspect: "semanticRelations",
				relation: "synonym",
			},
		}),
	).toEqual({ success: true, value: {} });
});
