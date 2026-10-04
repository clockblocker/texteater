import { describe, expect, test } from "bun:test";
import { createDumdictPlanner } from "../../../src/planner/planner";
import type { AddNewNoteContext } from "../../../src/storage";
import {
	englishRunLemma,
	englishSwimCitationSurface,
	englishSwimDraft,
	germanGehenLemma,
	type StoreRevision,
} from "./helpers";

/** A valid empty slice: the request check refuses before the slice matters. */
const emptyAddNewNoteContext: AddNewNoteContext<"en"> = {
	intent: "addNewNote",
	revision: "guard-1" as StoreRevision,
	existingOwnedSurfaces: [],
	explicitExistingLemmaTargets: [],
	exactPendingRelations: [],
	pendingRelationsMatchingProposedLemma: [],
	relationLemmas: [],
	relationReadings: [],
};

describe("language guards", () => {
	test("addNewNote rejects a draft Lemma language mismatch", () => {
		expect(
			createDumdictPlanner("en").addNewNote(emptyAddNewNoteContext, {
				draft: {
					...englishSwimDraft,
					reading: {
						...englishSwimDraft.reading,
						lemma: germanGehenLemma,
					},
				},
			} as never),
		).toEqual({
			status: "rejected",
			code: "invalidRequest",
			message: "Draft Reading language does not match the dictionary.",
		});
	});

	test("addNewNote rejects a Surface owned by another Lemma", () => {
		expect(
			createDumdictPlanner("en").addNewNote(emptyAddNewNoteContext, {
				draft: {
					...englishSwimDraft,
					ownedSurfaces: [
						{
							surface: {
								...englishSwimCitationSurface,
								lemma: englishRunLemma,
							},
							note: {
								attestedTranslations: ["swim"],
								attestations: ["They swim every morning."],
								notes: "Wrong owner.",
							},
						},
					],
				},
			}),
		).toMatchObject({ status: "rejected", code: "invalidRequest" });
	});
});
