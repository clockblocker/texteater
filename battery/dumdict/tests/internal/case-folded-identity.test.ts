import { describe, expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import { makeSurfaceId, type SerializedDictionaryNote } from "../../src";
import { derivePendingEntryId } from "../../src/core/pending";
import { getBootedUpDumdict } from "../support/planned-dictionary";

const interjection = (canonicalForm: string) =>
	({
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "INTJ",
		canonicalForm,
		coreFeatures: { partType: null },
	}) satisfies Dumling.Lemma<"de", "Lexeme", "INTJ">;
const morgenNoun = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Morgen",
	coreFeatures: { gender: "Masc" },
} satisfies Dumling.Lemma<"de", "Lexeme", "NOUN">;
const morgenAdverb = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "ADV",
	canonicalForm: "morgen",
	coreFeatures: { comparable: null },
} satisfies Dumling.Lemma<"de", "Lexeme", "ADV">;

const reading = (lemma: Dumling.Lemma<"de">, emojiDescription: string) =>
	({ unitKind: "Reading", lemma, emojiDescription }) as Dumling.Reading<"de">;
const entryNote = {
	attestedTranslations: ["note"],
	attestations: ["Ein Beispiel."],
	notes: "",
};
const storedNote = (
	value: Dumling.Reading<"de">,
): SerializedDictionaryNote<"de"> => ({
	schemaVersion: 1,
	lemmaRecord: { lemma: value.lemma },
	readingEntries: [{ reading: value, ...entryNote }],
	ownedSurfaceEntries: [],
	pendingRelations: [],
});
const shadow = (lemma: Dumling.Lemma<"de">) =>
	({
		language: lemma.language,
		canonicalForm: lemma.canonicalForm,
		family: lemma.family,
		kind: lemma.kind,
	}) as Dumrel.UnitShadow & { language: "de" };

describe("case-folded Lemma identity (system ADR 0002)", () => {
	test("INTJ LOL and lol resolve to one Lemma", async () => {
		const laughing = reading(interjection("LOL"), "😂");
		const { dict, storage } = getBootedUpDumdict("de", [
			storedNote(laughing),
		]);

		const repeated = dict.addNewNote({
			draft: {
				reading: reading(interjection("lol"), "😂"),
				note: entryNote,
			},
		});
		expect(repeated).toMatchObject({ code: "readingAlreadyExists" });

		const added = dict.addNewNote({
			draft: {
				reading: reading(interjection("lol"), "🤣"),
				note: entryNote,
			},
		});
		expect(added.status).toBe("applied");
		const notes = storage.loadAll();
		expect(notes).toHaveLength(1);
		expect(notes[0]?.lemmaRecord.lemma.canonicalForm).toBe("LOL");
		expect(
			notes[0]?.readingEntries.map(
				({ reading }) =>
					"emojiDescription" in reading && reading.emojiDescription,
			),
		).toEqual(["😂", "🤣"]);
	});

	test("NOUN Morgen and ADV morgen stay two Lemmas", async () => {
		const { dict, storage } = getBootedUpDumdict("de", [
			storedNote(reading(morgenNoun, "🌅")),
		]);

		const added = dict.addNewNote({
			draft: {
				reading: reading(morgenAdverb, "📅"),
				note: entryNote,
			},
		});
		expect(added.status).toBe("applied");
		expect(
			storage.loadAll().map(({ lemmaRecord }) => lemmaRecord.lemma.kind),
		).toEqual(["NOUN", "ADV"]);
	});

	test("Surface and Pending Entry IDs fold the Lemma's Canonical Form", () => {
		const surface = (canonicalForm: string, normalizedSurface: string) =>
			({
				unitKind: "Surface",
				language: "de",
				lemma: interjection(canonicalForm),
				normalizedSurface,
				spelling: { kind: "Canonical" },
				surfaceFeatures: null,
			}) satisfies Dumling.Surface<"de", "Lexeme", "INTJ">;

		expect(makeSurfaceId("de", surface("LOL", "lol"))).toBe(
			makeSurfaceId("de", surface("lol", "lol")),
		);
		expect(makeSurfaceId("de", surface("LOL", "LOL"))).not.toBe(
			makeSurfaceId("de", surface("LOL", "lol")),
		);
		expect(derivePendingEntryId(shadow(interjection("LOL")))).toBe(
			derivePendingEntryId(shadow(interjection("lol"))),
		);
		expect(derivePendingEntryId(shadow(morgenNoun))).not.toBe(
			derivePendingEntryId(shadow(morgenAdverb)),
		);
	});
});
