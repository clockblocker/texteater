import { describe, expect, test } from "bun:test";
import {
	createDumdictService,
	englishRunReading,
	englishWalkLemma,
	englishWalkReading,
	englishWalkReadingEntry,
	enSerializedNotes,
	getBootedUpDumdict,
	type StoreRevision,
	withUnusedCleanupStorageMethods,
} from "./helpers";

describe("configured service", () => {
	test("addAttestation appends an attestation to an existing Reading", async () => {
		const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);

		const result = await dict.addAttestation({
			reading: englishWalkReading,
			attestation: "I walk every morning.",
		});

		expect(result.status).toBe("applied");
		expect(storage.loadAll()[0]?.readingEntries[0]?.attestations).toContain(
			"I walk every morning.",
		);
	});

	test("addAttestation reports a missing Reading cleanly", async () => {
		const { dict } = getBootedUpDumdict("en", enSerializedNotes);

		const result = await dict.addAttestation({
			reading: englishRunReading,
			attestation: "They run every day.",
		});

		expect(result).toMatchObject({
			status: "rejected",
			code: "readingMissing",
		});
	});

	test("addAttestation rejects patch slices for a different Reading", async () => {
		let commitCalls = 0;
		const storage = withUnusedCleanupStorageMethods({
			async findStoredReadings() {
				throw new Error("Unexpected storage call");
			},
			async loadReadingForPatch() {
				return {
					revision: "patch-1" as StoreRevision,
					reading: englishWalkReadingEntry(),
				};
			},
			async loadNewNoteContext() {
				throw new Error("Unexpected storage call");
			},
			async commitChanges() {
				commitCalls += 1;
				throw new Error("Unexpected storage call");
			},
		});
		const dict = createDumdictService({ language: "en", storage });

		await expect(
			dict.addAttestation({
				reading: englishRunReading,
				attestation: "They run every day.",
			}),
		).rejects.toThrow("reading patch slice");
		expect(commitCalls).toBe(0);
	});

	test("addAttestation reloads patch context instead of using stale lookup revision", async () => {
		let committedBaseRevision: StoreRevision | undefined;
		const storage = withUnusedCleanupStorageMethods({
			async findStoredReadings() {
				return {
					revision: "lookup-1" as StoreRevision,
					candidates: [
						{
							reading: englishWalkReadingEntry(),
							lemma: { lemma: englishWalkLemma },
						},
					],
				};
			},
			async loadReadingForPatch() {
				return {
					revision: "patch-2" as StoreRevision,
					reading: englishWalkReadingEntry(),
				};
			},
			async loadNewNoteContext() {
				throw new Error("Unexpected storage call");
			},
			async commitChanges(request) {
				committedBaseRevision = request.baseRevision;
				return {
					status: "committed",
					nextRevision: "patch-3" as StoreRevision,
				};
			},
		});
		const dict = createDumdictService({ language: "en", storage });

		await dict.findStoredReadings({
			lemma: englishWalkLemma,
		});
		const result = await dict.addAttestation({
			reading: englishWalkReading,
			attestation: "We walk after dinner.",
		});

		expect(result.status).toBe("applied");
		if (result.status !== "applied") {
			throw new Error("Expected applied attestation result.");
		}
		expect(result.baseRevision).toBe("patch-2");
		expect(committedBaseRevision).toBe("patch-2");
	});

	test("addAttestation surfaces storage conflicts as mutation results", async () => {
		const storage = withUnusedCleanupStorageMethods({
			async findStoredReadings() {
				throw new Error("Unexpected storage call");
			},
			async loadReadingForPatch() {
				return {
					revision: "patch-1" as StoreRevision,
					reading: englishWalkReadingEntry(),
				};
			},
			async loadNewNoteContext() {
				throw new Error("Unexpected storage call");
			},
			async commitChanges() {
				return {
					status: "conflict",
					code: "revisionConflict",
					latestRevision: "patch-2" as StoreRevision,
				};
			},
		});
		const dict = createDumdictService({ language: "en", storage });

		const result = await dict.addAttestation({
			reading: englishWalkReading,
			attestation: "We walk after dinner.",
		});

		expect(result).toMatchObject({
			status: "conflict",
			code: "revisionConflict",
			baseRevision: "patch-1",
			latestRevision: "patch-2",
		});
	});
});
