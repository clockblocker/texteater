import { describe, expect, test } from "bun:test";
import {
	validateNewNoteSlice,
	validateStoredReadingsSlice,
} from "../../../src/core/validate-slice";
import type { NewNoteSlice, StoredReadingsSlice } from "../../../src/storage";
import {
	englishRunLemma,
	englishSwimDraft,
	englishWalkLemma,
	englishWalkReadingEntry,
	type StoreRevision,
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
			explicitExistingReadingTargets: [],
			existingPendingRelationsForProposedPendingTargets: [],
		} satisfies NewNoteSlice<"en">;

		expect(() =>
			validateNewNoteSlice("en", slice, englishSwimDraft),
		).toThrow("existing Lemma does not match the draft identity");
	});

	test("rejects a Reading whose emoji description is not canonical", () => {
		const slice = {
			revision,
			existingOwnedSurfaces: [],
			explicitExistingReadingTargets: [],
			existingPendingRelationsForProposedPendingTargets: [],
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
