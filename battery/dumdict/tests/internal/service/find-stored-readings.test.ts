import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import {
	deSerializedNotes,
	englishWalkLemma,
	englishWalkReading,
	enSerializedNotes,
	germanGehenLemma,
	germanGehenReading,
	getBootedUpDumdict,
	hebrewKatavLemma,
	hebrewKatavReading,
	heSerializedNotes,
} from "./helpers";

describe("configured service", () => {
	test("findStoredReadings returns learner Readings for an exact Lemma", async () => {
		const { dict } = getBootedUpDumdict("en", enSerializedNotes);
		const result = await Effect.runPromise(
			dict.findStoredReadings({
				lemma: englishWalkLemma,
			}),
		);

		expect(result.candidates).toHaveLength(1);
		expect(result.candidates[0]?.reading).toEqual(englishWalkReading);
	});

	test("German and Hebrew fixtures preserve language-specific Lemma identities", async () => {
		const { dict: deDict } = getBootedUpDumdict("de", deSerializedNotes);
		const { dict: heDict } = getBootedUpDumdict("he", heSerializedNotes);

		const deResult = await Effect.runPromise(
			deDict.findStoredReadings({
				lemma: germanGehenLemma,
			}),
		);
		const heResult = await Effect.runPromise(
			heDict.findStoredReadings({
				lemma: hebrewKatavLemma,
			}),
		);

		expect(deResult.candidates[0]?.reading).toEqual(germanGehenReading);
		expect(heResult.candidates[0]?.reading).toEqual(hebrewKatavReading);
	});
});
