import { describe, expect, test } from "bun:test";
import {
	englishSwimDraft,
	englishSwimLemma,
	englishSwimReading,
	englishWalkReading,
	enSerializedNotesWithPendingSwimRelation,
	getBootedUpDumdict,
	pendingSwimEntryId,
} from "./helpers";

describe("relations cleanup", () => {
	test("reports stored Lemmas and pending lexical relations by canonical form", async () => {
		const { dict } = getBootedUpDumdict(
			"en",
			enSerializedNotesWithPendingSwimRelation,
		);

		const beforeSwimExists = await dict.getInfoForRelationsCleanup({
			canonicalForm: "swim",
		});

		expect(beforeSwimExists.canonicalForm).toBe("swim");
		expect(beforeSwimExists.candidateLemmas).toEqual([]);
		expect(beforeSwimExists.pendingRelations).toEqual([
			{
				relationFamily: "lexical",
				sourceReading: englishWalkReading,
				relation: "nearSynonym",
				pendingRef: {
					pendingId: pendingSwimEntryId,
					language: "en",
					canonicalForm: "swim",
					family: "Lexeme",
					kind: "VERB",
				},
			},
		]);
	});

	test("resolves a pending lexical relation to a Reading and adds its inverse", async () => {
		const { dict, storage } = getBootedUpDumdict("en", [
			...enSerializedNotesWithPendingSwimRelation,
			{
				lemmaRecord: {
					lemma: englishSwimLemma,
					morphologicalRelations: {},
				},
				readingEntries: [
					{
						reading: englishSwimDraft.reading,
						lexicalRelations: {},
						...englishSwimDraft.note,
					},
				],
				ownedSurfaceEntries: [],
				pendingRelations: [],
			},
		]);

		const info = await dict.getInfoForRelationsCleanup({
			canonicalForm: "swim",
		});
		const result = await dict.cleanupRelations({
			baseRevision: info.revision,
			resolutions: [
				{
					relationFamily: "lexical",
					sourceReading: englishWalkReading,
					relation: "nearSynonym",
					targetPendingId: pendingSwimEntryId,
					targetReading: englishSwimReading,
				},
			],
		});

		const readings = storage
			.loadAll()
			.flatMap(({ readingEntries }) => readingEntries);
		expect(result.status).toBe("applied");
		expect(
			readings.find(
				({ reading }) =>
					reading.emojiDescription ===
					englishWalkReading.emojiDescription,
			)?.lexicalRelations.nearSynonym,
		).toEqual([englishSwimReading]);
		expect(
			readings.find(
				({ reading }) =>
					reading.emojiDescription ===
					englishSwimReading.emojiDescription,
			)?.lexicalRelations.nearSynonym,
		).toEqual([englishWalkReading]);
		expect(
			storage
				.loadAll()
				.flatMap(({ pendingRelations }) => pendingRelations),
		).toEqual([]);
	});

	test("can discard an unresolved pending relation", async () => {
		const { dict, storage } = getBootedUpDumdict(
			"en",
			enSerializedNotesWithPendingSwimRelation,
		);
		const info = await dict.getInfoForRelationsCleanup({
			canonicalForm: "swim",
		});

		const result = await dict.cleanupRelations({
			baseRevision: info.revision,
			resolutions: [
				{
					relationFamily: "lexical",
					sourceReading: englishWalkReading,
					relation: "nearSynonym",
					targetPendingId: pendingSwimEntryId,
				},
			],
		});

		expect(result.status).toBe("applied");
		expect(
			storage
				.loadAll()
				.flatMap(({ pendingRelations }) => pendingRelations),
		).toEqual([]);
	});
});
