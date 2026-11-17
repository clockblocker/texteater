import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { ProviderFailure } from "../../../src/errors.js";
import type { Answer, Ask } from "../../../src/segment/ask.js";
import { locutionSettings } from "../../../src/segment/de/locution-choice.js";
import {
	productionUnitSettings,
	segmentGermanUnits,
} from "../../../src/segment/de/units.js";
import { segmentsOf } from "../../lab/evaluation/spec-corpus/fixtures.js";
import { fakeJudge, picked, route } from "./fake-judge.js";

/** Every request a test's `failing` ask was sent, failed or not. */
const sent: string[] = [];

/** `ask`, except that a request asking for `stage` fails. */
const failing =
	(ask: Ask, stage: string): Ask =>
	(request) =>
		sent.push(request.stage) && request.stage.split("+").includes(stage)
			? Effect.fail(
					new ProviderFailure({
						stage: request.stage,
						message: "down",
					}),
				)
			: ask(request);

const run = (
	sentence: string,
	answers: Readonly<Record<string, Answer>>,
	failed?: string,
	settings = productionUnitSettings,
) => {
	const judge = fakeJudge(answers);
	sent.length = 0;
	return Effect.runPromise(
		segmentGermanUnits(
			{ segments: segmentsOf(sentence) },
			failed ? failing(judge.ask, failed) : judge.ask,
			settings,
		),
	).then((result) => ({ ...result, judge }));
};

// Das0 _1 ist2 _3 eben4 _5 nicht6 _7 so8 .9
const eben = {
	r_1: picked("Lexeme/PRON"),
	r_3: picked("Lexeme/ADV"),
	r_4: picked("Lexeme/ADV"),
	cc_3: picked("modal"),
};

test("a failed closed request leaves only the pieces it decides Unresolved, never their open route", async () => {
	const { units, degraded, judge } = await run(
		"Das ist eben nicht so.",
		eben,
		"closed",
	);
	expect(units).toContainEqual({ segments: [4], route: "Unresolved" });
	// nicht's one use needs no request, and Das routes as before.
	expect(units).toContainEqual({
		segments: [6],
		route: route("Lexeme", "PART"),
	});
	expect(units).toContainEqual({
		segments: [0],
		route: route("Lexeme", "PRON"),
		identity: { kind: "PRON", canonicalForm: "das", pronType: "Dem" },
	});
	expect(degraded.map(({ stage }) => stage)).toEqual(["closed"]);
	// closed was sent once and apart, the routes went out all the same.
	expect(sent.filter((stage) => stage.includes("closed"))).toEqual([
		"closed",
	]);
	expect(judge.questionsOf("route")).toBeDefined();
});

// Sie0 _1 nahm2 _3 das4 _5 Risiko6 _7 in8 _9 Kauf10 .11
const kauf = "Sie nahm das Risiko in Kauf.";
const fixedSide = picked("fixed", { fixed: 0.8, free: 0.2 });
const merging = {
	s_article_3: picked("p4"),
	s_idiom_6: picked("p2", { p2: 0.4, none: 0.6 }),
	lc_2_x_6_l: fixedSide,
	lc_2_x_6_r: fixedSide,
};
const withLocution = { ...productionUnitSettings, locution: locutionSettings };

test("a failed Locution Choice keeps the membership settled before it, and its late companions degrade with it", async () => {
	const merged = await run(kauf, merging, undefined, withLocution);
	expect(merged.units.map(({ segments }) => segments)).toContainEqual([
		2, 8, 10,
	]);
	const { units, degraded } = await run(
		kauf,
		merging,
		"locution",
		withLocution,
	);
	const { locution: _, ...without } = withLocution;
	const before = await run(kauf, merging, undefined, without);
	expect(units.map(({ segments }) => segments)).toEqual(
		before.units.map(({ segments }) => segments),
	);
	// The route batches went out in the same request, so they degraded too.
	expect(degraded.map(({ stage }) => stage).sort()).toEqual([
		"locution",
		"route",
	]);
	expect(units.every((unit) => unit.route === "Unresolved")).toBe(true);
});
