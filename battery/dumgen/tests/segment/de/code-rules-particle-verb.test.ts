import { expect, test } from "bun:test";
import { germanSeparablePrefixes } from "dumcorpus/inventories";
import * as Effect from "effect/Effect";
import {
	goldRouteOf,
	loadGold,
} from "../../../lab/evaluation/spec-corpus/gold.js";
import type { Answer } from "../../../src/segment/ask.js";
import type { CodeRule } from "../../../src/segment/de/code-rules.js";
import { sentenceOf } from "../../../src/segment/de/sentence.js";
import {
	productionUnitSettings,
	segmentGermanUnits,
} from "../../../src/segment/de/units.js";
import type { Segment } from "../../../src/segment/segmented-sentence.js";
import { segmentsOf } from "../../lab/evaluation/spec-corpus/fixtures.js";
import { fixedWords } from "./code-rules-support.js";
import { fakeJudge, picked, route } from "./fake-judge.js";

/** The units of `segments` from `answers`, with the `particle-verb` rule or none, and the requests each sent. */
async function particleVerbUnits(
	segments: readonly Segment[],
	answers: Readonly<Record<string, Answer>>,
) {
	const of = async (rules: readonly CodeRule[]) => {
		const judge = fakeJudge(answers);
		const units = await Effect.runPromise(
			segmentGermanUnits({ segments }, judge.ask, {
				...productionUnitSettings,
				rules,
			}),
		);
		return { units, requests: judge.requests };
	};
	return { without: await of([]), with: await of(["particle-verb"]) };
}

/** A route Choice answer: its top share's route, with these shares. */
const routeShares = (shares: Record<string, number>): Answer => {
	const [top] = Object.entries(shares).sort((a, b) => b[1] - a[1]);
	return picked(top?.[0] ?? "", shares);
};

// The shapes #1151 probed, each with the route shares jev gave it there.
const probedParticleVerbs = [
	{
		// Die1 Firma2 gab3 gestern4 die5 Ergebnisse6 bekannt7 .
		sentence: "Die Firma gab gestern die Ergebnisse bekannt.",
		unit: [4, 12],
		answers: {
			...fixedWords(3, 7),
			s_particle_7: picked("p3"),
			r_3_7: routeShares({ "Lexeme/VERB": 0.73, "Locution/VERB": 0.27 }),
		},
		before: route("Locution", "VERB"),
	},
	{
		// Die1 Firma2 hat3 gestern4 die5 Ergebnisse6 bekannt7 gegeben8 .
		sentence: "Die Firma hat gestern die Ergebnisse bekannt gegeben.",
		unit: [4, 12, 14],
		answers: {
			...fixedWords(7, 8),
			s_auxiliary_3: picked("p8"),
			r_3_7_8: routeShares({
				"Lexeme/VERB": 0.88,
				"Locution/VERB": 0.12,
			}),
		},
		before: route("Locution", "VERB"),
	},
	{
		// Wir1 stellen2 sicher3 , dass4 alles5 klappt6 .
		sentence: "Wir stellen sicher, dass alles klappt.",
		unit: [2, 4],
		answers: {
			...fixedWords(2, 3),
			s_particle_3: picked("p2"),
			r_2_3: routeShares({ "Lexeme/VERB": 0.57, "Locution/VERB": 0.43 }),
		},
		before: route("Locution", "VERB"),
	},
	{
		// Der1 Bericht2 hält3 fest4 , dass5 die6 Kosten7 gestiegen8 sind9 .
		sentence: "Der Bericht hält fest, dass die Kosten gestiegen sind.",
		unit: [4, 6],
		answers: {
			...fixedWords(3, 4),
			s_particle_4: picked("p3"),
			r_3_4: routeShares({ "Lexeme/VERB": 0.55, "Locution/VERB": 0.45 }),
		},
		before: route("Locution", "VERB"),
	},
	{
		// Ich1 machte2 ihm3 klar4 , dass5 das6 nicht7 geht8 .
		sentence: "Ich machte ihm klar, dass das nicht geht.",
		unit: [2, 6],
		answers: {
			...fixedWords(2, 4),
			r_2_4: routeShares({ "Locution/VERB": 0.69, "Lexeme/VERB": 0.31 }),
		},
		before: route("Locution", "VERB"),
	},
	{
		// Der1 alte2 Hund3 tut4 mir5 so6 leid7 .
		sentence: "Der alte Hund tut mir so leid.",
		unit: [6, 12],
		answers: {
			...fixedWords(4, 7),
			r_4_7: routeShares({
				"Locution/INTJ": 0.87,
				"Locution/VERB": 0.06,
				"Lexeme/VERB": 0.06,
				"Locution/ADJ": 0.01,
			}),
		},
		before: route("Locution", "INTJ"),
	},
	{
		// Es1 tut2 mir3 leid4 .
		sentence: "Es tut mir leid.",
		unit: [0, 2, 6],
		answers: {
			...fixedWords(2, 4),
			s_expletive_1: picked("p2"),
			r_1_2_4: routeShares({
				"Locution/INTJ": 0.9,
				"Lexeme/VERB": 0.08,
				"Locution/VERB": 0.02,
			}),
		},
		before: route("Locution", "INTJ"),
	},
];

