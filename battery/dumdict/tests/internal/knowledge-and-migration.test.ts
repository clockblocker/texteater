import { describe, expect, test } from "bun:test";
import { applyKnowledgeChange } from "dumrel";
import { readingKnowledgeSchema } from "dumrel/schema";
import type { KnowledgeChange, ReadingKnowledge } from "dumrel/types";
import { applyDumdictKnowledgeChange } from "../../src";
import {
	englishRunLemma,
	englishRunReading,
	englishWalkLemma,
	englishWalkReading,
	enSerializedNotes,
} from "../fixtures/en-notes";

describe("Reading Knowledge Changes", () => {
	test("constructs canonical Knowledge for every validated change branch", () => {
		const readingEntry = enSerializedNotes[0]?.readingEntries[0];
		if (!readingEntry) throw new Error("Expected Reading fixture.");
		const shadow = {
			canonicalForm: "walk",
			family: "Lexeme",
			kind: "VERB",
			language: "en",
		} as const;
		const changes = [
			{ kind: "Contribute", aspect: "transcription", value: " t " },
			{ kind: "Retract", aspect: "transcription" },
			{
				kind: "Contribute",
				aspect: "translations",
				language: "en",
				value: [" house "],
			},
			{ kind: "Retract", aspect: "translations", language: "en" },
			{
				kind: "Contribute",
				aspect: "semanticRelations",
				relation: "synonym",
				value: [englishRunLemma],
			},
			{
				kind: "Retract",
				aspect: "semanticRelations",
				relation: "synonym",
			},
			{ kind: "Correct", aspect: "definition", value: " home " },
			{ kind: "Retract", aspect: "definition" },
			{
				kind: "Contribute",
				aspect: "morphologicalTree",
				value: {
					root: {
						nodeKind: "structure",
						children: [
							{ nodeKind: "unitShadow", unitShadow: shadow },
						],
					},
				},
			},
			{ kind: "Retract", aspect: "morphologicalTree" },
			{
				kind: "Contribute",
				aspect: "lexicalBreakdown",
				value: [shadow, shadow],
			},
			{ kind: "Retract", aspect: "lexicalBreakdown" },
		] as const satisfies readonly KnowledgeChange[];

		for (const existing of [undefined, {}] as const) {
			for (const change of changes) {
				const result = applyDumdictKnowledgeChange(
					{
						...readingEntry,
						...(existing === undefined
							? {}
							: { knowledge: existing }),
					},
					{ reading: englishWalkReading, change },
				);
				const knowledge = result.knowledge ?? {};
				expect(knowledge).toEqual(
					applyKnowledgeChange(existing, change),
				);
				expect(
					readingKnowledgeSchema.safeParse(knowledge).success,
				).toBe(true);
			}
		}
	});

	test("property: normalized scalar and bucket changes stay canonical", () => {
		const readingEntry = enSerializedNotes[0]?.readingEntries[0];
		if (!readingEntry) throw new Error("Expected Reading fixture.");
		for (let seed = 0; seed < 64; seed += 1) {
			const decomposed = ` value-${seed}-cafe\u0301 `;
			const changes = [
				{
					kind: "Correct",
					aspect: seed % 2 === 0 ? "definition" : "transcription",
					value: decomposed,
				},
				{
					kind: "Contribute",
					aspect: "translations",
					language: `lang-${seed}`,
					value: [decomposed, decomposed],
				},
			] as const satisfies readonly KnowledgeChange[];
			let existing: ReadingKnowledge | undefined;
			for (const change of changes) {
				const result = applyDumdictKnowledgeChange(
					{
						...readingEntry,
						...(existing === undefined
							? {}
							: { knowledge: existing }),
					},
					{ reading: englishWalkReading, change },
				);
				existing = result.knowledge ?? {};
				expect(readingKnowledgeSchema.safeParse(existing).success).toBe(
					true,
				);
			}
		}
	});

	test("treats absent Knowledge like canonical empty Knowledge without skipping guards", () => {
		const readingEntry = enSerializedNotes[0]?.readingEntries[0];
		if (!readingEntry) throw new Error("Expected Reading fixture.");
		const change = {
			reading: englishWalkReading,
			change: {
				kind: "Contribute" as const,
				aspect: "definition" as const,
				value: " a dwelling ",
			},
		};
		expect(applyDumdictKnowledgeChange(readingEntry, change)).toEqual(
			applyDumdictKnowledgeChange(
				{ ...readingEntry, knowledge: {} },
				change,
			),
		);
		expect(() =>
			applyDumdictKnowledgeChange(readingEntry, {
				...change,
				change: { ...change.change, value: "" },
			}),
		).toThrow();
		expect(() =>
			applyDumdictKnowledgeChange(
				{
					...readingEntry,
					knowledge: { definition: 42 } as never,
				},
				change,
			),
		).toThrow();
	});

	test("updates only the exact Reading and omits empty Knowledge", () => {
		const readingEntry = enSerializedNotes[0]?.readingEntries[0];
		if (!readingEntry) throw new Error("Expected Reading fixture.");
		const withTranscription = applyDumdictKnowledgeChange(readingEntry, {
			reading: englishWalkReading,
			change: {
				kind: "Contribute",
				aspect: "transcription",
				value: " wɔːk ",
			},
		});
		expect(withTranscription.knowledge?.transcription).toBe("wɔːk");
		const repeated = applyDumdictKnowledgeChange(withTranscription, {
			reading: englishWalkReading,
			change: {
				kind: "Contribute",
				aspect: "transcription",
				value: "wɔːk",
			},
		});
		expect(repeated).toEqual(withTranscription);
		const retracted = applyDumdictKnowledgeChange(withTranscription, {
			reading: englishWalkReading,
			change: { kind: "Retract", aspect: "transcription" },
		});
		expect(retracted.knowledge).toBeUndefined();
		expect(() =>
			applyDumdictKnowledgeChange(readingEntry, {
				reading: englishRunReading,
				change: {
					kind: "Contribute",
					aspect: "definition",
					value: "running",
				},
			}),
		).toThrow("Reading");
		expect(() =>
			applyDumdictKnowledgeChange(readingEntry, {
				reading: englishWalkReading,
				change: {
					kind: "Contribute",
					aspect: "semanticRelations",
					relation: "synonym",
					value: [englishWalkLemma],
				},
			}),
		).toThrow("same-Lemma");
	});
});
