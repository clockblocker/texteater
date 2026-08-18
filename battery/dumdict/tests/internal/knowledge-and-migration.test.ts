import { describe, expect, test } from "bun:test";
import {
	applyDumdictKnowledgeChange,
	DumdictV0MigrationError,
	migrateSerializedDictionaryNotesV0ToV1,
	type SerializedDictionaryNoteV0,
} from "../../src";
import { germanGehenReading } from "../fixtures/de-notes";
import {
	englishRunReading,
	englishSwimLemma,
	englishWalkLemma,
	englishWalkReading,
	enSerializedNotes,
	pendingSwimEntryId,
} from "../fixtures/en-notes";

function baseV0(): SerializedDictionaryNoteV0<"en"> {
	return structuredClone(
		enSerializedNotes[0] as SerializedDictionaryNoteV0<"en">,
	);
}

describe("owner-associated Knowledge Changes", () => {
	test("updates only the exact owner and omits empty Knowledge", () => {
		const lemmaRecord = { lemma: englishWalkLemma };
		const withTranscription = applyDumdictKnowledgeChange(lemmaRecord, {
			owner: { kind: "Lemma", lemma: englishWalkLemma },
			change: {
				kind: "Contribute",
				aspect: "transcriptions",
				language: "ipa",
				value: ["wɔːk"],
			},
		});
		expect(withTranscription.knowledge?.transcriptions).toEqual({
			ipa: ["wɔːk"],
		});
		const repeated = applyDumdictKnowledgeChange(withTranscription, {
			owner: { kind: "Lemma", lemma: englishWalkLemma },
			change: {
				kind: "Contribute",
				aspect: "transcriptions",
				language: "ipa",
				value: ["wɔːk"],
			},
		});
		expect(repeated).toEqual(withTranscription);
		const retracted = applyDumdictKnowledgeChange(withTranscription, {
			owner: { kind: "Lemma", lemma: englishWalkLemma },
			change: {
				kind: "Retract",
				aspect: "transcriptions",
				language: "ipa",
			},
		});
		expect(retracted.knowledge).toBeUndefined();
		expect(() =>
			applyDumdictKnowledgeChange(lemmaRecord, {
				owner: { kind: "Lemma", lemma: englishSwimLemma },
				change: {
					kind: "Contribute",
					aspect: "transcriptions",
					language: "ipa",
					value: ["swɪm"],
				},
			}),
		).toThrow("owner");
		expect(() =>
			applyDumdictKnowledgeChange(lemmaRecord, {
				owner: { kind: "Lemma", lemma: englishWalkLemma },
				change: {
					kind: "Contribute",
					aspect: "definition",
					value: "walking",
				},
			} as never),
		).toThrow("only transcription");

		const legacyReading = baseV0().readingEntries[0];
		if (!legacyReading) throw new Error("Expected legacy Reading fixture.");
		const { lexicalRelations: _legacyRelations, ...readingEntry } =
			legacyReading;
		expect(() =>
			applyDumdictKnowledgeChange(readingEntry, {
				owner: { kind: "Reading", reading: englishWalkReading },
				change: {
					kind: "Contribute",
					aspect: "transcriptions",
					language: "ipa",
					value: ["wɔːk"],
				},
			} as never),
		).toThrow("does not accept transcription");
		expect(() =>
			applyDumdictKnowledgeChange(readingEntry, {
				owner: { kind: "Reading", reading: englishRunReading },
				change: {
					kind: "Contribute",
					aspect: "definition",
					value: "running",
				},
			}),
		).toThrow("owner");
	});
});