for (const probe of probedParticleVerbs)
	test(`particle-verb: ${probe.sentence} routes its particle verb Lexeme VERB, not a Locution, and asks nothing more`, async () => {
		const result = await particleVerbUnits(
			segmentsOf(probe.sentence),
			probe.answers,
		);
		expect(result.without.units).toContainEqual({
			segments: probe.unit,
			route: probe.before,
		});
		expect(result.with.units).toContainEqual({
			segments: probe.unit,
			route: route("Lexeme", "VERB"),
		});
		expect(result.with.requests).toEqual(result.without.requests);
	});

test("particle-verb: a unit the route Choice hears as another Lexeme Kind than VERB stays a Locution", async () => {
	// Der1 alte2 Hund3 tut4 mir5 so6 leid7 .
	const result = await particleVerbUnits(
		segmentsOf("Der alte Hund tut mir so leid."),
		{
			...fixedWords(4, 7),
			r_4_7: routeShares({
				"Locution/INTJ": 0.87,
				"Lexeme/INTJ": 0.08,
				"Lexeme/VERB": 0.05,
			}),
		},
	);
	expect(result.with.units).toContainEqual({
		segments: [6, 12],
		route: route("Locution", "INTJ"),
	});
});

/** The gold's two-member Locutions with one separable prefix word: ohne … zu, Auf Wiedersehen, vor allem, … */
const prefixLocutions = loadGold().records.flatMap((record) =>
	record.language !== "de"
		? []
		: record.targets
				.filter(
					(target) =>
						target.route.family === "Locution" &&
						target.memberSegmentIndices.length === 2 &&
						target.memberSegmentIndices.filter((index) =>
							germanSeparablePrefixes.has(
								record.segments[index]?.text.toLowerCase() ??
									"",
							),
						).length === 1,
				)
				.map((target) => ({ record, target })),
);

/** Answers that join a gold target's two pieces as one expression, its route Choice giving `shares`. */
function prefixLocutionAnswers(
	{ record, target }: (typeof prefixLocutions)[number],
	shares: (route: string, kind: string) => Record<string, number>,
): Record<string, Answer> {
	const ids = sentenceOf(record)
		.pieces.filter((piece) =>
			target.memberSegmentIndices.includes(piece.segment),
		)
		.map((piece) => piece.id);
	const { family, kind } = target.route;
	return {
		...fixedWords(...ids),
		[`r_${ids.join("_")}`]: routeShares(shares(`${family}/${kind}`, kind)),
	};
}

test("particle-verb: the gold's two-member Locutions with one prefix word stay Locutions when the route Choice hears no verb in them", async () => {
	expect(prefixLocutions.length).toBeGreaterThanOrEqual(21);
	for (const gold of prefixLocutions) {
		const result = await particleVerbUnits(
			gold.record.segments,
			prefixLocutionAnswers(gold, (goldRoute, kind) => ({
				[goldRoute]: 0.85,
				[`Lexeme/${kind}`]: 0.1,
				"Lexeme/VERB": 0.05,
			})),
		);
		expect({ id: gold.record.id, units: result.with.units }).toEqual({
			id: gold.record.id,
			units: expect.arrayContaining([
				{
					segments: gold.target.memberSegmentIndices,
					route: goldRouteOf(gold.target.route),
				},
			]),
		});
	}
});

test("particle-verb: the verb test is what keeps those gold Locutions: heard as verbs, every one not split from a fused word would route Lexeme VERB", async () => {
	for (const gold of prefixLocutions) {
		const fused = sentenceOf(gold.record).pieces.some(
			(piece) =>
				piece.fusedWord !== undefined &&
				gold.target.memberSegmentIndices.includes(piece.segment),
		);
		const result = await particleVerbUnits(
			gold.record.segments,
			prefixLocutionAnswers(gold, (goldRoute, kind) => ({
				[goldRoute]: 0.85,
				"Lexeme/VERB": 0.1,
				[`Lexeme/${kind}`]: 0.05,
			})),
		);
		expect({ id: gold.record.id, units: result.with.units }).toEqual({
			id: gold.record.id,
			units: expect.arrayContaining([
				{
					segments: gold.target.memberSegmentIndices,
					route: fused
						? goldRouteOf(gold.target.route)
						: route("Lexeme", "VERB"),
				},
			]),
		});
	}
});
