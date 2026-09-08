import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { DumdictReadingDraft } from "../../../src";
import {
	validateReadingEntryContext,
	validateStoredReadingsSlice,
} from "../../../src/core/validate-slice";
import { createDumdictService } from "../../../src/runtime";
import type {
	AddNewNoteContext,
	LoadReadingEntryContextRequest,
	StoredReadingsSlice,
} from "../../../src/storage";
import {
	englishRunLemma,
	englishSwimDraft,
	englishWalkLemma,
	englishWalkReading,
	englishWalkReadingEntry,
	enSerializedNotesWithPendingSwimRelation,
	type StoreRevision,
	withUnusedCleanupStorageMethods,
} from "./helpers";

const revision = "validation-test" as StoreRevision;
const addNewNoteRequest = (
	draft: DumdictReadingDraft<"en"> = englishSwimDraft,
): Extract<LoadReadingEntryContextRequest<"en">, { intent: "addNewNote" }> => ({
	intent: "addNewNote",
	reading: draft.reading,
	ownedSurfaces: draft.ownedSurfaces?.map(({ surface }) => surface) ?? [],
	relations: [...(draft.relations ?? [])],
});

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
			findStoredReadings() {
				return Effect.succeed({
					revision,
					candidates: [
						{
							reading: englishWalkReadingEntry(),
							lemma: { lemma: englishWalkLemma },
						},
					],
				});
			},
			loadReadingForPatch() {
				return Effect.die(new Error("Unexpected storage call"));
			},
			loadReadingEntryContext() {
				return Effect.die(new Error("Unexpected storage call"));
			},
			commitChanges() {
				return Effect.die(new Error("Unexpected storage call"));
			},
		});
		const service = createDumdictService({
			language: "en",
			storage,
		});

		await expect(
			Effect.runPromise(
				service.findStoredReadings({ lemma: englishRunLemma }),
			),
		).rejects.toThrow("stored Reading candidate does not match");
	});

	test("the lightweight runtime validates storage commit responses", async () => {
		const storage = withUnusedCleanupStorageMethods({
			findStoredReadings() {
				return Effect.die(new Error("Unexpected storage call"));
			},
			loadReadingForPatch() {
				return Effect.succeed({
					revision,
					reading: englishWalkReadingEntry(),
				});
			},
			loadReadingEntryContext() {
				return Effect.die(new Error("Unexpected storage call"));
			},
			commitChanges() {
				return Effect.succeed({ status: "committed" } as never);
			},
		});
		const service = createDumdictService({
			language: "en",
			storage,
		});

		await expect(
			Effect.runPromise(
				service.addAttestation({
					reading: englishWalkReading,
					attestation: "We walk after dinner.",
				}),
			),
		).rejects.toThrow("nextRevision");
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

	test("rejects an existing Lemma that does not match the requested Reading", () => {
		const slice = {
			intent: "addNewNote",
			revision,
			existingLemma: {
				lemma: englishWalkLemma,
			},
			existingOwnedSurfaces: [],
			explicitExistingLemmaTargets: [],
			exactPendingRelations: [],
			pendingRelationsMatchingProposedLemma: [],
			relationLemmas: [],
			relationReadings: [],
		} satisfies AddNewNoteContext<"en">;

		expect(() =>
			validateReadingEntryContext("en", slice, addNewNoteRequest()),
		).toThrow(
			"existing Lemma does not match the requested Reading identity",
		);
	});

	test("rejects a Reading whose emoji description is not canonical", () => {
		const slice = {
			intent: "addNewNote",
			revision,
			existingOwnedSurfaces: [],
			explicitExistingLemmaTargets: [],
			exactPendingRelations: [],
			pendingRelationsMatchingProposedLemma: [],
			relationLemmas: [],
			relationReadings: [],
		} satisfies AddNewNoteContext<"en">;

		expect(() =>
			validateReadingEntryContext(
				"en",
				slice,
				addNewNoteRequest({
					...englishSwimDraft,
					reading: {
						...englishSwimDraft.reading,
						emojiDescription: "plain prose",
					},
				}),
			),
		).toThrow();
	});

	test("rejects a pending record whose target ID is not derived from its Unit Shadow", () => {
		const stored =
			enSerializedNotesWithPendingSwimRelation[0]?.pendingRelations[0];
		if (!stored) throw new Error("Expected a pending relation fixture.");
		const slice = {
			intent: "addNewNote",
			revision,
			existingOwnedSurfaces: [],
			explicitExistingLemmaTargets: [],
			exactPendingRelations: [],
			pendingRelationsMatchingProposedLemma: [
				{
					...stored,
					locator: {
						...stored.locator,
						targetPendingId:
							"pending-entry:v2:en:Lexeme:VERB:forged",
					},
				},
			],
			relationLemmas: [],
			relationReadings: [],
		} satisfies AddNewNoteContext<"en">;

		expect(() =>
			validateReadingEntryContext("en", slice, addNewNoteRequest()),
		).toThrow(
			"Pending Semantic Relation locator has the wrong target Pending Entry ID",
		);
	});
});
