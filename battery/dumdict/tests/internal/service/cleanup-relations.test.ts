import { describe, expect, test } from "bun:test";
import {
	createDumdictService,
	englishRunDraft,
	englishRunReading,
	englishSwimDraft,
	englishSwimReading,
	englishWalkReading,
	enSerializedNotesWithPendingSwimRelation,
	getBootedUpDumdict,
	pendingSwimEntryId,
} from "./helpers";

describe("relations cleanup", () => {
	test("reports exact pending records and zero matches without resolving", async () => {
		const { dict, storage } = getBootedUpDumdict(
			"en",
			enSerializedNotesWithPendingSwimRelation,
		);
		const info = await dict.getInfoForRelationsCleanup({
			canonicalForm: "swim",
		});
		expect(info.candidateLemmas).toEqual([]);
		expect(info.pendingRelations).toHaveLength(1);
		expect(info.pendingRelations[0]).toMatchObject({
			sourceReading: englishWalkReading,
			pending: {
				relation: "nearSynonym",
				target: {
					language: "en",
					canonicalForm: "swim",
					family: "Lexeme",
					kind: "VERB",
				},
			},
		});
		expect(
			storage
				.loadAll()
				.flatMap(({ pendingRelations }) => pendingRelations),
		).toHaveLength(1);
	});

	test("acceptance atomically writes forward/inverse Knowledge and removes only the exact pending record", async () => {
		const { dict, storage } = getBootedUpDumdict(
			"en",
			enSerializedNotesWithPendingSwimRelation,
		);
		await dict.addNewNote({ draft: englishSwimDraft });
		const info = await dict.getInfoForRelationsCleanup({
			canonicalForm: "swim",
		});
		const locator = info.pendingRelations[0]?.locator;
		if (!locator) throw new Error("Expected pending relation.");
		const result = await dict.cleanupRelations({
			baseRevision: info.revision,
			resolutions: [{ locator, targetReading: englishSwimReading }],
		});
		const readings = storage
			.loadAll()
			.flatMap(({ readingEntries }) => readingEntries);
		expect(result.status).toBe("applied");
		expect(
			readings.find(({ reading }) => reading.emojiDescription === "🚶")
				?.knowledge?.semanticRelations?.nearSynonym,
		).toEqual([englishSwimReading]);
		expect(
			readings.find(({ reading }) => reading.emojiDescription === "🏊")
				?.knowledge?.semanticRelations?.nearSynonym,
		).toEqual([englishWalkReading]);
		expect(
			storage
				.loadAll()
				.flatMap(({ pendingRelations }) => pendingRelations),
		).toEqual([]);
	});

	test("explicit discard removes no Knowledge", async () => {
		const { dict, storage } = getBootedUpDumdict(
			"en",
			enSerializedNotesWithPendingSwimRelation,
		);
		const info = await dict.getInfoForRelationsCleanup({
			canonicalForm: "swim",
		});
		const locator = info.pendingRelations[0]?.locator;
		if (!locator) throw new Error("Expected pending relation.");
		expect(
			(
				await dict.cleanupRelations({
					baseRevision: info.revision,
					resolutions: [{ locator }],
				})
			).status,
		).toBe("applied");
		expect(
			storage
				.loadAll()
				.flatMap(({ pendingRelations }) => pendingRelations),
		).toEqual([]);
		expect(
			storage.loadAll()[0]?.readingEntries[0]?.knowledge,
		).toBeUndefined();
	});

	test("rolls back staged forward, inverse, and delete changes when a later cleanup operation fails", async () => {
		const { dict, storage } = getBootedUpDumdict(
			"en",
			enSerializedNotesWithPendingSwimRelation,
		);
		await dict.addNewNote({ draft: englishSwimDraft });
		const info = await dict.getInfoForRelationsCleanup({
			canonicalForm: "swim",
		});
		const locator = info.pendingRelations[0]?.locator;
		if (!locator) throw new Error("Expected pending relation.");
		const failingDict = createDumdictService({
			language: "en",
			storage: {
				...storage,
				async commitChanges(request) {
					return storage.commitChanges({
						...request,
						changes: [
							...request.changes,
							{
								type: "patchReading",
								reading: englishWalkReading,
								ops: [
									{
										kind: "addAttestation",
										value: "must roll back",
									},
								],
								preconditions: [
									{
										kind: "readingMissing",
										reading: englishWalkReading,
									},
								],
							},
						],
					});
				},
			},
		});
		const result = await failingDict.cleanupRelations({
			baseRevision: info.revision,
			resolutions: [{ locator, targetReading: englishSwimReading }],
		});
		expect(result.status).toBe("conflict");
		const notes = storage.loadAll();
		expect(
			notes.flatMap(({ pendingRelations }) => pendingRelations),
		).toHaveLength(1);
		const readings = notes.flatMap(({ readingEntries }) => readingEntries);
		expect(
			readings.find(({ reading }) => reading.emojiDescription === "🚶")
				?.knowledge,
		).toBeUndefined();
		expect(
			readings.find(({ reading }) => reading.emojiDescription === "🏊")
				?.knowledge,
		).toBeUndefined();
		expect(
			readings
				.find(({ reading }) => reading.emojiDescription === "🚶")
				?.attestations.includes("must roll back"),
		).toBe(false);
	});

	test("removes only the selected locator when records share one target ref", async () => {
		const legacy = structuredClone(
			enSerializedNotesWithPendingSwimRelation,
		);
		legacy[0]?.pendingRelations.push({
			relationFamily: "lexical",
			sourceReading: englishWalkReading,
			relation: "antonym",
			targetPendingId: pendingSwimEntryId,
		} as never);
		const { dict, storage } = getBootedUpDumdict("en", legacy);
		const info = await dict.getInfoForRelationsCleanup({
			canonicalForm: "swim",
		});
		const locator = info.pendingRelations.find(
			({ pending }) => pending.relation === "nearSynonym",
		)?.locator;
		if (!locator) throw new Error("Expected pending near synonym.");
		await dict.cleanupRelations({
			baseRevision: info.revision,
			resolutions: [{ locator }],
		});
		expect(
			storage
				.loadAll()
				.flatMap(({ pendingRelations }) => pendingRelations)
				.map(({ pending }) => pending.relation),
		).toEqual(["antonym"]);
	});

	test("requires explicit selection among multiple matching Readings and rejects a non-match", async () => {
		const { dict, storage } = getBootedUpDumdict(
			"en",
			enSerializedNotesWithPendingSwimRelation,
		);
		await dict.addNewNote({ draft: englishSwimDraft });
		const alternate = {
			...englishSwimDraft,
			reading: { ...englishSwimReading, emojiDescription: "🌊" },
		};
		await dict.addNewNote({ draft: alternate });
		await dict.addNewNote({ draft: englishRunDraft });
		const candidates = await dict.findStoredReadings({
			lemma: englishSwimReading.lemma,
		});
		expect(candidates.candidates).toHaveLength(2);
		let info = await dict.getInfoForRelationsCleanup({
			canonicalForm: "swim",
		});
		expect(info.pendingRelations).toHaveLength(1);
		const locator = info.pendingRelations[0]?.locator;
		if (!locator) throw new Error("Expected pending relation.");
		expect(
			await dict.cleanupRelations({
				baseRevision: info.revision,
				resolutions: [{ locator, targetReading: englishRunReading }],
			}),
		).toMatchObject({ status: "rejected", code: "invalidRequest" });
		info = await dict.getInfoForRelationsCleanup({ canonicalForm: "swim" });
		await dict.cleanupRelations({
			baseRevision: info.revision,
			resolutions: [{ locator, targetReading: alternate.reading }],
		});
		const readings = storage
			.loadAll()
			.flatMap(({ readingEntries }) => readingEntries);
		expect(
			readings.find(({ reading }) => reading.emojiDescription === "🏊")
				?.knowledge,
		).toBeUndefined();
		expect(
			readings.find(({ reading }) => reading.emojiDescription === "🌊")
				?.knowledge?.semanticRelations?.nearSynonym,
		).toEqual([englishWalkReading]);
	});
});
