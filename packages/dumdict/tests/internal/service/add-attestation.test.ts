import { describe, expect, test } from "bun:test";
import {
	createDumdictService,
	englishRunLemmaId,
	englishWalkEntry,
	englishWalkLemmaId,
	enSerializedNotes,
	getBootedUpDumdict,
	type StoreRevision,
	withUnusedCleanupStorageMethods,
} from "./helpers";

describe("configured service", () => {
	test("addAttestation appends an attestation to an existing lemma", async () => {
		const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);

		const result = await dict.addAttestation({
			lemmaId: englishWalkLemmaId,
			attestation: "I walk every morning.",
		});

		expect(result.status).toBe("applied");
		expect(storage.loadAll()[0]?.lemmaEntry.attestations).toContain(
			"I walk every morning.",
		);
	});

	test("addAttestation reports a missing lemma cleanly", async () => {
		const { dict } = getBootedUpDumdict("en", enSerializedNotes);

		const result = await dict.addAttestation({
			lemmaId: englishRunLemmaId,
			attestation: "They run every day.",
		});

		expect(result).toMatchObject({
			status: "rejected",
			code: "lemmaMissing",
		});
	});

	test("addAttestation rejects patch slices for a different lemma", async () => {
		let commitCalls = 0;
		const storage = withUnusedCleanupStorageMethods({
			async findStoredLemmaSenses() {
				throw new Error("Unexpected storage call");
			},
			async loadLemmaForPatch() {
				return {
					revision: "patch-1" as StoreRevision,
					lemma: englishWalkEntry(),
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
				lemmaId: englishRunLemmaId,
				attestation: "They run every day.",
			}),
		).rejects.toThrow("lemma patch slice");
		expect(commitCalls).toBe(0);
	});

	test("addAttestation reloads patch context instead of using stale lookup revision", async () => {
		let committedBaseRevision: StoreRevision | undefined;
		const storage = withUnusedCleanupStorageMethods({
			async findStoredLemmaSenses() {
				return {
					revision: "lookup-1" as StoreRevision,
					candidates: [{ entry: englishWalkEntry() }],
				};
			},
			async loadLemmaForPatch() {
				return {
					revision: "patch-2" as StoreRevision,
					lemma: englishWalkEntry(),
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

		await dict.findStoredLemmaSenses({
			lemmaDescription: {
				language: "en",
				canonicalLemma: "walk",
				lemmaKind: "Lexeme",
				lemmaSubKind: "VERB",
			},
		});
		const result = await dict.addAttestation({
			lemmaId: englishWalkLemmaId,
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
			async findStoredLemmaSenses() {
				throw new Error("Unexpected storage call");
			},
			async loadLemmaForPatch() {
				return {
					revision: "patch-1" as StoreRevision,
					lemma: englishWalkEntry(),
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
			lemmaId: englishWalkLemmaId,
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
