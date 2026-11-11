import { expect, test } from "bun:test";
import {
	attested,
	fakeJev,
	resolveOnce,
	sentenceOf,
	unitOf,
	writes,
} from "./support.js";

// A route's words take the route's casing, never the position's (#1326,
// ADR 0002): a verb's forms, an adverb, a conjunction and a particle are
// lowercase wherever they stand, whatever casing Luna keeps.

test("a sentence-initial verb form Luna keeps capitalized is lowercase in the Surface and the headword", async () => {
	// Darf0 _1 ich2 _3 gehen4 ?5
	const { result } = await resolveOnce(
		{
			jev: fakeJev({ prefix: "None" }).ask,
			luna: writes("Dürfen", ["Darf"]).ask,
		},
		{
			sentence: sentenceOf("Darf ich gehen?"),
			unit: unitOf([0], "Lexeme/VERB"),
		},
	);
	const { surface, members } = attested(result);
	expect(surface.lemma.canonicalForm).toBe("dürfen");
	expect(surface.normalizedSurface).toBe("darf");
	expect(members).toEqual([{ attested: "Darf", orthography: "Standard" }]);
	// Hast0 _1 du2 _3 gesprochen4 ?5, its Surface in base order (ADR 0056)
	const spoken = await resolveOnce(
		{
			jev: fakeJev({ aux_m0: "u0", prefix: "None" }).ask,
			luna: writes("sprechen", ["Hast", "gesprochen"]).ask,
		},
		{
			sentence: sentenceOf("Hast du gesprochen?"),
			unit: unitOf([0, 4], "Lexeme/VERB"),
		},
	);
	expect(attested(spoken.result).surface.normalizedSurface).toBe(
		"gesprochen hast",
	);
});

test("an INTJ keeps the capital Luna writes, which may be lexical", async () => {
	// Mann0 ,1 _2 ist3 _4 das5 _6 kalt7 !8
	const { result } = await resolveOnce(
		{ jev: fakeJev().ask, luna: writes("Mann", ["Mann"]).ask },
		{
			sentence: sentenceOf("Mann, ist das kalt!"),
			unit: unitOf([0], "Lexeme/INTJ"),
		},
	);
	expect(attested(result).surface).toMatchObject({
		lemma: { canonicalForm: "Mann" },
		normalizedSurface: "Mann",
	});
});

// On every other route a Standard member takes the casing the Canonical
// Form gives the same word, which is the dictionary's (#1342): Luna's
// members keep a sentence-initial capital the headword does not.

test("a sentence-initial member Luna keeps capitalized takes the casing of its word in the Canonical Form", async () => {
	// Ach0 ,1 _2 das3 _4 ist5 _6 schade7 .8
	const { result } = await resolveOnce(
		{ jev: fakeJev().ask, luna: writes("ach", ["Ach"]).ask },
		{
			sentence: sentenceOf("Ach, das ist schade."),
			unit: unitOf([0], "Lexeme/INTJ"),
		},
	);
	expect(attested(result).surface).toMatchObject({
		lemma: { canonicalForm: "ach" },
		normalizedSurface: "ach",
	});
	expect(attested(result).members).toEqual([
		{ attested: "Ach", orthography: "Standard" },
	]);
	// Keine0 _1 Ursache2 !3
	const formula = await resolveOnce(
		{
			jev: fakeJev().ask,
			luna: writes("keine Ursache", ["Keine", "Ursache"]).ask,
		},
		{
			sentence: sentenceOf("Keine Ursache!"),
			unit: unitOf([0, 2], "Locution/INTJ"),
		},
	);
	expect(attested(formula.result).surface.normalizedSurface).toBe(
		"keine Ursache",
	);
});

test("a word the Canonical Form writes twice cases each member by its own occurrence", async () => {
	// Andere0 _1 Länder2 ,3 _4 andere5 _6 Sitten7 .8
	const { result } = await resolveOnce(
		{
			jev: fakeJev().ask,
			luna: writes("Andere Länder, andere Sitten", [
				"Andere",
				"Länder",
				"Andere",
				"Sitten",
			]).ask,
		},
		{
			sentence: sentenceOf("Andere Länder, andere Sitten."),
			unit: unitOf([0, 2, 5, 7], "Saying/Saying"),
		},
	);
	expect(attested(result).surface.normalizedSurface).toBe(
		"Andere Länder andere Sitten",
	);
});
