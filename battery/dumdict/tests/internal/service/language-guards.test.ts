import { describe, expect, test } from "bun:test";
import {
	createDumdictService,
	DumdictLanguageMismatchError,
	englishRunLemma,
	englishSwimCitationSurface,
	englishSwimDraft,
	germanGehenLemma,
	germanGehenReading,
	storageRejectingReadingEntryContext,
} from "./helpers";

describe("language guards", () => {
	test("findStoredReadings rejects a requested Lemma language mismatch", async () => {
		const { storage } = storageRejectingReadingEntryContext();
		const dict = createDumdictService({ language: "en", storage });

		await expect(
			dict.findStoredReadings({ lemma: germanGehenLemma } as never),
		).rejects.toThrow(DumdictLanguageMismatchError);
	});

	test("addAttestation rejects a requested Reading language mismatch", async () => {
		const { storage } = storageRejectingReadingEntryContext();
		const dict = createDumdictService({ language: "en", storage });

		await expect(
			dict.addAttestation({
				reading: germanGehenReading,
				attestation: "Wir gehen.",
			} as never),
		).rejects.toThrow(DumdictLanguageMismatchError);
	});

	test("addNewNote rejects a draft Lemma language mismatch", async () => {
		const { storage, getLoadReadingEntryContextCalls } =
			storageRejectingReadingEntryContext();
		const dict = createDumdictService({ language: "en", storage });

		await expect(
			dict.addNewNote({
				draft: {
					...englishSwimDraft,
					reading: {
						...englishSwimDraft.reading,
						lemma: germanGehenLemma,
					},
				},
			} as never),
		).rejects.toThrow(DumdictLanguageMismatchError);
		expect(getLoadReadingEntryContextCalls()).toBe(0);
	});

	test("addNewNote rejects a Surface owned by another Lemma", async () => {
		const { storage, getLoadReadingEntryContextCalls } =
			storageRejectingReadingEntryContext();
		const dict = createDumdictService({ language: "en", storage });
		const result = await dict.addNewNote({
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
		});

		expect(result).toMatchObject({
			status: "rejected",
			code: "invalidDraft",
		});
		expect(getLoadReadingEntryContextCalls()).toBe(0);
	});
});
