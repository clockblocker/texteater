import { describe, expect, test } from "bun:test";
import { readingIdentityKey } from "dumling";
import type { DumdictReadingDraft } from "../../../src";
import { validateReadingEntryContext } from "../../../src/core/validate-slice";
import { ParsingError } from "../../../src/parsing/lightweight-parsers";
import type {
	AddNewNoteContext,
	LoadReadingEntryContextRequest,
} from "../../../src/storage";
import {
	englishSwimCitationSurface,
	englishSwimDraft,
	englishWalkLemma,
	enSerializedNotesWithPendingSwimRelation,
	germanGehenLemma,
	germanGehenReading,
	makeSurfaceId,
	type StoreRevision,
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
		expect(() =>
			validateReadingEntryContext(
				"en",
				slice,
				addNewNoteRequest({
					...englishSwimDraft,
					reading: {
						...englishSwimDraft.reading,
						emojiDescription: "🏊🏽️",
					},
				}),
			),
		).toThrow("Reading emoji description must be normalized.");
	});

	test("one Reading whatever its variation selectors and skin-tone modifiers", () => {
		const reading = (emojiDescription: string) =>
			readingIdentityKey({
				...englishSwimDraft.reading,
				emojiDescription,
			});
		expect(reading("🖱️")).toBe(reading("🖱"));
		expect(reading("🫳🏽⏸️")).toBe(reading("🫳⏸"));
		expect(reading("🏠➡️")).not.toBe(reading("➡️🏠"));
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

	describe("records the storage parse already rejects", () => {
		const emptyContext = {
			intent: "addNewNote",
			revision,
			existingOwnedSurfaces: [],
			explicitExistingLemmaTargets: [],
			exactPendingRelations: [],
			pendingRelationsMatchingProposedLemma: [],
			relationLemmas: [],
			relationReadings: [],
		} satisfies AddNewNoteContext<"en">;
		const pendingRecord = () => {
			const stored =
				enSerializedNotesWithPendingSwimRelation[0]
					?.pendingRelations[0];
			if (!stored)
				throw new Error("Expected a pending relation fixture.");
			return structuredClone(stored);
		};
		const validate = (context: Partial<AddNewNoteContext<"en">>) => () =>
			validateReadingEntryContext(
				"en",
				{ ...emptyContext, ...context } as AddNewNoteContext<"en">,
				addNewNoteRequest(),
			);

		test("an owned Surface in another language", () => {
			const surface = {
				...englishSwimCitationSurface,
				language: "de",
				lemma: germanGehenLemma,
				normalizedSurface: "gehen",
			};
			expect(
				validate({
					existingOwnedSurfaces: [
						{
							id: makeSurfaceId("de", surface as never),
							surface,
							ownerLemma: germanGehenLemma,
							attestedTranslations: [],
							attestations: [],
							notes: "",
						} as never,
					],
				}),
			).toThrow(ParsingError);
		});

		test("a requested Reading in another language", () => {
			expect(() =>
				validateReadingEntryContext(
					"en",
					emptyContext,
					addNewNoteRequest({
						...englishSwimDraft,
						reading: germanGehenReading,
					} as never),
				),
			).toThrow(ParsingError);
		});

		test("a relation Lemma in another language", () => {
			expect(
				validate({
					relationLemmas: [{ lemma: germanGehenLemma } as never],
				}),
			).toThrow(ParsingError);
		});

		test("a pending record whose source Reading uses another language", () => {
			const record = pendingRecord();
			expect(
				validate({
					pendingRelationsMatchingProposedLemma: [
						{
							...record,
							sourceReading: germanGehenReading,
						} as never,
					],
				}),
			).toThrow(ParsingError);
		});

		test("a pending record whose Unit Shadow uses another language", () => {
			const record = pendingRecord();
			expect(
				validate({
					pendingRelationsMatchingProposedLemma: [
						{
							...record,
							pending: {
								...record.pending,
								target: {
									...record.pending.target,
									language: "de",
								},
							},
						} as never,
					],
				}),
			).toThrow(ParsingError);
		});

		test("a pending record located under an indirect relation", () => {
			const record = pendingRecord();
			expect(
				validate({
					pendingRelationsMatchingProposedLemma: [
						{
							...record,
							locator: {
								...record.locator,
								relation: "notARelation",
							},
						} as never,
					],
				}),
			).toThrow(ParsingError);
		});
	});
});
