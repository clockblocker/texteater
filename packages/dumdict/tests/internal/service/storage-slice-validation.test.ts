import { describe, expect, test } from "bun:test";
import {
	createDumdictService,
	type DumdictStoragePort,
	derivePendingLemmaId,
	englishRunLemmaId,
	englishSwimLemma,
	englishSwimLemmaSurface,
	englishWalkEntry,
	englishWalkLemma,
	englishWalkLemmaId,
	makeDumlingIdFor,
	pendingSwimLemmaId,
	type StoreRevision,
	type SurfaceEntry,
	withUnusedCleanupStorageMethods,
} from "./helpers";

describe("configured service", () => {
	test("findStoredLemmaSenses rejects storage slices with mismatched lemma IDs", async () => {
		const storage = withUnusedCleanupStorageMethods({
			async findStoredLemmaSenses() {
				return {
					revision: "corrupt-1" as StoreRevision,
					candidates: [
						{
							entry: {
								...englishWalkEntry(),
								id: englishRunLemmaId,
							},
						},
					],
				};
			},
			async loadLemmaForPatch() {
				throw new Error("Unexpected storage call");
			},
			async loadNewNoteContext() {
				throw new Error("Unexpected storage call");
			},
			async commitChanges() {
				throw new Error("Unexpected storage call");
			},
		});
		const dict = createDumdictService({ language: "en", storage });

		await expect(
			dict.findStoredLemmaSenses({
				lemmaDescription: {
					language: "en",
					canonicalLemma: "walk",
					lemmaKind: "Lexeme",
					lemmaSubKind: "VERB",
				},
			}),
		).rejects.toThrow("lemma entry id");
	});

	test("findStoredLemmaSenses rejects valid candidates outside the requested lemma description", async () => {
		const storage = withUnusedCleanupStorageMethods({
			async findStoredLemmaSenses() {
				return {
					revision: "corrupt-1" as StoreRevision,
					candidates: [{ entry: englishWalkEntry() }],
				};
			},
			async loadLemmaForPatch() {
				throw new Error("Unexpected storage call");
			},
			async loadNewNoteContext() {
				throw new Error("Unexpected storage call");
			},
			async commitChanges() {
				throw new Error("Unexpected storage call");
			},
		});
		const dict = createDumdictService({ language: "en", storage });

		await expect(
			dict.findStoredLemmaSenses({
				lemmaDescription: {
					language: "en",
					canonicalLemma: "swim",
					lemmaKind: "Lexeme",
					lemmaSubKind: "VERB",
				},
			}),
		).rejects.toThrow("stored lemma sense candidate");
	});

	test("addNewNote rejects storage slices whose existing lemma is not the draft lemma", async () => {
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
					revision: "corrupt-1" as StoreRevision,
					existingLemma: englishWalkEntry(),
					existingOwnedSurfaces: [],
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

		await expect(
			dict.addNewNote({
				draft: {
					lemma: englishSwimLemma,
					note: {
						attestedTranslations: ["swim"],
						attestations: ["They swim every morning."],
						notes: "Move through water by moving the body.",
					},
				},
			}),
		).rejects.toThrow("existing lemma");
		expect(commitCalls).toBe(0);
	});

	test("addNewNote rejects storage slices with inconsistent surface ownership", async () => {
		const corruptSurfaceEntry = {
			id: makeDumlingIdFor("en", englishSwimLemmaSurface),
			surface: englishSwimLemmaSurface,
			ownerLemmaId: englishRunLemmaId,
			attestedTranslations: ["swim"],
			attestations: ["They swim every morning."],
			notes: "Stored with the wrong owner.",
		} satisfies SurfaceEntry<"en">;
		const storage = withUnusedCleanupStorageMethods({
			async findStoredLemmaSenses() {
				throw new Error("Unexpected storage call");
			},
			async loadLemmaForPatch() {
				throw new Error("Unexpected storage call");
			},
			async loadNewNoteContext() {
				return {
					revision: "corrupt-1" as StoreRevision,
					existingOwnedSurfaces: [corruptSurfaceEntry],
					explicitExistingRelationTargets: [],
					existingPendingRefsForProposedPendingTargets: [],
					matchingPendingRefsForNewLemma: [],
					incomingPendingRelationsForNewLemma: [],
					incomingPendingSourceLemmas: [],
				};
			},
			async commitChanges() {
				throw new Error("Unexpected storage call");
			},
		});
		const dict = createDumdictService({ language: "en", storage });

		await expect(
			dict.addNewNote({
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
			}),
		).rejects.toThrow("surface owner lemma id");
	});

	test("addNewNote rejects storage slices with mismatched pending ref IDs", async () => {
		const storage = withUnusedCleanupStorageMethods({
			async findStoredLemmaSenses() {
				throw new Error("Unexpected storage call");
			},
			async loadLemmaForPatch() {
				throw new Error("Unexpected storage call");
			},
			async loadNewNoteContext() {
				return {
					revision: "corrupt-1" as StoreRevision,
					existingOwnedSurfaces: [],
					explicitExistingRelationTargets: [],
					existingPendingRefsForProposedPendingTargets: [
						{
							pendingId: pendingSwimLemmaId,
							language: "en",
							canonicalLemma: "walk fast",
							lemmaKind: "Lexeme",
							lemmaSubKind: "VERB",
						},
					],
					matchingPendingRefsForNewLemma: [],
					incomingPendingRelationsForNewLemma: [],
					incomingPendingSourceLemmas: [],
				};
			},
			async commitChanges() {
				throw new Error("Unexpected storage call");
			},
		});
		const dict = createDumdictService({ language: "en", storage });

		await expect(
			dict.addNewNote({
				draft: {
					lemma: englishSwimLemma,
					note: {
						attestedTranslations: ["swim"],
						attestations: ["They swim every morning."],
						notes: "Move through water by moving the body.",
					},
					relations: [
						{
							relationFamily: "lexical",
							relation: "nearSynonym",
							target: {
								kind: "pending",
								ref: {
									canonicalLemma: "walk fast",
									lemmaKind: "Lexeme",
									lemmaSubKind: "VERB",
								},
							},
						},
					],
				},
			}),
		).rejects.toThrow("pending ref id");
	});

	test("addNewNote rejects matching pending refs that do not match the draft lemma identity", async () => {
		const pendingWalkLemmaId = derivePendingLemmaId({
			language: "en",
			canonicalLemma: "walk",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
		});
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
					revision: "corrupt-1" as StoreRevision,
					existingOwnedSurfaces: [],
					explicitExistingRelationTargets: [],
					existingPendingRefsForProposedPendingTargets: [],
					matchingPendingRefsForNewLemma: [
						{
							pendingId: pendingWalkLemmaId,
							language: "en",
							canonicalLemma: "walk",
							lemmaKind: "Lexeme",
							lemmaSubKind: "VERB",
						},
					],
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

		await expect(
			dict.addNewNote({
				draft: {
					lemma: englishSwimLemma,
					note: {
						attestedTranslations: ["swim"],
						attestations: ["They swim every morning."],
						notes: "Move through water by moving the body.",
					},
				},
			}),
		).rejects.toThrow("matching pending ref");
		expect(commitCalls).toBe(0);
	});

	test("addNewNote rejects incoming pending relations for nonmatching pending targets", async () => {
		const pendingWalkLemmaId = derivePendingLemmaId({
			language: "en",
			canonicalLemma: "walk",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
		});
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
					revision: "corrupt-1" as StoreRevision,
					existingOwnedSurfaces: [],
					explicitExistingRelationTargets: [],
					existingPendingRefsForProposedPendingTargets: [],
					matchingPendingRefsForNewLemma: [
						{
							pendingId: pendingWalkLemmaId,
							language: "en",
							canonicalLemma: "walk",
							lemmaKind: "Lexeme",
							lemmaSubKind: "VERB",
						},
					],
					incomingPendingRelationsForNewLemma: [
						{
							sourceLemmaId: englishWalkLemmaId,
							relationFamily: "lexical",
							relation: "nearSynonym",
							targetPendingId: pendingWalkLemmaId,
						},
					],
					incomingPendingSourceLemmas: [
						{
							id: englishWalkLemmaId,
							lemma: englishWalkLemma,
							lexicalRelations: {},
							morphologicalRelations: {},
							attestedTranslations: ["walk"],
							attestations: ["They walk home together."],
							notes:
								"Move at a regular pace by lifting and setting down each foot.",
						},
					],
				};
			},
			async commitChanges() {
				commitCalls += 1;
				throw new Error("Unexpected storage call");
			},
		});
		const dict = createDumdictService({ language: "en", storage });

		await expect(
			dict.addNewNote({
				draft: {
					lemma: englishSwimLemma,
					note: {
						attestedTranslations: ["swim"],
						attestations: ["They swim every morning."],
						notes: "Move through water by moving the body.",
					},
				},
			}),
		).rejects.toThrow("incoming pending relation target");
		expect(commitCalls).toBe(0);
	});

	test("addNewNote rejects incoming pending relations without source lemmas", async () => {
		const storage = withUnusedCleanupStorageMethods({
			async findStoredLemmaSenses() {
				throw new Error("Unexpected storage call");
			},
			async loadLemmaForPatch() {
				throw new Error("Unexpected storage call");
			},
			async loadNewNoteContext() {
				return {
					revision: "corrupt-1" as StoreRevision,
					existingOwnedSurfaces: [],
					explicitExistingRelationTargets: [],
					existingPendingRefsForProposedPendingTargets: [],
					matchingPendingRefsForNewLemma: [
						{
							pendingId: pendingSwimLemmaId,
							language: "en",
							canonicalLemma: "swim",
							lemmaKind: "Lexeme",
							lemmaSubKind: "VERB",
						},
					],
					incomingPendingRelationsForNewLemma: [
						{
							sourceLemmaId: englishWalkLemmaId,
							relationFamily: "lexical",
							relation: "nearSynonym",
							targetPendingId: pendingSwimLemmaId,
						},
					],
					incomingPendingSourceLemmas: [],
				};
			},
			async commitChanges() {
				throw new Error("Unexpected storage call");
			},
		});
		const dict = createDumdictService({ language: "en", storage });

		await expect(
			dict.addNewNote({
				draft: {
					lemma: englishSwimLemma,
					note: {
						attestedTranslations: ["swim"],
						attestations: ["They swim every morning."],
						notes: "Move through water by moving the body.",
					},
				},
			}),
		).rejects.toThrow("incoming pending relation source lemma");
	});
});
