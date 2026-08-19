import { describe, expect, test } from "bun:test";
import { applyDumdictKnowledgeChange } from "../../src";
import {
	englishRunReading,
	englishWalkLemma,
	englishWalkReading,
	enSerializedNotes,
} from "../fixtures/en-notes";

describe("Reading Knowledge Changes", () => {
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