describe("serialized note v0 to v1 migration", () => {
	test("reports legacy Reading descriptions that require an explicit reset or remap", () => {
		const note = baseV0();
		const reading = note.readingEntries[0];
		if (!reading) throw new Error("Expected legacy Reading fixture.");
		reading.reading = {
			...reading.reading,
			emojiDescription: "plain prose",
		};

		try {
			migrateSerializedDictionaryNotesV0ToV1([note]);
			throw new Error("Expected migration failure.");
		} catch (error) {
			expect(error).toBeInstanceOf(DumdictV0MigrationError);
			expect(
				(error as DumdictV0MigrationError<"en">).incompatibleReadings,
			).toEqual([
				expect.objectContaining({ emojiDescription: "plain prose" }),
			]);
		}
	});

	test("moves lexical relations and shared pending refs without copying encounter translations", () => {
		const note = baseV0();
		const reading = note.readingEntries[0];
		if (!reading) throw new Error("Expected legacy Reading fixture.");
		reading.lexicalRelations = {
			synonym: [englishRunReading],
		};
		note.pendingRefs = [
			{
				pendingId: pendingSwimEntryId,
				language: "en",
				canonicalForm: "swim",
				family: "Lexeme",
				kind: "VERB",
			},
		];
		note.pendingRelations = [
			{
				relationFamily: "lexical",
				sourceReading: englishWalkReading,
				relation: "nearSynonym",
				targetPendingId: pendingSwimEntryId,
			},
			{
				relationFamily: "lexical",
				sourceReading: englishWalkReading,
				relation: "antonym",
				targetPendingId: pendingSwimEntryId,
			},
		];
		const [migrated] = migrateSerializedDictionaryNotesV0ToV1([note]);
		expect(migrated?.schemaVersion).toBe(1);
		expect(
			migrated?.readingEntries[0]?.knowledge?.semanticRelations?.synonym,
		).toEqual([englishRunReading]);
		expect(migrated?.readingEntries[0]?.attestedTranslations).toEqual(
			note.readingEntries[0]?.attestedTranslations,
		);
		expect(
			migrated?.readingEntries[0]?.knowledge?.translations,
		).toBeUndefined();
		expect(migrated?.pendingRelations).toHaveLength(2);
		expect(
			migrated?.pendingRelations.map(({ locator }) => locator.relation),
		).toEqual(["nearSynonym", "antonym"]);
	});

	test("reports duplicate, missing, and orphan pending IDs with no output", () => {
		const note = baseV0();
		note.pendingRefs = [
			{
				pendingId: pendingSwimEntryId,
				language: "en",
				canonicalForm: "swim",
				family: "Lexeme",
				kind: "VERB",
			},
			{
				pendingId: pendingSwimEntryId,
				language: "en",
				canonicalForm: "swim",
				family: "Lexeme",
				kind: "VERB",
			},
		];
		const missing =
			"pending-entry:v2:en:Lexeme:VERB:missing" as typeof pendingSwimEntryId;
		note.pendingRelations = [
			{
				relationFamily: "lexical",
				sourceReading: englishWalkReading,
				relation: "synonym",
				targetPendingId: missing,
			},
		];
		try {
			migrateSerializedDictionaryNotesV0ToV1([note]);
			throw new Error("Expected migration failure.");
		} catch (error) {
			expect(error).toBeInstanceOf(DumdictV0MigrationError);
			const failure = error as DumdictV0MigrationError<"en">;
			expect(failure.duplicatePendingIds).toEqual([pendingSwimEntryId]);
			expect(failure.missingPendingIds).toEqual([missing]);
			expect(failure.orphanPendingIds).toEqual([pendingSwimEntryId]);
		}
	});

	test("normalizes and deduplicates migrated direct Reading targets", () => {
		const note = baseV0();
		const reading = note.readingEntries[0];
		if (!reading) throw new Error("Expected legacy Reading fixture.");
		reading.lexicalRelations = {
			synonym: [
				{ ...englishRunReading, emojiDescription: "  🏃  " },
				englishRunReading,
			],
		};
		const [migrated] = migrateSerializedDictionaryNotesV0ToV1([note]);
		expect(
			migrated?.readingEntries[0]?.knowledge?.semanticRelations?.synonym,
		).toEqual([englishRunReading]);
	});

	test("reports pending language mismatches and invalid direct edges together", () => {
		const note = baseV0();
		const reading = note.readingEntries[0];
		if (!reading) throw new Error("Expected legacy Reading fixture.");
		reading.lexicalRelations = {
			synonym: [englishWalkReading],
			antonym: [germanGehenReading as never],
		};
		const crossLanguagePendingId =
			"pending-entry:v2:de:Lexeme:VERB:gehen" as typeof pendingSwimEntryId;
		note.pendingRefs = [
			{
				pendingId: crossLanguagePendingId,
				language: "de",
				canonicalForm: "gehen",
				family: "Lexeme",
				kind: "VERB",
			} as never,
		];
		note.pendingRelations = [
			{
				relationFamily: "lexical",
				sourceReading: englishWalkReading,
				relation: "nearSynonym",
				targetPendingId: crossLanguagePendingId,
			},
		];
		try {
			migrateSerializedDictionaryNotesV0ToV1([note]);
			throw new Error("Expected migration failure.");
		} catch (error) {
			expect(error).toBeInstanceOf(DumdictV0MigrationError);
			expect(
				(
					error as DumdictV0MigrationError<"en">
				).invalidSemanticRelations.map(({ kind }) => kind),
			).toEqual([
				"pendingLanguageMismatch",
				"directSelfRelation",
				"directLanguageMismatch",
			]);
		}
	});

	test("omits empty morphology and rejects every non-empty legacy morphology value", () => {
		const empty = migrateSerializedDictionaryNotesV0ToV1([baseV0()]);
		expect(empty[0]?.lemmaRecord.knowledge).toBeUndefined();
		const note = baseV0();
		note.lemmaRecord.morphologicalRelations = {
			derivedFrom: [englishSwimLemma],
		};
		expect(() => migrateSerializedDictionaryNotesV0ToV1([note])).toThrow(
			DumdictV0MigrationError,
		);
		try {
			migrateSerializedDictionaryNotesV0ToV1([note]);
		} catch (error) {
			expect(
				(error as DumdictV0MigrationError<"en">).unresolvedMorphology,
			).toEqual([
				{
					kind: "stored",
					owner: englishWalkLemma,
					relation: "derivedFrom",
					targets: [englishSwimLemma],
				},
			]);
		}

		const pendingNote = baseV0();
		pendingNote.pendingRelations = [
			{
				relationFamily: "morphological",
				sourceLemma: englishWalkLemma,
				relation: "usedIn",
				targetPendingId: pendingSwimEntryId,
			},
		];
		try {
			migrateSerializedDictionaryNotesV0ToV1([pendingNote]);
			throw new Error("Expected morphology migration failure.");
		} catch (error) {
			expect(
				(error as DumdictV0MigrationError<"en">).unresolvedMorphology,
			).toEqual([
				{
					kind: "pending",
					sourceLemma: englishWalkLemma,
					relation: "usedIn",
					targetPendingId: pendingSwimEntryId,
				},
			]);
		}
	});
});
