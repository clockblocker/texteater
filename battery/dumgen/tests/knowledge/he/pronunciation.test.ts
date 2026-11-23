import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import {
	hebrewCitationSchema,
	hebrewIpaSchema,
	prepareHebrewCitation,
	renderHebrewPronunciation,
} from "../../../src/knowledge/he/pronunciation.js";

const reading = (canonicalForm = "יפה"): Dumling.Reading<"he"> => ({
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "he",
		family: "Lexeme",
		kind: "ADJ",
		canonicalForm,
		coreFeatures: { abbr: null },
	},
	emojiDescription: "✨",
});
const draft = (overrides: Record<string, unknown> = {}) => ({
	pointedCitation: "יָפֶה",
	citationRole: "ResolvedCanonical",
	citationFeatures: { gender: "Masc", number: "Sing", definite: null },
	syllableCount: 2,
	stressedSyllable: 2,
	finalYod: "Absent",
	furtivePatah: false,
	...overrides,
});

test("citation enforces canonical spelling, features, full supported pointing and stress bounds", () => {
	expect(prepareHebrewCitation(reading(), draft())).not.toBeNull();
	for (const value of [
		null,
		{},
		draft({
			pointedCitation: "יָפָה",
			citationFeatures: { gender: "Fem", number: "Sing", definite: null },
		}),
		draft({ stressedSyllable: 0 }),
		draft({ stressedSyllable: 3 }),
		draft({ pointedCitation: "יפה" }),
		draft({ pointedCitation: "יָפה" }),
		draft({ pointedCitation: "יָפֶה יפה" }),
		draft({ finalYod: "Unresolved" }),
		draft({ extra: true }),
	])
		expect(prepareHebrewCitation(reading(), value)).toBeNull();
	expect(typeof hebrewCitationSchema).toBe("object");
	expect(typeof hebrewIpaSchema).toBe("object");
});
test("IPA stress is owned by citation and syllables have one supported nucleus", () => {
	const citation = prepareHebrewCitation(reading(), draft())!;
	expect(
		renderHebrewPronunciation(citation, { syllables: ["ja", "fe"] }),
	).toBe("jaˈfe");
	for (const syllables of [
		["ˈja", "fe"],
		["ja", "feˈ"],
		["ja"],
		["ja", "f"],
		["ja", "fee"],
		["ja", "fə"],
		["ja", "פֶה"],
		["ja", "faħ"],
	])
		expect(renderHebrewPronunciation(citation, { syllables })).toBeNull();
	const penultimate = prepareHebrewCitation(
		reading("מלך"),
		draft({ pointedCitation: "מֶלֶךְ", stressedSyllable: 1 }),
	)!;
	expect(
		renderHebrewPronunciation(penultimate, { syllables: ["me", "leχ"] }),
	).toBe("ˈmeleχ");
});
test("final hiriq yod is mater, not an invented consonant", () => {
	const citation = prepareHebrewCitation(
		reading("נקי"),
		draft({ pointedCitation: "נָקִי", finalYod: "Mater" }),
	)!;
	expect(citation).not.toBeNull();
	expect(
		renderHebrewPronunciation(citation, { syllables: ["na", "ki"] }),
	).toBe("naˈki");
	expect(
		renderHebrewPronunciation(citation, { syllables: ["na", "kij"] }),
	).toBeNull();
	expect(
		prepareHebrewCitation(
			reading("נקי"),
			draft({ pointedCitation: "נָקִי", finalYod: "Consonant" }),
		),
	).toBeNull();
});
test("furtive patah is a final unstressed a plus guttural", () => {
	const noun: Dumling.Reading<"he"> = {
		unitKind: "Reading",
		lemma: {
			unitKind: "Lemma",
			language: "he",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "מפתח",
			coreFeatures: { gender: "Masc", abbr: null },
		},
		emojiDescription: "🔑",
	};
	const value = draft({
		pointedCitation: "מַפְתֵּחַ",
		citationFeatures: { gender: "Masc", number: "Sing", definite: "Ind" },
		syllableCount: 3,
		furtivePatah: true,
	});
	const citation = prepareHebrewCitation(noun, value)!;
	expect(citation).not.toBeNull();
	expect(
		renderHebrewPronunciation(citation, { syllables: ["maf", "te", "aχ"] }),
	).toBe("mafˈteaχ");
	expect(
		renderHebrewPronunciation(citation, { syllables: ["maf", "te", "χa"] }),
	).toBeNull();
	expect(
		prepareHebrewCitation(noun, { ...value, stressedSyllable: 3 }),
	).toBeNull();
	expect(
		prepareHebrewCitation(noun, { ...value, furtivePatah: false }),
	).toBeNull();
});
