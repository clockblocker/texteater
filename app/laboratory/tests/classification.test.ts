import { expect, test } from "bun:test";
import type { buildDumgen } from "dumgen";

import {
	classifyGermanSegment,
	createGermanClassificationTrace,
} from "../src/classification";
import type { SegmentedSentence } from "../src/shared/contract";

test("a segment click executes Selection -> Surface -> Lemma -> Reading", async () => {
	const calls: string[] = [];
	const lemma = {
		language: "de",
		canonicalForm: "Bank",
		family: "Lexeme",
		kind: "NOUN",
		coreFeatures: { gender: "Fem", hyph: null },
	} as const;
	const generate = {
		laboratory: {
			classification: {
				de: {
					async selection() {
						calls.push("Selection");
						return {
							surfaceSegmentIndices: [2],
							selectedOrthography: "Standard" as const,
						};
					},
					async surface() {
						calls.push("Surface");
						return {
							normalizedSurface: "Banken",
							spelling: "Canonical" as const,
							realizationCoverage: "Full" as const,
							surfaceKind: "Inflection" as const,
							surfaceFeatures: null,
							inflectionalFeatures: [
								{ name: "case", value: "Nom" },
								{ name: "number", value: "Plur" },
							],
							lemmaFamily: "Lexeme",
							lemmaKind: "NOUN",
						};
					},
					async lemma() {
						calls.push("Lemma");
						return lemma;
					},
					async reading() {
						calls.push("Reading");
						return { lemma, emojiDescription: "🏦 Bank" };
					},
				},
			},
		},
	} as unknown as ReturnType<typeof buildDumgen>;
	const sentence = {
		id: "sentence-1",
		language: "de",
		sourceText: "Die Banken",
		selectedText: "Die Banken",
		selection: { start: 0, end: 10 },
		segments: [
			{
				index: 0,
				kind: "ResolvableText",
				text: "Die",
				start: 0,
				end: 3,
			},
			{
				index: 1,
				kind: "Whitespace",
				text: " ",
				start: 3,
				end: 4,
			},
			{
				index: 2,
				kind: "ResolvableText",
				text: "Banken",
				start: 4,
				end: 10,
			},
		],
	} satisfies SegmentedSentence;
	const trace = createGermanClassificationTrace();

	const entity = await classifyGermanSegment(generate, sentence, 2, trace);

	expect(calls).toEqual(["Selection", "Surface", "Lemma", "Reading"]);
	expect(entity.surface).toEqual({
		language: "de",
		normalizedSurface: "Banken",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		surfaceFeatures: null,
		inflectionalFeatures: { case: "Nom", number: "Plur" },
		lemma,
	});
	expect(entity.selection.surface).toEqual(entity.surface);
	expect(entity.reading).toEqual({ lemma, emojiDescription: "🏦 Bank" });
	expect(Object.keys(trace.inputs)).toEqual([
		"selection",
		"surface",
		"lemma",
		"reading",
	]);
});
