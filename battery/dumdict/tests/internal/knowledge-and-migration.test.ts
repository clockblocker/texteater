import { describe, expect, test } from "bun:test";
import { applyKnowledgeChange } from "dumrel";
import { readingKnowledgeSchema } from "dumrel/schema";
import type * as Dumrel from "dumrel/types";

import { applyDumdictKnowledgeChanges } from "../../src/core/apply-reading-knowledge-change";
import type {
	ReadingEntry,
	ReadingKnowledgeChange,
} from "../../src/domain-types";
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
		] as const satisfies readonly Dumrel.KnowledgeChange[];

		for (const existing of [undefined, {}] as const) {
			for (const change of changes) {
				const result = applyDumdictKnowledgeChanges(
					{
						...readingEntry,
						...(existing === undefined
							? {}
							: { knowledge: existing }),
					},
					[{ reading: englishWalkReading, change }],
				);
				const knowledge = result.knowledge ?? {};
				const expected = applyKnowledgeChange({
					source: englishWalkReading,
					knowledge: existing ?? {},
					change,
				});
				expect(expected.success).toBe(true);
				if (!expected.success) throw expected.error;
				expect(knowledge).toEqual(expected.value);
				expect(
					readingKnowledgeSchema.safeParse(knowledge).success,
				).toBe(true);
			}
		}
	});

	test("applies a patch's envelopes as applying them one by one would", () => {
		const readingEntry = enSerializedNotes[0]?.readingEntries[0];
		if (!readingEntry) throw new Error("Expected Reading fixture.");
		const envelope = (
			change: ReadingKnowledgeChange<"en">["change"],
		): ReadingKnowledgeChange<"en"> => ({
			reading: englishWalkReading,
			change,
		});
		const oneByOne = (
			envelopes: readonly ReadingKnowledgeChange<"en">[],
		) => {
			let entry: ReadingEntry<"en"> = readingEntry;
			for (const next of envelopes)
				entry = applyDumdictKnowledgeChanges(entry, [next]);
			return entry;
		};
		const errorOf = (run: () => unknown) => {
			try {
				run();
			} catch (error) {
				return error;
			}
			throw new Error("Expected a throw.");
		};
		const go = envelope({
			kind: "Contribute",
			aspect: "definition",
			value: " go ",
		});
		const changes = [
			go,
			envelope({
				kind: "Contribute",
				aspect: "semanticRelations",
				relation: "synonym",
				value: [englishRunLemma],
			}),
			envelope({
				kind: "Correct",
				aspect: "definition",
				value: "stroll",
			}),
		];
		expect(applyDumdictKnowledgeChanges(readingEntry, changes)).toEqual(
			oneByOne(changes),
		);
		expect(applyDumdictKnowledgeChanges(readingEntry, [])).toBe(
			readingEntry,
		);
		const conflict = envelope({
			kind: "Contribute",
			aspect: "definition",
			value: "run",
		});
		const sameLemma = envelope({
			kind: "Contribute",
			aspect: "semanticRelations",
			relation: "synonym",
			value: [englishWalkLemma],
		});
		for (const list of [
			[...changes, sameLemma],
			[go, conflict, sameLemma],
			[go, sameLemma, conflict],
		])
			expect(
				errorOf(() => applyDumdictKnowledgeChanges(readingEntry, list)),
			).toEqual(errorOf(() => oneByOne(list)));
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
					language: "en",
					value: [decomposed, decomposed],
				},
			] as const satisfies readonly Dumrel.KnowledgeChange[];
			let existing: Dumrel.ReadingKnowledge | undefined;
			for (const change of changes) {
				const result = applyDumdictKnowledgeChanges(
					{
						...readingEntry,
						...(existing === undefined
							? {}
							: { knowledge: existing }),
					},
					[{ reading: englishWalkReading, change }],
				);
				existing = result.knowledge ?? {};
				expect(readingKnowledgeSchema.safeParse(existing).success).toBe(
					true,
				);
			}
		}
	});

	test("keeps an explicit Lemma mode homogeneous", () => {
		const readingEntry = enSerializedNotes[0]?.readingEntries[0];
		if (!readingEntry) throw new Error("Expected Reading fixture.");
		const withLemmaMode = {
			...readingEntry,
			knowledge: {
				semanticRelations: {
					targetKind: "lemma" as const,
					synonym: [englishRunLemma],
				},
			},
		};
		const changed = applyDumdictKnowledgeChanges(withLemmaMode, [
			{
				reading: englishWalkReading,
				change: {
					kind: "Contribute",
					aspect: "semanticRelations",
					relation: "nearSynonym",
					targetKind: "lemma",
					value: [englishRunLemma],
				},
			},
		]);
		expect(changed.knowledge?.semanticRelations).toEqual({
			targetKind: "lemma",
			synonym: [englishRunLemma],
			nearSynonym: [englishRunLemma],
		});
		expect(() =>
			applyDumdictKnowledgeChanges(withLemmaMode, [
				{
					reading: englishWalkReading,
					change: {
						kind: "Contribute",
						aspect: "semanticRelations",
						relation: "synonym",
						targetKind: "reading",
						value: [englishRunReading],
					},
				},
			]),
		).toThrow("cannot mix");
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
		expect(applyDumdictKnowledgeChanges(readingEntry, [change])).toEqual(
			applyDumdictKnowledgeChanges({ ...readingEntry, knowledge: {} }, [
				change,
			]),
		);
		expect(() =>
			applyDumdictKnowledgeChanges(readingEntry, [
				{
					...change,
					change: { ...change.change, value: "" },
				},
			]),
		).toThrow();
		expect(() =>
			applyDumdictKnowledgeChanges(
				{
					...readingEntry,
					knowledge: { definition: 42 } as never,
				},
				[change],
			),
		).toThrow();
	});

	test("updates only the exact Reading and omits empty Knowledge", () => {
		const readingEntry = enSerializedNotes[0]?.readingEntries[0];
		if (!readingEntry) throw new Error("Expected Reading fixture.");
		const withTranscription = applyDumdictKnowledgeChanges(readingEntry, [
			{
				reading: englishWalkReading,
				change: {
					kind: "Contribute",
					aspect: "transcription",
					value: " wɔːk ",
				},
			},
		]);
		expect(withTranscription.knowledge?.transcription).toBe("wɔːk");
		const repeated = applyDumdictKnowledgeChanges(withTranscription, [
			{
				reading: englishWalkReading,
				change: {
					kind: "Contribute",
					aspect: "transcription",
					value: "wɔːk",
				},
			},
		]);
		expect(repeated).toEqual(withTranscription);
		const retracted = applyDumdictKnowledgeChanges(withTranscription, [
			{
				reading: englishWalkReading,
				change: { kind: "Retract", aspect: "transcription" },
			},
		]);
		expect(retracted.knowledge).toBeUndefined();
		expect(() =>
			applyDumdictKnowledgeChanges(readingEntry, [
				{
					reading: englishRunReading,
					change: {
						kind: "Contribute",
						aspect: "definition",
						value: "running",
					},
				},
			]),
		).toThrow("Reading");
		expect(() =>
			applyDumdictKnowledgeChanges(readingEntry, [
				{
					reading: englishWalkReading,
					change: {
						kind: "Contribute",
						aspect: "semanticRelations",
						relation: "synonym",
						value: [englishWalkLemma],
					},
				},
			]),
		).toThrow("same-Lemma");
	});
});
