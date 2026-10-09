import { describe, expect, test } from "bun:test";
import { ParsingError } from "common-utils/validation";
import {
	englishSwimCitationSurface,
	englishSwimDraft,
	englishSwimReading,
	englishWalkReading,
	enSerializedNotes,
	getBootedUpDumdict,
} from "./helpers";

const note = { attestedTranslations: [], attestations: [], notes: "" };

/**
 * Each workflow parses its typed request whole before planning, so a
 * malformed value throws `ParsingError` from the planner. Each request is
 * planned without a commit, so the host's parse can't be what throws, and is
 * deliberately malformed, hence its `as never`.
 */
describe("malformed workflow requests", () => {
	test("addNewNote refuses a malformed draft note", () => {
		const { dict } = getBootedUpDumdict("en", enSerializedNotes);
		expect(() =>
			dict.plan.addNewNote({
				draft: { ...englishSwimDraft, note: { ...note, notes: 42 } },
			} as never),
		).toThrow(ParsingError);
	});

	test("addNewNote refuses a malformed owned Surface note", () => {
		const { dict } = getBootedUpDumdict("en", enSerializedNotes);
		expect(() =>
			dict.plan.addNewNote({
				draft: {
					...englishSwimDraft,
					ownedSurfaces: [
						{
							surface: englishSwimCitationSurface,
							note: { ...note, attestations: [7] },
						},
					],
				},
			} as never),
		).toThrow(ParsingError);
	});

	test("addNewNote parses its draft before it checks the stored Reading", () => {
		const { dict } = getBootedUpDumdict("en", enSerializedNotes);
		expect(() =>
			dict.plan.addNewNote({
				draft: {
					reading: englishWalkReading,
					note: { ...note, attestedTranslations: "walk" },
				},
			} as never),
		).toThrow(ParsingError);
	});

	test("addNewNote refuses a relation target from another family once it becomes the entry's Knowledge", () => {
		const angst = {
			unitKind: "Lemma",
			language: "en",
			family: "Foreign",
			kind: "Foreign",
			canonicalForm: "Angst",
			coreFeatures: { sourceLang: "de" },
		} as const;
		const { dict } = getBootedUpDumdict("en", [
			...enSerializedNotes,
			{
				schemaVersion: 1,
				lemmaRecord: { lemma: angst },
				readingEntries: [],
				ownedSurfaceEntries: [],
				pendingRelations: [],
			},
		]);
		expect(() =>
			dict.plan.addNewNote({
				draft: {
					...englishSwimDraft,
					relations: [
						{
							relation: "synonym",
							target: { kind: "existing", lemma: angst },
						},
					],
				},
			}),
		).toThrow(ParsingError);
	});

	test("ensureOwnedSurface refuses a malformed Surface note", () => {
		const { dict } = getBootedUpDumdict("en", enSerializedNotes);
		expect(dict.addNewNote({ draft: englishSwimDraft })).toMatchObject({
			status: "applied",
		});
		expect(() =>
			dict.plan.ensureOwnedSurface({
				reading: englishSwimReading,
				ownedSurface: {
					surface: englishSwimCitationSurface,
					note: { ...note, notes: null },
				},
			} as never),
		).toThrow(ParsingError);
	});

	test("ensureReadingEntry refuses malformed Knowledge", () => {
		const { dict } = getBootedUpDumdict("en", enSerializedNotes);
		expect(() =>
			dict.plan.ensureReadingEntry({
				entry: {
					reading: englishSwimReading,
					...note,
					knowledge: { definition: 7 },
				},
			} as never),
		).toThrow(ParsingError);
	});
});
