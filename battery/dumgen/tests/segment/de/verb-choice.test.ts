import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { Answer } from "../../../src/segment/ask.js";
import {
	productionUnitSettings,
	segmentGermanUnits,
} from "../../../src/segment/de/units.js";
import {
	type VerbFamily,
	verbFamilies,
	verbSettings,
} from "../../../src/segment/de/verb-choice.js";
import { segmentsOf } from "../../spec-corpus/fixtures.js";
import { fakeJudge, picked } from "./fake-judge.js";

const withVerb = (families: readonly VerbFamily[] = verbFamilies) => ({
	...productionUnitSettings,
	verb: { ...verbSettings, families },
});

/** The units' Segment groups and the requests, with the Verb Choice on. */
async function run(
	sentence: string,
	answers: Record<string, Answer>,
	settings = withVerb(),
) {
	const judge = fakeJudge(answers);
	const units = await Effect.runPromise(
		segmentGermanUnits(
			{ segments: segmentsOf(sentence) },
			judge.ask,
			settings,
		),
	);
	return { groups: units.map((unit) => unit.segments), judge };
}

const hostUnderNone = (host: string, share: number) =>
	picked("none", { [host]: share, none: 1 - share });

// Wir0 _1 lassen2 _3 das4 _5 Dach6 _7 decken8 .9
const dach = "Wir lassen das Dach decken.";
const dachHeard = {
	s_article_3: picked("p4"),
	s_auxiliary_2: hostUnderNone("p5", 0.3),
};

test("de/causative-lassen: a causative answer joins lassen and its infinitive, which the auxiliary slot left apart", async () => {
	const { groups, judge } = await run(dach, {
		...dachHeard,
		v_lassen_2_5: picked("causative", { causative: 0.8, doer: 0.2 }),
	});
	const verb = judge.requests.find(({ stage }) => stage === "verb");
	expect(Object.keys(verb?.questions ?? {})).toEqual(["v_lassen_2_5"]);
	expect(groups).toEqual([[0], [2, 8], [4, 6]]);
	// The new group's route is asked after the batches.
	expect(judge.stages().at(-1)).toBe("route-extra");
});

test("production asks only the lassen, recipient and state families", async () => {
	// Er0 _1 verteidigt2 _3 sich4 .5
	const reflexive = fakeJudge({ s_reflexive_3: picked("p2") });
	await Effect.runPromise(
		segmentGermanUnits(
			{ segments: segmentsOf("Er verteidigt sich.") },
			reflexive.ask,
		),
	);
	expect(reflexive.stages()).not.toContain("verb");
	const lassen = fakeJudge(dachHeard);
	await Effect.runPromise(
		segmentGermanUnits({ segments: segmentsOf(dach) }, lassen.ask),
	);
	expect(lassen.stages()).toContain("verb");
});

test("an answer under the floor, or other, keeps the slot's grouping", async () => {
	const under = await run(dach, {
		...dachHeard,
		v_lassen_2_5: picked("causative", { causative: 0.55, doer: 0.45 }),
	});
	expect(under.groups).toEqual([[0], [2], [4, 6], [8]]);
	const other = await run(dach, dachHeard);
	expect(other.groups).toEqual([[0], [2], [4, 6], [8]]);
});

// Die0 _1 Tür2 _3 lässt4 _5 sich6 _7 nicht8 _9 schließen10 .11
test("de/causative-lassen: the modal passive joins lassen and its sich and drops the infinitive the slot gave it", async () => {
	const { groups } = await run("Die Tür lässt sich nicht schließen.", {
		s_article_1: picked("p2"),
		s_auxiliary_3: picked("p6", { p6: 0.55, none: 0.45 }),
		v_lassen_3_6: picked("modal", { modal: 0.9, causative: 0.1 }),
	});
	expect(groups).toEqual([[0, 2], [4, 6], [8], [10]]);
});

// Das0 _1 Museum2 _3 hat4 _5 montags6 _7 geschlossen8 .9
const museum = "Das Museum hat montags geschlossen.";
const museumHeard = {
	s_article_1: picked("p2"),
	s_auxiliary_3: picked("p5", { p5: 0.95, none: 0.05 }),
};

test("de/sein-perfect-or-copula: a state answer drops the auxiliary link; the family is a setting", async () => {
	const state = {
		...museumHeard,
		v_state_3_5: picked("state", { state: 0.8, perfect: 0.2 }),
	};
	const { groups } = await run(museum, state);
	expect(groups).toEqual([[0, 2], [4], [6], [8]]);
	const off = await run(museum, state, withVerb(["lassen"]));
	expect(off.groups).toEqual([[0, 2], [4, 8], [6]]);
});

test("#725: haben with a participle the sentence can't settle joins as the perfect", async () => {
	const { groups } = await run(museum, {
		s_article_1: picked("p2"),
		s_auxiliary_3: hostUnderNone("p5", 0.2),
		v_state_3_5: picked("open", { open: 0.5, perfect: 0.2, state: 0.3 }),
	});
	expect(groups).toEqual([[0, 2], [4, 8], [6]]);
});

// Es0 _1 ist2 _3 schon4 _5 spät6 .7
test("de/expletive-es-joins-its-verb: the es of time with sein joins it, heard near zero by the slot", async () => {
	const { groups } = await run("Es ist schon spät.", {
		s_expletive_1: hostUnderNone("p2", 0.05),
		v_expletive_1_2: picked("selected", {
			selected: 0.7,
			referential: 0.3,
		}),
	});
	expect(groups).toEqual([[0, 2], [4], [6]]);
});

// Er0 _1 verteidigt2 _3 sich4 .5
test("de/verb-owns-its-scattered-members: a reflexive an object could replace leaves the verb", async () => {
	const { groups } = await run("Er verteidigt sich.", {
		s_reflexive_3: picked("p2", { p2: 0.7, none: 0.3 }),
		v_reflexive_3_2: picked("free", { free: 0.75, lexical: 0.25 }),
	});
	expect(groups).toEqual([[0], [2], [4]]);
});

test("a Sentence with no flagged satellite asks no verb request; a participle-less copula is no flag", async () => {
	const { judge } = await run("Er ist krank.", {
		s_auxiliary_2: picked("p3", { p3: 0.4, none: 0.6 }),
	});
	expect(judge.stages()).not.toContain("verb");
	const off = fakeJudge(dachHeard);
	const { verb: _, ...without } = productionUnitSettings;
	await Effect.runPromise(
		segmentGermanUnits({ segments: segmentsOf(dach) }, off.ask, without),
	);
	expect(off.stages()).not.toContain("verb");
});
