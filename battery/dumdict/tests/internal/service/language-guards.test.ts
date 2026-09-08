import { describe, expect, test } from "bun:test";
import {
	createDumdictService,
	englishRunLemma,
	englishSwimCitationSurface,
	englishSwimDraft,
	failure,
	germanGehenLemma,
	germanGehenReading,
	storageRejectingReadingEntryContext,
} from "./helpers";

describe("language guards", () => {
	test("findStoredReadings rejects a requested Lemma language mismatch", async () => {
		const { storage } = storageRejectingReadingEntryContext();
		const dict = createDumdictService({ language: "en", storage });

		expect(
			await failure(
				dict.findStoredReadings({ lemma: germanGehenLemma } as never),
			),
		).toMatchObject({
			_tag: "DumdictInvalidInput",
			expectedLanguage: "en",
			actualLanguage: "de",
		});
	});

	test("addAttestation rejects a requested Reading language mismatch", async () => {
		const { storage } = storageRejectingReadingEntryContext();
		const dict = createDumdictService({ language: "en", storage });

		expect(
			await failure(
				dict.addAttestation({
					reading: germanGehenReading,
					attestation: "Wir gehen.",
				} as never),
			),
		).toMatchObject({
			_tag: "DumdictInvalidInput",
			expectedLanguage: "en",
			actualLanguage: "de",
		});
	});

	test("addNewNote rejects a draft Lemma language mismatch", async () => {
		const { storage, getLoadReadingEntryContextCalls } =
			storageRejectingReadingEntryContext();
		const dict = createDumdictService({ language: "en", storage });

		expect(
			await failure(
				dict.addNewNote({
					draft: {
						...englishSwimDraft,
						reading: {
							...englishSwimDraft.reading,
							lemma: germanGehenLemma,
						},
					},
				} as never),
			),
		).toMatchObject({
			_tag: "DumdictInvalidInput",
			expectedLanguage: "en",
			actualLanguage: "de",
		});
		expect(getLoadReadingEntryContextCalls()).toBe(0);
	});

	test("addNewNote rejects a Surface owned by another Lemma", async () => {
		const { storage, getLoadReadingEntryContextCalls } =
			storageRejectingReadingEntryContext();
		const dict = createDumdictService({ language: "en", storage });
		const result = await failure(
			dict.addNewNote({
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
		);

		expect(result).toMatchObject({
			_tag: "DumdictInvalidInput",
		});
		expect(getLoadReadingEntryContextCalls()).toBe(0);
	});
});
