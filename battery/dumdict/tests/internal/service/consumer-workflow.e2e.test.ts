import { describe, expect, test } from "bun:test";
import {
	emojiOf,
	englishSwimCitationSurface,
	englishSwimDraft,
	englishSwimReading,
	englishWalkLemma,
	enSerializedNotes,
	getBootedUpDumdict,
} from "./helpers";

describe("consumer workflow", () => {
	test("stores a Reading, attaches a Surface, and enriches it through one store", () => {
		const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);

		expect(dict.addNewNote({ draft: englishSwimDraft }).status).toBe(
			"applied",
		);
		expect(
			dict.ensureOwnedSurface({
				reading: englishSwimReading,
				ownedSurface: {
					surface: englishSwimCitationSurface,
					note: {
						attestedTranslations: [],
						attestations: [],
						notes: "",
					},
				},
			}).status,
		).toBe("applied");
		expect(
			dict.applyGeneratedKnowledge({
				reading: englishSwimReading,
				changes: [
					{
						kind: "Contribute",
						aspect: "translations",
						language: "ru",
						value: ["плавать"],
					},
				],
				pendingRelations: [],
			}).status,
		).toBe("applied");

		const swim = storage
			.loadAll()
			.find(
				({ lemmaRecord }) => lemmaRecord.lemma.canonicalForm === "swim",
			);
		expect(
			swim?.ownedSurfaceEntries.map(
				({ surface }) => surface.normalizedSurface,
			),
		).toEqual(["swim"]);
		expect(swim?.readingEntries[0]?.knowledge?.translations).toEqual({
			ru: ["плавать"],
		});
	});

	test("one Lemma can own multiple learner Readings", () => {
		const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);
		const secondWalkReading = {
			...englishSwimDraft,
			reading: {
				unitKind: "Reading" as const,
				lemma: englishWalkLemma,
				emojiDescription: "🚶‍➡",
			},
		};

		expect(dict.addNewNote({ draft: secondWalkReading }).status).toBe(
			"applied",
		);
		expect(
			storage
				.loadAll()
				.find(
					({ lemmaRecord }) =>
						lemmaRecord.lemma.canonicalForm === "walk",
				)
				?.readingEntries.map(({ reading }) => emojiOf(reading)),
		).toEqual(["🚶", "🚶‍➡"]);
	});
});
