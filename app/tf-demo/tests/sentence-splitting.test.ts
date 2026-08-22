import { describe, expect, test } from "bun:test";

import { splitInSentences } from "../server/sentenceSplitting";

describe("splitInSentences", () => {
	test("splits ordered prose sentences", () => {
		expect(
			splitInSentences(
				"Die Banken sind geöffnet. Wann schließen sie? Morgen bleiben sie zu!",
			),
		).toEqual([
			"Die Banken sind geöffnet.",
			"Wann schließen sie?",
			"Morgen bleiben sie zu!",
		]);
	});

	test("treats unpunctuated text lines as sentence candidates", () => {
		expect(
			splitInSentences(
				"Erste Liedzeile\nZweite Liedzeile\nDritte Liedzeile",
			),
		).toEqual(["Erste Liedzeile", "Zweite Liedzeile", "Dritte Liedzeile"]);
	});

	test("removes boundary whitespace and omits empty input", () => {
		expect(splitInSentences("  Hallo.  Welt!  ")).toEqual([
			"Hallo.",
			"Welt!",
		]);
		expect(splitInSentences(" \n\t ")).toEqual([]);
	});

	test("returns an immutable collection", () => {
		expect(Object.isFrozen(splitInSentences("Hallo."))).toBe(true);
	});
});
