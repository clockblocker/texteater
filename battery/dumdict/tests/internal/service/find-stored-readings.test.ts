import { describe, expect, test } from "bun:test";
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
		const result = await dict.findStoredReadings({
			lemma: englishWalkLemma,
		});

		expect(result.candidates).toHaveLength(1);
		expect(result.candidates[0]?.reading).toEqual(englishWalkReading);
	});

	test("German and Hebrew fixtures preserve language-specific Lemma identities", async () => {
		const { dict: deDict } = getBootedUpDumdict("de", deSerializedNotes);
		const { dict: heDict } = getBootedUpDumdict("he", heSerializedNotes);

		const deResult = await deDict.findStoredReadings({
			lemma: germanGehenLemma,
		});
		const heResult = await heDict.findStoredReadings({
			lemma: hebrewKatavLemma,
		});

		expect(deResult.candidates[0]?.reading).toEqual(germanGehenReading);
		expect(heResult.candidates[0]?.reading).toEqual(hebrewKatavReading);
	});
});
