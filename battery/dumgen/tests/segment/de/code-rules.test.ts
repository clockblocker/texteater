import { expect, test } from "bun:test";
import type { Answer } from "../../../src/segment/ask.js";
import {
	type CodeRule,
	codeRules,
} from "../../../src/segment/de/code-rules.js";
import {
	productionUnitSettings,
	segmentGermanUnits,
} from "../../../src/segment/de/units.js";
import type { Segment } from "../../../src/segment/segmented-sentence.js";
import { segmentsOf } from "../../spec-corpus/fixtures.js";
import { fakeJudge, noul, picked, route } from "./fake-judge.js";

/** The units' Segment groups without the rule and with it, from the same answers. */
async function groups(
	segments: readonly Segment[],
	answers: Readonly<Record<string, Answer>>,
	rule: CodeRule,
) {
	const of = async (rules: readonly CodeRule[]) =>
		(
			await segmentGermanUnits({ segments }, fakeJudge(answers).ask, {
				...productionUnitSettings,
				rules,
			})
		).map((unit) => unit.segments);
	return { without: await of([]), with: await of([rule]) };
}

/** Fixed words with every pair of them one expression. */
function fixedWords(...ids: number[]): Record<string, Answer> {
	const answers: Record<string, Answer> = {};
	for (const [position, id] of ids.entries()) {
		answers[`f_${id}`] = noul(0.95);
		for (const other of ids.slice(position + 1))
			answers[`e_${id}_${other}`] = noul(0.9);
	}
	return answers;
}

test("production applies no code rule yet; each rule is a setting", () => {
	expect(productionUnitSettings.rules).toEqual([]);
	expect(codeRules).toContain("split-adverb");
});

test("split-adverb: an accepted split adverb is its two pieces, and the verb stays bare", async () => {
	// Wo0 _1 gehst2 _3 du4 _5 hin6 ?7
	const result = await groups(
		segmentsOf("Wo gehst du hin?"),
		{ s_particle_4: picked("p2"), c_1_4: noul(0.9) },
		"split-adverb",
	);
	expect(result.without).toContainEqual([0, 2, 6]);
	expect(result.with).toEqual([[0, 6], [2], [4]]);
});

test("anchors: a correlator is its anchors only, nicht nur … sondern auch with all four", async () => {
	// Je0 _1 früher2 ,3 _4 desto5 _6 besser7 .8
	const je = await groups(
		segmentsOf("Je früher, desto besser."),
		{
			c_1_3: noul(0.95),
			...fixedWords(1, 2, 3, 4),
			e_2_4: noul(0.2),
		},
		"anchors",
	);
	expect(je.without).toEqual([[0, 2, 5, 7]]);
	expect(je.with).toEqual([[0, 5], [2], [7]]);
	// Er0 _1 ist2 _3 nicht4 _5 nur6 _7 klug8 ,9 _10 sondern11 _12 auch13 _14 fleißig15 .16
	const nichtNur = await groups(
		segmentsOf("Er ist nicht nur klug, sondern auch fleißig."),
		{ c_3_6: noul(0.9) },
		"anchors",
	);
	expect(nichtNur.with).toContainEqual([4, 6, 11, 13]);
});

test("anchors: um … zu is anchored as the zu-infinitive conjunction, other circumpositions are left to the judge", async () => {
	// Er0 _1 kam2 ,3 _4 um5 _6 sie7 _8 zu9 _10 sehen11 .12
	const umZu = await groups(
		segmentsOf("Er kam, um sie zu sehen."),
		{ c_3_5: noul(0.9), s_preposition_3: picked("p6") },
		"anchors",
	);
	expect(umZu.without).toContainEqual([5, 9, 11]);
	expect(umZu.with).toContainEqual([5, 9]);
	// Er0 _1 führt2 _3 an4 _5 der6 _7 Schule8 _9 vorbei10 .11
	const vorbei = await groups(
		segmentsOf("Er führt an der Schule vorbei."),
		{ c_3_6: noul(0.9), s_particle_6: picked("p2") },
		"anchors",
	);
	expect(vorbei.with).toEqual(vorbei.without);
	expect(vorbei.with).toContainEqual([2, 4, 10]);
});

test("quantifier: ein bisschen is one unit, and the noun it quantifies its own", async () => {
	// Gib0 _1 mir2 _3 ein4 _5 bisschen6 _7 Milch8 .9
	const result = await groups(
		segmentsOf("Gib mir ein bisschen Milch."),
		{ s_article_3: picked("p5") },
		"quantifier",
	);
	expect(result.without).toContainEqual([4, 8]);
	expect(result.with).toEqual([[0], [2], [4, 6], [8]]);
});

test("pronoun: mir stays out of tut … leid, but a reflexive coreferent with ich keeps its links", async () => {
	// Tut0 _1 mir2 _3 leid4 .5
	const leid = await groups(
		segmentsOf("Tut mir leid."),
		fixedWords(1, 2, 3),
		"pronoun",
	);
	expect(leid.without).toEqual([[0, 2, 4]]);
	expect(leid.with).toEqual([[0, 4], [2]]);
	// Ich0 _1 mache2 _3 mir4 _5 Sorgen6 .7
	const sorgen = await groups(
		segmentsOf("Ich mache mir Sorgen."),
		fixedWords(2, 3, 4),
		"pronoun",
	);
	expect(sorgen.with).toEqual(sorgen.without);
	expect(sorgen.with).toContainEqual([2, 4, 6]);
});

