import { describe, expect, test } from "bun:test";
import {
	createDumdictService,
	type DumdictStoragePort,
	englishSwimLemma,
	englishSwimLemmaSurface,
	enSerializedNotes,
	getBootedUpDumdict,
	makeDumlingIdFor,
	type StoreRevision,
	type SurfaceEntry,
	withUnusedCleanupStorageMethods,
} from "./helpers";

describe("configured service", () => {
	test("addNewNote creates a new lemma note", async () => {
		const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);

		const result = await dict.addNewNote({
			draft: {
				lemma: englishSwimLemma,
				note: {
					attestedTranslations: ["swim"],
					attestations: ["They swim every morning."],
					notes: "Move through water by moving the body.",
				},
			},
		});

		const storedSwimNote = storage
			.loadAll()
			.find(
				({ lemmaEntry }) => lemmaEntry.lemma.canonicalLemma === "swim",
			)?.lemmaEntry;

		expect(result.status).toBe("applied");
		expect(storedSwimNote?.attestations).toContain("They swim every morning.");
		expect(storedSwimNote?.notes).toBe(
			"Move through water by moving the body.",
		);
	});

	test("addNewNote creates owned surfaces from the draft", async () => {
		const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);

		const result = await dict.addNewNote({
			draft: {
				lemma: englishSwimLemma,
				note: {
					attestedTranslations: ["swim"],
					attestations: ["They swim every morning."],
					notes: "Move through water by moving the body.",
				},
				ownedSurfaces: [
					{
						surface: englishSwimLemmaSurface,
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
			.find(({ lemmaEntry }) => lemmaEntry.lemma.canonicalLemma === "swim");

		expect(result.status).toBe("applied");
		expect(storedSwimNote?.ownedSurfaceEntries).toHaveLength(1);
		expect(
			storedSwimNote?.ownedSurfaceEntries[0]?.surface.normalizedFullSurface,
		).toBe("swim");
		expect(storedSwimNote?.ownedSurfaceEntries[0]?.notes).toBe(
			"Plain present form.",
		);
	});

	test("addNewNote rejects duplicate lemmas", async () => {
		const { dict } = getBootedUpDumdict("en", enSerializedNotes);
		const existingWalkNote = enSerializedNotes[0];
		if (!existingWalkNote) {
			throw new Error("Expected English walk fixture.");
		}

		const result = await dict.addNewNote({
			draft: {
				lemma: existingWalkNote.lemmaEntry.lemma,
				note: {
					attestedTranslations: ["walk"],
					attestations: ["We walk after dinner."],
					notes: "Duplicate draft.",
				},
			},
		});

		expect(result).toMatchObject({
			status: "rejected",
			code: "lemmaAlreadyExists",
		});
	});

	test("addNewNote rejects existing owned-surface collisions", async () => {
		const existingSurfaceEntry = {
			id: makeDumlingIdFor("en", englishSwimLemmaSurface),
			surface: englishSwimLemmaSurface,
			ownerLemmaId: makeDumlingIdFor("en", englishSwimLemma),
			attestedTranslations: ["swim"],
			attestations: ["They swim every morning."],
			notes: "Already stored elsewhere.",
		} satisfies SurfaceEntry<"en">;
		let commitCalls = 0;
		const storage = withUnusedCleanupStorageMethods({
			async findStoredLemmaSenses() {
				throw new Error("Unexpected storage call");
			},
			async loadLemmaForPatch() {
				throw new Error("Unexpected storage call");
			},
			async loadNewNoteContext() {
				return {
					revision: "stub-1" as StoreRevision,
					existingOwnedSurfaces: [existingSurfaceEntry],
					explicitExistingRelationTargets: [],
					existingPendingRefsForProposedPendingTargets: [],
					matchingPendingRefsForNewLemma: [],
					incomingPendingRelationsForNewLemma: [],
					incomingPendingSourceLemmas: [],
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
				lemma: englishSwimLemma,
				note: {
					attestedTranslations: ["swim"],
					attestations: ["They swim every morning."],
					notes: "Move through water by moving the body.",
				},
				ownedSurfaces: [
					{
						surface: englishSwimLemmaSurface,
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
			async findStoredLemmaSenses() {
				throw new Error("Unexpected storage call");
			},
			async loadLemmaForPatch() {
				throw new Error("Unexpected storage call");
			},
			async loadNewNoteContext() {
				return {
					revision: "new-1" as StoreRevision,
					existingOwnedSurfaces: [],
					explicitExistingRelationTargets: [],
					existingPendingRefsForProposedPendingTargets: [],
					matchingPendingRefsForNewLemma: [],
					incomingPendingRelationsForNewLemma: [],
					incomingPendingSourceLemmas: [],
				};
			},
			async commitChanges() {
				return {
					status: "conflict",
					code: "semanticPreconditionFailed",
					latestRevision: "new-2" as StoreRevision,
					message: "Lemma was inserted concurrently.",
				};
			},
		});
		const dict = createDumdictService({ language: "en", storage });

		const result = await dict.addNewNote({
			draft: {
				lemma: englishSwimLemma,
				note: {
					attestedTranslations: ["swim"],
					attestations: ["They swim every morning."],
					notes: "Move through water by moving the body.",
				},
			},
		});

		expect(result).toMatchObject({
			status: "conflict",
			code: "semanticPreconditionFailed",
			baseRevision: "new-1",
			latestRevision: "new-2",
		});
	});
});
