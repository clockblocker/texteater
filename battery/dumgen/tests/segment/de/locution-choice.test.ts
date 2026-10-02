import { expect, test } from "bun:test";
import type { Answer } from "../../../src/segment/ask.js";
import {
	bleibenCandidates,
	locutionSettings,
	wordingOf,
} from "../../../src/segment/de/locution-choice.js";
import { sentenceOf } from "../../../src/segment/de/sentence.js";
import {
	productionUnitSettings,
	segmentGermanUnits,
} from "../../../src/segment/de/units.js";
import { segmentsOf } from "../../spec-corpus/fixtures.js";
import { fakeJudge, noul, picked } from "./fake-judge.js";

const withLocution = { ...productionUnitSettings, locution: locutionSettings };

/** The units' Segment groups and the requests' stages, with the Locution Choice on. */
async function run(sentence: string, answers: Record<string, Answer>) {
	const judge = fakeJudge(answers);
	const units = await segmentGermanUnits(
		{ segments: segmentsOf(sentence) },
		judge.ask,
		withLocution,
	);
	return {
		groups: units.map((unit) => unit.segments),
		units,
		judge,
	};
}

// Sie0 _1 nahm2 _3 das4 _5 Risiko6 _7 in8 _9 Kauf10 .11
const kauf = "Sie nahm das Risiko in Kauf.";
const idiomUnderFloor = {
	s_article_3: picked("p4"),
	s_idiom_6: picked("p2", { p2: 0.4, none: 0.6 }),
};

test("an idiom host share under the floor asks the Locution Choice; a whole answer merges with the opening preposition", async () => {
	const { groups, units, judge } = await run(kauf, {
		...idiomUnderFloor,
		lc_2_x_6: picked("whole", { whole: 0.8, free: 0.2 }),
		r_2_5_6: picked("Locution/VERB", {
			"Locution/VERB": 0.6,
			"Lexeme/VERB": 0.4,
		}),
	});
	const locution = judge.requests.find(({ stage }) => stage === "locution");
	expect(Object.keys(locution?.questions ?? {})).toEqual(["lc_2_x_6"]);
	expect(groups).toEqual([[0], [2, 8, 10], [4, 6]]);
	expect(units.find((unit) => unit.segments.length === 3)?.route).toEqual(
		expect.objectContaining({ family: "Locution", kind: "VERB" }),
	);
	// The new group's route is asked after the batches.
	expect(judge.stages().at(-1)).toBe("route-extra");
});

test("a merge needs the whole share at the floor; otherwise the units stand", async () => {
	const { groups } = await run(kauf, {
		...idiomUnderFloor,
		lc_2_x_6: picked("outside", { whole: 0.4, outside: 0.6 }),
	});
	expect(groups).toEqual([[0], [2], [4, 6], [8], [10]]);
});

test("without the setting, or with no candidate, no locution request is sent", async () => {
	const off = fakeJudge(idiomUnderFloor);
	await segmentGermanUnits(
		{ segments: segmentsOf(kauf) },
		off.ask,
		productionUnitSettings,
	);
	expect(off.stages()).not.toContain("locution");
	const { judge } = await run(kauf, {});
	expect(judge.stages()).not.toContain("locution");
});

test("bleiben with an infinitive is asked and, on yes, one Locution", async () => {
	// Der0 _1 Aufzug2 _3 bleibt4 _5 nie6 _7 stehen8 .9
	const { groups, judge } = await run("Der Aufzug bleibt nie stehen.", {
		s_article_1: picked("p2"),
		lb_3_5: noul(0.9),
	});
	expect(
		Object.keys(
			judge.requests.find(({ stage }) => stage === "locution")
				?.questions ?? {},
		),
	).toEqual(["lb_3_5"]);
	expect(groups).toEqual([[0, 2], [4, 8], [6]]);
});

test("bleiben candidates: the infinitive before it or ending its clause, no participle or adverb", () => {
	const of = (text: string) =>
		bleibenCandidates({
			sentence: sentenceOf({ segments: segmentsOf(text) }),
		}).map(
			({ bleiben, infinitive }) => `${bleiben.text} ${infinitive.text}`,
		);
	expect(of("Der Wagen ist liegen geblieben.")).toEqual(["geblieben liegen"]);
	expect(of("Die Uhr blieb stehen, als es klingelte.")).toEqual([
		"blieb stehen",
	]);
	expect(of("Das Tor blieb geschlossen.")).toEqual([]);
	expect(of("Wir bleiben heute drinnen.")).toEqual([]);
	expect(of("Er bleibt, um zu essen.")).toEqual([]);
});

test("the wording shows the pieces as written, with … for a gap", () => {
	const sentence = sentenceOf({
		segments: segmentsOf("Er hat, wie man sagt, Schwein gehabt."),
	});
	expect(wordingOf({ sentence }, [2, 6, 7])).toBe("hat … Schwein gehabt");
	expect(wordingOf({ sentence }, [1, 2])).toBe("Er hat");
});
