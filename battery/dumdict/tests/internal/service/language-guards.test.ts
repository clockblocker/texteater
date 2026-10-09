import { describe, expect, test } from "bun:test";
import { ParsingError } from "common-utils/validation";
import {
	checkApplyGeneratedKnowledgeRequest,
	createDumdictPlanner,
} from "../../../src/planner/planner";
import type { AddNewNoteContext } from "../../../src/storage";
import { deSerializedNotes } from "../../fixtures/de-notes";
import {
	englishRunLemma,
	englishSwimCitationSurface,
	englishSwimDraft,
	germanGehenLemma,
	germanGehenReading,
	getBootedUpDumdict,
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

	test("applyGeneratedKnowledge rejects a Knowledge Change that references another language", () => {
		const { dict } = getBootedUpDumdict("de", deSerializedNotes);
		expect(
			dict.applyGeneratedKnowledge({
				reading: germanGehenReading,
				changes: [
					{
						kind: "Contribute",
						aspect: "morphologicalTree",
						value: {
							root: {
								nodeKind: "structure",
								children: [
									{
										nodeKind: "unitShadow",
										unitShadow: {
											canonicalForm: "walk",
											family: "Lexeme",
											kind: "VERB",
											language: "en",
										},
									},
								],
							},
						},
					},
				],
				pendingRelations: [],
				// Deliberately invalid: the change's Unit Shadow is English.
			} as never),
		).toEqual({
			status: "rejected",
			code: "invalidRequest",
			message: "Knowledge Change language does not match the dictionary.",
		});
	});

	test("checkApplyGeneratedKnowledgeRequest parses untyped changes and refuses another language", () => {
		const definition = {
			kind: "Contribute",
			aspect: "definition",
			value: "to walk",
		} as const;
		const pending = {
			relation: "synonym",
			target: {
				language: "de",
				canonicalForm: "laufen",
				family: "Lexeme",
				kind: "VERB",
			},
		} as const;
		expect(
			checkApplyGeneratedKnowledgeRequest("de", {
				reading: germanGehenReading,
				changes: [definition],
				pendingRelations: [pending],
			}),
		).toEqual({
			status: "ok",
			request: {
				reading: germanGehenReading,
				changes: [definition],
				pendingRelations: [pending],
			},
		});
		expect(
			checkApplyGeneratedKnowledgeRequest("de", {
				reading: germanGehenReading,
				changes: [],
				pendingRelations: [
					{
						...pending,
						target: { ...pending.target, language: "en" },
					},
				],
			}),
		).toEqual({
			status: "rejected",
			code: "invalidRequest",
			message:
				"Pending Relation target language does not match the dictionary.",
		});
		expect(() =>
			checkApplyGeneratedKnowledgeRequest("de", {
				reading: germanGehenReading,
				changes: [{ ...definition, aspect: "definitions" }],
				pendingRelations: [],
			}),
		).toThrow(ParsingError);
	});
});
