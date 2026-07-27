import { describe, expect, test } from "bun:test";
import {
	deSerializedNotes,
	englishWalkLemmaId,
	enSerializedNotes,
	germanGehenLemmaId,
	getBootedUpDumdict,
	hebrewKatavLemmaId,
	heSerializedNotes,
} from "./helpers";

describe("configured service", () => {
	test("findStoredLemmaSenses returns stored senses for a coarse lemma description", async () => {
		const { dict } = getBootedUpDumdict("en", enSerializedNotes);

		const result = await dict.findStoredLemmaSenses({
			lemmaDescription: {
				language: "en",
				canonicalLemma: "walk",
				lemmaKind: "Lexeme",
				lemmaSubKind: "VERB",
			},
		});

		expect(result.candidates).toHaveLength(1);
		expect(result.candidates[0]?.lemmaId).toBe(englishWalkLemmaId);
		expect(result.candidates[0]?.note.attestations).toContain(
			"They walk home together.",
		);
	});

	test("language-specific v1 fixtures boot for German and Hebrew", async () => {
		const { dict: deDict } = getBootedUpDumdict("de", deSerializedNotes);
		const { dict: heDict } = getBootedUpDumdict("he", heSerializedNotes);

		const deResult = await deDict.findStoredLemmaSenses({
			lemmaDescription: {
				language: "de",
				canonicalLemma: "gehen",
				lemmaKind: "Lexeme",
				lemmaSubKind: "VERB",
			},
		});
		const heResult = await heDict.findStoredLemmaSenses({
			lemmaDescription: {
				language: "he",
				canonicalLemma: "כתב",
				lemmaKind: "Lexeme",
				lemmaSubKind: "VERB",
			},
		});

		expect(deResult.candidates[0]?.lemmaId).toBe(germanGehenLemmaId);
		expect(heResult.candidates[0]?.lemmaId).toBe(hebrewKatavLemmaId);
	});
});