test("article-head: an article belongs to the noun right after it, unless the judge reads a pronoun", async () => {
	// Es0 _1 ist2 _3 eine4 _5 Art6 _7 Ziel8 .9
	const art = await groups(
		segmentsOf("Es ist eine Art Ziel."),
		{ s_article_3: picked("p5", { p5: 0.9, p4: 0.05, none: 0.05 }) },
		"article-head",
	);
	expect(art.without).toContainEqual([4, 8]);
	expect(art.with).toEqual([[0], [2], [4, 6], [8]]);
	// Die0 _1 Berliner2 _3 Polizei4 _5 kam6 .7: a capitalized adjective stays the judge's.
	const berliner = await groups(
		segmentsOf("Die Berliner Polizei kam."),
		{ s_article_1: picked("p3") },
		"article-head",
	);
	expect(berliner.with).toEqual(berliner.without);
	expect(berliner.with).toContainEqual([0, 4]);
	// Der0 _1 Mann2 ,3 _4 der5 _6 Angst7 _8 hat9 .10: relative der stays alone.
	const relative = await groups(
		segmentsOf("Der Mann, der Angst hat."),
		{
			s_article_1: picked("p2"),
			s_article_3: picked("none", { none: 0.8, p4: 0.2 }),
		},
		"article-head",
	);
	expect(relative.with).toEqual(relative.without);
	expect(relative.with).toContainEqual([5]);
});

test("sein-chain: worden joins its participle and the sein of its clause", async () => {
	// Er0 _1 ist2 _3 gestern4 _5 gefunden6 _7 worden8 .9
	const found = await groups(
		segmentsOf("Er ist gestern gefunden worden."),
		{},
		"sein-chain",
	);
	expect(found.without).toEqual([[0], [2], [4], [6], [8]]);
	expect(found.with).toEqual([[0], [2, 6, 8], [4]]);
	// Das0 _1 wäre2 _3 schön4 _5 gewesen6 .7
	const gewesen = await groups(
		segmentsOf("Das wäre schön gewesen."),
		{},
		"sein-chain",
	);
	expect(gewesen.with).toEqual([[0], [2, 6], [4]]);
});

test("was-fuer: final asks whether was … für is was für ein, and the judge's yes makes one Locution", async () => {
	// Was0 _1 ist2 _3 das4 _5 für6 _7 ein8 _9 Buch10 ?11
	const segments = segmentsOf("Was ist das für ein Buch?");
	const answers = {
		s_article_5: picked("p6"),
		w4_1_4: noul(0.9),
		r_1_4_5: picked("Locution/DET"),
	};
	const result = await groups(segments, answers, "was-fuer");
	expect(result.without).toContainEqual([8, 10]);
	expect(result.with).toEqual([[0, 6, 8], [2], [4], [10]]);
	const judge = fakeJudge(answers);
	const units = await segmentGermanUnits({ segments }, judge.ask, {
		...productionUnitSettings,
		rules: ["was-fuer"],
	});
	const final = judge.requests.find(({ stage }) => stage === "final");
	expect(Object.keys(final?.questions ?? {})).toContain("w4_1_4");
	expect(units).toContainEqual({
		segments: [0, 6, 8],
		route: route("Locution", "DET"),
	});
	// Without the rule, final asks nothing about was … für.
	const plain = fakeJudge(answers);
	await segmentGermanUnits({ segments }, plain.ask);
	expect(
		Object.keys(
			plain.requests.find(({ stage }) => stage === "final")?.questions ??
				{},
		),
	).not.toContain("w4_1_4");
});

test("infixed-zu: the particle and stem around an infixed zu are one verb, and zu stays apart", async () => {
	// Er0 _1 fing2 _3 an4 ,5 _6 ab7 zu8 spannen9 .10
	const segments: Segment[] = [
		...segmentsOf("Er fing an, "),
		{ kind: "ResolvableText", text: "ab" },
		{ kind: "ResolvableText", text: "zu" },
		{ kind: "ResolvableText", text: "spannen" },
		{ kind: "Punctuation", text: "." },
	];
	const result = await groups(
		segments,
		{ s_particle_3: picked("p2") },
		"infixed-zu",
	);
	expect(result.without).toEqual([[0], [2, 4], [7], [8], [9]]);
	expect(result.with).toEqual([[0], [2, 4], [7, 9], [8]]);
});

test("binomial: und between two members of one Locution is a member", async () => {
	// Er0 _1 hat2 _3 Hand4 _5 und6 _7 Fuß8 .9
	const result = await groups(
		segmentsOf("Er hat Hand und Fuß."),
		fixedWords(2, 3, 5),
		"binomial",
	);
	expect(result.without).toEqual([[0], [2, 4, 8], [6]]);
	expect(result.with).toEqual([[0], [2, 4, 6, 8]]);
});

test("answer-apart: an answer word before a formula is no merged interjection", async () => {
	// Nein0 _1 danke2 ,3 _4 ach5 _6 je7 .8
	const result = await groups(
		segmentsOf("Nein danke, ach je."),
		{
			r_1: picked("Lexeme/INTJ"),
			r_2: picked("Lexeme/INTJ"),
			r_3: picked("Lexeme/INTJ"),
			r_4: picked("Lexeme/INTJ"),
		},
		"answer-apart",
	);
	expect(result.without).toEqual([
		[0, 2],
		[5, 7],
	]);
	expect(result.with).toEqual([[0], [2], [5, 7]]);
});
