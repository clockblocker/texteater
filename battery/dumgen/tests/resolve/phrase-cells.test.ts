import { expect, test } from "bun:test";
import { surfaceCases } from "../../src/resolve/de/open-route/phrase-cells.js";
import { targetOf } from "../../src/resolve/de/target.js";
import type { RouteKey } from "../../src/segment/de/routes.js";
import type { Unit } from "../../src/segment/segmented-sentence.js";
import {
	attested,
	fakeJev,
	resolveOnce,
	sentenceOf,
	unitOf,
	writes,
} from "./support.js";

// What stands before an agreeing Surface narrows the cases its question
// offers (#1326): its phrase's determiner, the preposition governing the
// phrase, and an ADJ's ending.

/** The cases the unit at `clicked` can take, the Sentence's units routed as `routes` says. */
function casesOf(
	text: string,
	routes: readonly (readonly [number[], RouteKey])[],
	clicked: number,
) {
	const units: Unit[] = routes.map(([segments, key]) =>
		unitOf(segments, key),
	);
	const sentence = { ...sentenceOf(text), units };
	const unit = units[clicked];
	if (!unit || unit.route === "Unresolved") throw Error("no unit");
	return surfaceCases(targetOf(sentence, unit, unit.route), units);
}

test("a preposition, a determiner and an ending each narrow an attributive ADJ's cases", () => {
	// mit0 _1 großem2 _3 Mut3: the preposition and -em agree on Dat.
	expect(
		casesOf(
			"mit großem Mut",
			[
				[[0], "Lexeme/ADP"],
				[[2], "Lexeme/ADJ"],
				[[4], "Lexeme/NOUN"],
			],
			1,
		),
	).toEqual(["Dat"]);
	// in0 _1 den2 _3 großen4 _5 Garten6: in takes Acc or Dat, den Acc or Dat.
	expect(
		casesOf(
			"in den großen Garten",
			[
				[[0], "Lexeme/ADP"],
				[[2, 6], "Lexeme/NOUN"],
				[[4], "Lexeme/ADJ"],
			],
			2,
		),
	).toEqual(["Acc", "Dat"]);
	// die0 _1 beiden2 _3 alten4 _5 Häuser6: the first determiner of a run
	// opens the phrase, so beiden's own cells are not read.
	expect(
		casesOf(
			"die beiden alten Häuser",
			[
				[[0, 6], "Lexeme/NOUN"],
				[[2], "Lexeme/NUM"],
				[[4], "Lexeme/ADJ"],
			],
			2,
		),
	).toEqual(["Nom", "Acc"]);
});

test("an attributive ADJ inside its noun's unit reads its cases where that unit opens, over an attribute of its own between", () => {
	// mit0 _1 einer2 _3 in4 _5 einem6 _7 Rohr8 _9 untergebrachten10 _11 Wendel12:
	// in einem Rohr stands between einer and the ADJ, and mit einer is Dat.
	expect(
		casesOf(
			"mit einer in einem Rohr untergebrachten Wendel",
			[
				[[0], "Lexeme/ADP"],
				[[2, 12], "Lexeme/NOUN"],
				[[4], "Lexeme/ADP"],
				[[6, 8], "Lexeme/NOUN"],
				[[10], "Lexeme/ADJ"],
			],
			4,
		),
	).toEqual(["Dat"]);
	// des0 _1 aus2 _3 Hamburg4 _5 kommenden6 _7 Zuges8: des is only Gen.
	expect(
		casesOf(
			"des aus Hamburg kommenden Zuges",
			[
				[[0, 8], "Lexeme/NOUN"],
				[[2], "Lexeme/ADP"],
				[[4], "Lexeme/PROPN"],
				[[6], "Lexeme/ADJ"],
			],
			3,
		),
	).toEqual(["Gen"]);
	// A noun whose unit opens with the noun itself says nothing: all four.
	// aus0 _1 Hamburg2 _3 kommenden4 _5 Zügen6
	expect(
		casesOf(
			"aus Hamburg kommenden Zügen",
			[
				[[0], "Lexeme/ADP"],
				[[2], "Lexeme/PROPN"],
				[[4], "Lexeme/ADJ"],
				[[6], "Lexeme/NOUN"],
			],
			2,
		),
	).toEqual(["Nom", "Acc", "Dat", "Gen"]);
});

test("a circumposition's last word governs nothing after it", () => {
	// von0 _1 seinem2 _3 Bett4 _5 aus6 _7 die8 _9 alte10 _11 Frau12
	expect(
		casesOf(
			"von seinem Bett aus die alte Frau",
			[
				[[0, 6], "Lexeme/ADP"],
				[[2, 4], "Lexeme/NOUN"],
				[[8, 12], "Lexeme/NOUN"],
				[[10], "Lexeme/ADJ"],
			],
			3,
		),
	).toEqual(["Nom", "Acc"]);
});

test("an ADJ whose phrase leaves one case is asked none, and takes it", async () => {
	// Er0 _1 kam2 _3 mit4 _5 großem6 _7 Mut8 .9
	const units = [
		unitOf([0], "Lexeme/PRON"),
		unitOf([2], "Lexeme/VERB"),
		unitOf([4], "Lexeme/ADP"),
		unitOf([6], "Lexeme/ADJ"),
		unitOf([8], "Lexeme/NOUN"),
	];
	const jev = fakeJev({
		comparable: "No",
		attributive: "Yes",
		"agreement.gender": "Masc",
		"agreement.number": "Sing",
	});
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("groß").ask },
		{
			sentence: { ...sentenceOf("Er kam mit großem Mut."), units },
			unit: unitOf([6], "Lexeme/ADJ"),
		},
	);
	expect(attested(result).surface).toMatchObject({
		inflectionalFeatures: { case: "Dat" },
	});
	expect(jev.questions("grammar")).not.toContain("agreement.case");
});
