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
