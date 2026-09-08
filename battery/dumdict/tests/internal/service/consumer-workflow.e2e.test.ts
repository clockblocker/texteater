import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import {
	englishSwimDraft,
	englishSwimLemma,
	englishSwimReading,
	englishWalkLemma,
	englishWalkReading,
	enSerializedNotes,
	getBootedUpDumdict,
} from "./helpers";

describe("consumer workflow", () => {
	test("finds a Reading, enriches it, and stores another Reading", async () => {
		const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);

		const walk = await Effect.runPromise(
			dict.findStoredReadings({
				lemma: englishWalkLemma,
			}),
		);
		expect(walk.candidates.map(({ reading }) => reading)).toEqual([
			englishWalkReading,
		]);

		const attestationResult = await Effect.runPromise(
			dict.addAttestation({
				reading: walk.candidates[0]?.reading ?? englishWalkReading,
				attestation: "We walk to work.",
			}),
		);
		expect(attestationResult.status).toBe("applied");

		const createResult = await Effect.runPromise(
			dict.addNewNote({
				draft: englishSwimDraft,
			}),
		);
		expect(createResult.status).toBe("applied");

		const swim = await Effect.runPromise(
			dict.findStoredReadings({
				lemma: englishSwimLemma,
			}),
		);
		expect(swim.candidates[0]?.reading).toEqual(englishSwimReading);
		expect(storage.loadAll()[0]?.readingEntries[0]?.attestations).toContain(
			"We walk to work.",
		);
	});

	test("one Lemma can own multiple learner Readings", async () => {
		const { dict } = getBootedUpDumdict("en", enSerializedNotes);
		const secondWalkReading = {
			...englishSwimDraft,
			reading: {
				lemma: englishWalkLemma,
				emojiDescription: "🚶‍➡️",
			},
		};

		expect(
			(
				await Effect.runPromise(
					dict.addNewNote({ draft: secondWalkReading }),
				)
			).status,
		).toBe("applied");
		const readings = await Effect.runPromise(
			dict.findStoredReadings({
				lemma: englishWalkLemma,
			}),
		);

		expect(
			readings.candidates.map(({ reading }) => reading.emojiDescription),
		).toEqual(["🚶", "🚶‍➡️"]);
	});
});
