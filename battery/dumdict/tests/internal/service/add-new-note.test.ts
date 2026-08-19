import { describe, expect, test } from "bun:test";
import {
	createDumdictService,
	englishSwimCitationSurface,
	englishSwimDraft,
	englishSwimLemma,
	enSerializedNotes,
	getBootedUpDumdict,
	makeSurfaceId,
	type StoreRevision,
	type SurfaceEntry,
	withUnusedCleanupStorageMethods,
} from "./helpers";

describe("configured service", () => {
	test("addNewNote creates a new learner Reading", async () => {
		const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);

		const result = await dict.addNewNote({
			draft: englishSwimDraft,
		});

		const storedSwimNote = storage
			.loadAll()
			.find(
				({ lemmaRecord }) => lemmaRecord.lemma.canonicalForm === "swim",
			)?.readingEntries[0];

		expect(result.status).toBe("applied");
		expect(storedSwimNote?.attestations).toContain(
			"They swim every morning.",
		);
		expect(storedSwimNote?.notes).toBe("Core swimming reading.");
	});

	test("addNewNote creates owned surfaces from the draft", async () => {
		const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);

		const result = await dict.addNewNote({
			draft: {
				...englishSwimDraft,
				ownedSurfaces: [
					{
						surface: englishSwimCitationSurface,
						note: {
							attestedTranslations: ["swim"],
							attestations: ["They swim every morning."],
							notes: "Plain present form.",
						},
					},
				],
			},
		});

		const storedSwimNote = storage
			.loadAll()
			.find(
				({ lemmaRecord }) => lemmaRecord.lemma.canonicalForm === "swim",
			);

		expect(result.status).toBe("applied");
		expect(storedSwimNote?.ownedSurfaceEntries).toHaveLength(1);
		expect(
			storedSwimNote?.ownedSurfaceEntries[0]?.surface.normalizedSurface,
		).toBe("swim");
		expect(storedSwimNote?.ownedSurfaceEntries[0]?.notes).toBe(
			"Plain present form.",
		);
	});

	test("addNewNote rejects duplicate Reading identities", async () => {
		const { dict } = getBootedUpDumdict("en", enSerializedNotes);
		const existingWalkNote = enSerializedNotes[0];
		if (!existingWalkNote) {
			throw new Error("Expected English walk fixture.");
		}
		const existingWalkReading = existingWalkNote.readingEntries[0];
		if (!existingWalkReading) {
			throw new Error("Expected English walk Reading fixture.");
		}

		const result = await dict.addNewNote({
			draft: {
				reading: existingWalkReading.reading,
				note: {
					attestedTranslations:
						existingWalkReading.attestedTranslations,
					attestations: existingWalkReading.attestations,
					notes: existingWalkReading.notes,
				},
			},
		});

		expect(result).toMatchObject({
			status: "rejected",
			code: "readingAlreadyExists",
		});
	});

	test("addNewNote rejects existing owned-surface collisions", async () => {
		const existingSurfaceEntry = {
			id: makeSurfaceId("en", englishSwimCitationSurface),
			surface: englishSwimCitationSurface,
			ownerLemma: englishSwimLemma,
			attestedTranslations: ["swim"],
			attestations: ["They swim every morning."],
			notes: "Already stored elsewhere.",
		} satisfies SurfaceEntry<"en">;
		let commitCalls = 0;
		const storage = withUnusedCleanupStorageMethods({
			async findStoredReadings() {
				throw new Error("Unexpected storage call");
			},
			async loadReadingForPatch() {
				throw new Error("Unexpected storage call");
			},
			async loadNewNoteContext() {
				return {
					revision: "stub-1" as StoreRevision,
					existingOwnedSurfaces: [existingSurfaceEntry],
					explicitExistingLemmaTargets: [],
					existingPendingRelationsForProposedPendingTargets: [],
					pendingRelationsMatchingProposedLemma: [],
					relationLemmas: [],
					relationReadings: [],
				};
			},
			async commitChanges() {
				commitCalls += 1;
				throw new Error("Unexpected storage call");
			},
		});
		const dict = createDumdictService({ language: "en", storage });

		const result = await dict.addNewNote({
			draft: {
				...englishSwimDraft,
				ownedSurfaces: [
					{
						surface: englishSwimCitationSurface,
						note: {
							attestedTranslations: ["swim"],
							attestations: ["They swim every morning."],
							notes: "Plain present form.",
						},
					},
				],
			},
		});

		expect(result).toMatchObject({
			status: "rejected",
			code: "ownedSurfaceAlreadyExists",
		});
		expect(commitCalls).toBe(0);
	});

	test("addNewNote surfaces insert races as conflicts", async () => {
		const storage = withUnusedCleanupStorageMethods({
			async findStoredReadings() {
				throw new Error("Unexpected storage call");
			},
			async loadReadingForPatch() {
				throw new Error("Unexpected storage call");
			},
			async loadNewNoteContext() {
				return {
					revision: "new-1" as StoreRevision,
					existingOwnedSurfaces: [],
					explicitExistingLemmaTargets: [],
					existingPendingRelationsForProposedPendingTargets: [],
					pendingRelationsMatchingProposedLemma: [],
					relationLemmas: [],
					relationReadings: [],
				};
			},
			async commitChanges() {
				return {
					status: "conflict",
					code: "semanticPreconditionFailed",
					latestRevision: "new-2" as StoreRevision,
					message: "Reading was inserted concurrently.",
				};
			},
		});
		const dict = createDumdictService({ language: "en", storage });

		const result = await dict.addNewNote({
			draft: englishSwimDraft,
		});

		expect(result).toMatchObject({
			status: "conflict",
			code: "semanticPreconditionFailed",
			baseRevision: "new-1",
			latestRevision: "new-2",
		});
	});
});
