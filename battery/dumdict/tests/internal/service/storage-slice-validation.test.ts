import { describe, expect, test } from "bun:test";
import {
	validateNewNoteSlice,
	validateStoredReadingsSlice,
} from "../../../src/core/validate-slice";
import { createDumdictService } from "../../../src/runtime";
import type { NewNoteSlice, StoredReadingsSlice } from "../../../src/storage";
import {
	englishRunLemma,
	englishSwimDraft,
	englishWalkLemma,
	englishWalkReading,
	englishWalkReadingEntry,
	type StoreRevision,
	withUnusedCleanupStorageMethods,
} from "./helpers";

const revision = "validation-test" as StoreRevision;

describe("storage slice validation", () => {
	test("rejects a Reading paired with the wrong Lemma", () => {
		const slice = {
			revision,
			candidates: [
				{
					reading: englishWalkReadingEntry(),
					lemma: {
						lemma: englishRunLemma,
					},
				},
			],
		} satisfies StoredReadingsSlice<"en">;

		expect(() => validateStoredReadingsSlice("en", slice)).toThrow(
			"stored Reading does not reference its candidate Lemma",
		);
	});

	test("the lightweight runtime rejects malformed decoded storage before planning", async () => {
		const storage = withUnusedCleanupStorageMethods({
			async findStoredReadings() {
				return {
					revision,
					candidates: [
						{
							reading: englishWalkReadingEntry(),
							lemma: { lemma: englishWalkLemma },
						},
					],
				};
			},
			async loadReadingForPatch() {
				throw new Error("Unexpected storage call");
			},
			async loadNewNoteContext() {
				throw new Error("Unexpected storage call");
			},
			async commitChanges() {
				throw new Error("Unexpected storage call");
			},
		});
		const service = createDumdictService({
			language: "en",
			storage,
		});

		await expect(
			service.findStoredReadings({ lemma: englishRunLemma }),
		).rejects.toThrow(
			"stored Reading candidate does not match the requested Lemma identity",
		);
	});

	test("the lightweight runtime validates storage commit responses", async () => {
		const storage = withUnusedCleanupStorageMethods({
			async findStoredReadings() {
				throw new Error("Unexpected storage call");
			},
			async loadReadingForPatch() {
				return {
					revision,
					reading: englishWalkReadingEntry(),
				};
			},
			async loadNewNoteContext() {
				throw new Error("Unexpected storage call");
			},
			async commitChanges() {
				return { status: "committed" } as never;
			},
		});
		const service = createDumdictService({
			language: "en",
			storage,
		});

		await expect(
			service.addAttestation({
				reading: englishWalkReading,
				attestation: "We walk after dinner.",
			}),
		).rejects.toThrow();
	});

	test("rejects a candidate that does not match the requested Lemma identity", () => {
		const slice = {
			revision,
			candidates: [
				{
					reading: englishWalkReadingEntry(),
					lemma: {
						lemma: englishWalkLemma,
					},
				},
			],
		} satisfies StoredReadingsSlice<"en">;

		expect(() =>
			validateStoredReadingsSlice("en", slice, englishRunLemma),
		).toThrow(
			"stored Reading candidate does not match the requested Lemma identity",
		);
	});

	test("rejects an existing Lemma that does not match the draft identity", () => {
		const slice = {
			revision,
			existingLemma: {
				lemma: englishWalkLemma,
			},
			existingOwnedSurfaces: [],
			explicitExistingLemmaTargets: [],
			existingPendingRelationsForProposedPendingTargets: [],
			pendingRelationsMatchingProposedLemma: [],
			relationLemmas: [],
			relationReadings: [],
		} satisfies NewNoteSlice<"en">;

		expect(() =>
			validateNewNoteSlice("en", slice, englishSwimDraft),
		).toThrow("existing Lemma does not match the draft identity");
	});

	test("rejects a Reading whose emoji description is not canonical", () => {
		const slice = {
			revision,
			existingOwnedSurfaces: [],
			explicitExistingLemmaTargets: [],
			existingPendingRelationsForProposedPendingTargets: [],
			pendingRelationsMatchingProposedLemma: [],
			relationLemmas: [],
			relationReadings: [],
		} satisfies NewNoteSlice<"en">;

		expect(() =>
			validateNewNoteSlice("en", slice, {
				...englishSwimDraft,
				reading: {
					...englishSwimDraft.reading,
					emojiDescription: "plain prose",
				},
			}),
		).toThrow();
	});
});
