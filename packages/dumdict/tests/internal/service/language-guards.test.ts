import { describe, expect, test } from "bun:test";
import {
	createDumdictService,
	DumdictLanguageMismatchError,
	type DumdictStoragePort,
	englishRunLemma,
	englishSwimLemma,
	englishSwimLemmaSurface,
	germanGehenLemma,
	type Lemma,
	makeDumlingIdFor,
	type StoreRevision,
	storageRejectingNewNoteContext,
	withUnusedCleanupStorageMethods,
} from "./helpers";

describe("configured service", () => {
	test("findStoredLemmaSenses rejects language mismatch before storage is called", async () => {
		let storageCalls = 0;
		const storage = withUnusedCleanupStorageMethods({
			async findStoredLemmaSenses() {
				storageCalls += 1;
				return { revision: "never" as StoreRevision, candidates: [] };
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
					language: "de",
					canonicalLemma: "gehen",
					lemmaKind: "Lexeme",
					lemmaSubKind: "VERB",
				},
			} as never),
		).rejects.toThrow(DumdictLanguageMismatchError);

		expect(storageCalls).toBe(0);
	});

	test("addAttestation rejects ID language mismatch before storage is called", async () => {
		const germanGehenLemma = {
			canonicalLemma: "gehen",
			inherentFeatures: {},
			language: "de",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			meaningInEmojis: "walk",
		} satisfies Lemma<"de", "Lexeme", "VERB">;
		const germanLemmaId = makeDumlingIdFor("de", germanGehenLemma);
		let storageCalls = 0;
		const storage = withUnusedCleanupStorageMethods({
			async findStoredLemmaSenses() {
				throw new Error("Unexpected storage call");
			},
			async loadLemmaForPatch() {
				storageCalls += 1;
				return { revision: "never" as StoreRevision };
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
			dict.addAttestation({
				lemmaId: germanLemmaId,
				attestation: "Wir gehen nach Hause.",
			} as never),
		).rejects.toThrow(DumdictLanguageMismatchError);

		expect(storageCalls).toBe(0);
	});

	test("addNewNote rejects existing relation target language mismatch before storage is called", async () => {
		const germanGehenLemma = {
			canonicalLemma: "gehen",
			inherentFeatures: {},
			language: "de",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			meaningInEmojis: "walk",
		} satisfies Lemma<"de", "Lexeme", "VERB">;
		const germanLemmaId = makeDumlingIdFor("de", germanGehenLemma);
		let storageCalls = 0;
		const storage = withUnusedCleanupStorageMethods({
			async findStoredLemmaSenses() {
				throw new Error("Unexpected storage call");
			},
			async loadLemmaForPatch() {
				throw new Error("Unexpected storage call");
			},
			async loadNewNoteContext() {
				storageCalls += 1;
				return {
					revision: "never" as StoreRevision,
					existingOwnedSurfaces: [],
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
					relations: [
						{
							relationFamily: "lexical",
							relation: "nearSynonym",
							target: { kind: "existing", lemmaId: germanLemmaId },
						},
					],
				},
			} as never),
		).rejects.toThrow(DumdictLanguageMismatchError);

		expect(storageCalls).toBe(0);
	});

	test("addNewNote rejects draft lemma language mismatch before storage is called", async () => {
		const { storage, getLoadNewNoteContextCalls } =
			storageRejectingNewNoteContext();
		const dict = createDumdictService({ language: "en", storage });

		await expect(
			dict.addNewNote({
				draft: {
					lemma: germanGehenLemma,
					note: {
						attestedTranslations: ["go", "walk"],
						attestations: ["Wir gehen nach Hause."],
						notes: "Move on foot or go somewhere.",
					},
				},
			} as never),
		).rejects.toThrow(DumdictLanguageMismatchError);

		expect(getLoadNewNoteContextCalls()).toBe(0);
	});

	test("addNewNote rejects owned-surface language mismatch before storage is called", async () => {
		const { storage, getLoadNewNoteContextCalls } =
			storageRejectingNewNoteContext();
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
							surface: {
								...englishSwimLemmaSurface,
								language: "de",
							},
							note: {
								attestedTranslations: ["swim"],
								attestations: ["They swim every morning."],
								notes: "Plain present form.",
							},
						},
					],
				},
			} as never),
		).rejects.toThrow(DumdictLanguageMismatchError);

		expect(getLoadNewNoteContextCalls()).toBe(0);
	});

	test("addNewNote rejects owned surfaces for a different same-language lemma before storage is called", async () => {
		const { storage, getLoadNewNoteContextCalls } =
			storageRejectingNewNoteContext();
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
						surface: {
							...englishSwimLemmaSurface,
							lemma: englishRunLemma,
						},
						note: {
							attestedTranslations: ["swim"],
							attestations: ["They swim every morning."],
							notes: "Surface belongs to a different lemma.",
						},
					},
				],
			},
		});

		expect(result).toMatchObject({
			status: "rejected",
			code: "invalidDraft",
		});
		expect(getLoadNewNoteContextCalls()).toBe(0);
	});

	test("addNewNote rejects owned-surface lemma language mismatch before storage is called", async () => {
		const { storage, getLoadNewNoteContextCalls } =
			storageRejectingNewNoteContext();
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
							surface: {
								language: "en",
								lemma: germanGehenLemma,
								normalizedFullSurface: "gehen",
								surfaceKind: "Lemma",
							},
							note: {
								attestedTranslations: ["go", "walk"],
								attestations: ["Wir gehen nach Hause."],
								notes: "Lemma-form surface with mismatched embedded lemma.",
							},
						},
					],
				},
			} as never),
		).rejects.toThrow(DumdictLanguageMismatchError);

		expect(getLoadNewNoteContextCalls()).toBe(0);
	});
});
