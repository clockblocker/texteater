import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { Answer } from "../../../src/segment/ask.js";
import type { CodeRule } from "../../../src/segment/de/code-rules.js";
import { allRoutes, type RouteKey } from "../../../src/segment/de/routes.js";
import { productionUnitSettings } from "../../../src/segment/de/units.js";
import { segmentsOf } from "../../lab/evaluation/spec-corpus/fixtures.js";
import { fixedWords } from "./code-rules-support.js";
import { fakeJudge, germanUnits, noul, picked, route } from "./fake-judge.js";

/**
 * Every unit, its Segments and route, from `answers` under `rules`
 * (production's code rules unless given).
 */
async function unitsOf(
	text: string,
	answers: Readonly<Record<string, Answer>>,
	rules: readonly CodeRule[] = productionUnitSettings.rules,
) {
	const units = await Effect.runPromise(
		germanUnits({ segments: segmentsOf(text) }, fakeJudge(answers).ask, {
			...productionUnitSettings,
			rules,
		}),
	);
	return units.map(({ segments, route }) => ({ segments, route }));
}

/** The route of the unit of exactly `segments`. */
async function routeOf(
	text: string,
	segments: readonly number[],
	answers: Readonly<Record<string, Answer>>,
	rules?: readonly CodeRule[],
) {
	const units = await unitsOf(text, answers, rules);
	const unit = units.find(
		(entry) => entry.segments.join() === segments.join(),
	);
	if (!unit)
		throw Error(
			`No unit of ${segments.join()}: ${JSON.stringify(units.map((entry) => entry.segments))}`,
		);
	return unit.route;
}

/** The route Choice answering `key` with all its share. */
const heard = (key: RouteKey) => picked(key, { [key]: 1 });

// Sie0 _1 fuhren2 _3 zum4 _5 Gestade6 _7 des8 _9 Schwäbischen10 _11 Meeres12 .13
const meer = "Sie fuhren zum Gestade des Schwäbischen Meeres.";
const meerName = { c_6_7: noul(0.65), s_article_5: picked("p7") };

test("name: a unit grouped by an accepted name routes Lexeme PROPN, whichever route the route Choice picks", async () => {
	for (const key of allRoutes) {
		const answers = { ...meerName, r_5_6_7: heard(key) };
		expect(await routeOf(meer, [8, 10, 12], answers)).toEqual(
			route("Lexeme", "PROPN"),
		);
	}
	// The import request's own answer: NOUN 0.73 over PROPN 0.24.
	const noun = picked("Lexeme/NOUN", {
		"Lexeme/NOUN": 0.73,
		"Lexeme/PROPN": 0.24,
		"Lexeme/ADJ": 0.03,
	});
	const answers = { ...meerName, r_5_6_7: noun };
	expect(
		await routeOf(
			meer,
			[8, 10, 12],
			answers,
			productionUnitSettings.rules.filter((rule) => rule !== "name"),
		),
	).toEqual(route("Lexeme", "NOUN"));
	expect(await routeOf(meer, [8, 10, 12], answers)).toEqual(
		route("Lexeme", "PROPN"),
	);
});

test("name: a name also read as a fixed expression is still one Lexeme PROPN, never a Locution", async () => {
	// Die0 _1 Deutsche2 _3 Bank4 _5 veröffentlichte6 _7 den8 _9 Bericht10 .11
	const text = "Die Deutsche Bank veröffentlichte den Bericht.";
	for (const key of allRoutes) {
		const answers = {
			c_2_3: noul(0.9),
			s_article_1: picked("p3"),
			...fixedWords(2, 3),
			r_1_2_3: heard(key),
		};
		expect(await routeOf(text, [0, 2, 4], answers)).toEqual(
			route("Lexeme", "PROPN"),
		);
	}
});

test("name: a name joined to anything but its articles is another unit, and the route Choice decides", async () => {
	const answers = {
		...meerName,
		s_idiom_7: picked("p2"),
		r_2_5_6_7: heard("Locution/VERB"),
	};
	expect(await routeOf(meer, [2, 8, 10, 12], answers)).toEqual(
		route("Locution", "VERB"),
	);
});

test("name: a rejected name pair leaves both words to the route Choice", async () => {
	const units = await unitsOf(meer, {
		c_6_7: noul(0.3),
		s_article_5: picked("p7"),
		r_5_7: heard("Lexeme/NOUN"),
		r_6: heard("Lexeme/ADJ"),
	});
	expect(units).toContainEqual({
		segments: [8, 12],
		route: route("Lexeme", "NOUN"),
	});
	expect(units).toContainEqual({
		segments: [10],
		route: route("Lexeme", "ADJ"),
	});
});

test("split-adverb and stranded-adverb: the split adverb's unit routes Lexeme ADV, whichever route the route Choice picks", async () => {
	for (const key of allRoutes) {
		// Wo0 _1 gehst2 _3 du4 _5 hin6 ?7
		expect(
			await routeOf("Wo gehst du hin?", [0, 6], {
				c_1_4: noul(0.9),
				r_1_4: heard(key),
			}),
		).toEqual(route("Lexeme", "ADV"));
		// Da0 _1 kann2 _3 ich4 _5 nichts6 _7 für8 .9
		expect(
			await routeOf("Da kann ich nichts für.", [0, 8], {
				c_1_5: noul(0.15),
				r_1_5: heard(key),
			}),
		).toEqual(route("Lexeme", "ADV"));
	}
});

test("anchors: a correlator's or conjunction's anchors route the Kind its Rule names, whichever route the route Choice picks", async () => {
	const cases: readonly {
		readonly text: string;
		readonly answers: Readonly<Record<string, Answer>>;
		readonly question: string;
		readonly segments: readonly number[];
		readonly route: ReturnType<typeof route>;
	}[] = [
		{
			// Wir0 _1 fahren2 _3 entweder4 _5 mit6 _7 dem8 _9 Bus10 _11 oder12 …
			text: "Wir fahren entweder mit dem Bus oder mit dem Zug.",
			answers: { c_3_7: noul(0.9) },
			question: "r_3_7",
			segments: [4, 12],
			route: route("Locution", "CCONJ"),
		},
		{
			// Teils0 _1 regnete2 _3 es4 ,5 _6 teils7 …
			text: "Teils regnete es, teils schien die Sonne.",
			answers: { c_1_4: noul(0.9) },
			question: "r_1_4",
			segments: [0, 7],
			route: route("Locution", "ADV"),
		},
		{
			// Er0 _1 kam2 ,3 _4 um5 _6 sie7 _8 zu9 _10 sehen11 .12
			text: "Er kam, um sie zu sehen.",
			answers: { c_3_5: noul(0.9), s_preposition_3: picked("p6") },
			question: "r_3_5",
			segments: [5, 9],
			route: route("Locution", "SCONJ"),
		},
		{
			// Es0 _1 schneite2 _3 stark4 ,5 _6 so7 _8 dass9 …: sodass's spelling
			text: "Es schneite stark, so dass die Straße gesperrt wurde.",
			answers: { c_4_5: noul(0.9) },
			question: "r_4_5",
			segments: [7, 9],
			route: route("Lexeme", "SCONJ"),
		},
	];
	for (const entry of cases)
		for (const key of allRoutes)
			expect(
				await routeOf(entry.text, entry.segments, {
					...entry.answers,
					[entry.question]: heard(key),
				}),
			).toEqual(entry.route);
});
