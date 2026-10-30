import { beforeAll, expect, test } from "bun:test";
import type * as Dumrel from "dumrel/types";
import { berlinLemma, houseReading } from "./fixtures.js";
import { buildPublishedPackage, distFile } from "./published-build.js";

let published: typeof import("../src/index.ts");
let schemas: typeof import("../src/schemas.ts");

beforeAll(async () => {
	await buildPublishedPackage();
	published = await import(distFile("index.js"));
	schemas = await import(distFile("schemas.js"));
}, 60_000);

const rootShadow = {
	language: "de",
	family: "Morpheme",
	kind: "Root",
	canonicalForm: "haus",
} as const;
const zeroEnding = {
	language: "de",
	family: "Morpheme",
	kind: "Ending",
	canonicalForm: "∅",
} as const;

test("published schemas and runtime agree on normalized, structured Knowledge", () => {
	const knowledge = {
		transcription: " haʊs ",
		definition: " Geba\u0308ude ",
		translations: { en: [[{ kind: "Text", text: " house " }]] },
		breakdown: {
			morphemes: [
				{ letters: "haus", target: rootShadow },
				{ letters: "", target: zeroEnding },
			],
		},
		semanticRelations: { nearSynonym: [berlinLemma] },
	} satisfies Dumrel.ReadingKnowledge;
	const expected = {
		...knowledge,
		transcription: "haʊs",
		definition: "Gebäude",
		translations: { en: [[{ kind: "Text" as const, text: "house" }]] },
	};
	expect(schemas.readingKnowledgeSchema.parse(knowledge)).toEqual(expected);
	expect(
		published.parseReadingKnowledge({ source: houseReading, knowledge }),
	).toEqual({
		success: true,
		value: expected,
	});
});

test.each([
	[
		"a primitive Reading",
		{ breakdown: { morphemes: [{ letters: "haus", target: 123 }] } },
	],
])("published schemas and runtime reject %s", (_, knowledge) => {
	expect(schemas.readingKnowledgeSchema.safeParse(knowledge).success).toBe(
		false,
	);
	expect(
		published.parseReadingKnowledge({ source: houseReading, knowledge })
			.success,
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
	expect(schemas.knowledgeChangeSchema.safeParse(change).success).toBe(false);
	const result = published.applyKnowledgeChange({
		source: houseReading,
		knowledge,
		change,
	});
	expect(result.success).toBe(false);
	expect(result).not.toHaveProperty("value");
	expect(knowledge).toEqual(snapshot);
	expect(
		published.applyKnowledgeChange({
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
