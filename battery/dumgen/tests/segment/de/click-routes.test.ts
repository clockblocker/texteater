/**
 * The routes that sent clicks on new texts wrong (#1340, from #1337's
 * clicks): each test holds one rule at the place a route is decided, and
 * fails on the code before #1340.
 */
import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { Answer } from "../../../src/segment/ask.js";
import type { Segment, Unit } from "../../../src/segment/segmented-sentence.js";
import { segmentsOf } from "../../lab/evaluation/spec-corpus/fixtures.js";
import { fakeJudge, germanUnits, noul, picked, route } from "./fake-judge.js";

const run = (
	segments: readonly Segment[],
	answers: Readonly<Record<string, Answer>> = {},
) => {
	const judge = fakeJudge(answers);
	return Effect.runPromise(germanUnits({ segments }, judge.ask)).then(
		(units: Unit[]) => ({ units, judge }),
	);
};
const unitAt = (units: readonly Unit[], segment: number) =>
	units.find((unit) => unit.segments.includes(segment));

test("a negation adverb is ADV, never the PART the route Choice hears", async () => {
	// Fang0 _1 nie2 _3 damit4 _5 an6 !7
	for (const word of ["nie", "niemals", "keineswegs"]) {
		const { units } = await run(segmentsOf(`Fang ${word} damit an!`), {
			r_2: picked("Lexeme/PART", {
				"Lexeme/PART": 0.56,
				"Lexeme/ADV": 0.44,
			}),
		});
		expect(unitAt(units, 2)).toEqual({
			segments: [2],
			route: route("Lexeme", "ADV"),
		});
	}
});

test("a unit of several pieces never takes Lexeme PART: it takes its Family's next Kind", async () => {
	// Er0 _1 ist2 _3 bereit4 _5 zu6 _7 allem8 .9
	const { units } = await run(segmentsOf("Er ist bereit zu allem."), {
		s_preposition_4: picked("p3", { p3: 0.8, none: 0.2 }),
		g_joined_4_3: picked("governed", { governed: 0.9, place: 0.1 }),
		r_3_4: picked("Lexeme/PART", {
			"Lexeme/PART": 0.55,
			"Lexeme/ADJ": 0.28,
			"Locution/ADJ": 0.17,
		}),
	});
	expect(unitAt(units, 4)).toEqual({
		segments: [4, 6],
		route: route("Lexeme", "ADJ"),
	});
});

test("an abbreviation spaced after its inner dot is asked its route as an abbreviation", async () => {
	// Wir0 _1 kaufen2 _3 Obst4 ,5 _6 z. B.7 _8 Äpfel9 .10
	const segments: Segment[] = [
		...segmentsOf("Wir kaufen Obst, "),
		{ kind: "ResolvableText", text: "z. B." },
		...segmentsOf(" Äpfel."),
	];
	const { units, judge } = await run(segments, {
		r_4: picked("Foreign/Foreign"),
		ra_4: picked("Locution/ADV"),
	});
	expect(judge.questionsOf("route2")?.ra_4).toBeDefined();
	expect(unitAt(units, 7)?.route).toEqual(route("Locution", "ADV"));
});

test("a noun takes one article, the nearest that names it; the farther one is the pronoun it stands for", async () => {
	// Er0 _1 wohnt2 _3 in4 _5 einem6 _7 der8 _9 Ausläufer10 .11
	const { units } = await run(
		segmentsOf("Er wohnt in einem der Ausläufer."),
		{
			s_article_4: picked("p6", { p6: 0.96, none: 0.04 }),
			s_article_5: picked("p6", { p6: 0.95, none: 0.05 }),
			i_4: picked("c0", { c0: 0.95, c1: 0.01, Other: 0.04 }),
			tm_4: noul(0.58),
		},
	);
	expect(unitAt(units, 10)?.segments).toEqual([8, 10]);
	const einem = unitAt(units, 6);
	expect(einem?.segments).toEqual([6]);
	expect(einem?.route).toEqual(route("Lexeme", "PRON"));
	expect(einem?.identity).toMatchObject({ kind: "PRON", pronType: "Ind" });
});

test("an even DET/PRON test leaves the identity Choice's Kind; an answer either way still decides", async () => {
	// Es0 _1 gibt2 _3 einen4 _5 Dienst6 ,7 _8 der9 _10 landesweit11 _12 arbeitet13 .14
	const dienst = segmentsOf("Es gibt einen Dienst, der landesweit arbeitet.");
	const relative = { i_5: picked("c2", { c0: 0.07, c2: 0.93 }) };
	const even = await run(dienst, { ...relative, tm_5: noul(0.5) });
	expect(unitAt(even.units, 9)?.route).toEqual(route("Lexeme", "PRON"));
	expect(unitAt(even.units, 9)?.identity).toMatchObject({ pronType: "Rel" });
	const modifies = await run(dienst, { ...relative, tm_5: noul(0.6) });
	expect(unitAt(modifies.units, 9)?.route).toEqual(route("Lexeme", "DET"));
});

test("a mid-sentence capitalized noun homograph skips closed-class override and keeps the open route Choice", async () => {
	// Doch0 _1 jedes2 _3 Mal4 _5 erwies6 _7 sich8 _9 der10 _11 Vogel12 _13 als14 _15 Taube16 .17
	const { units, judge } = await run(
		segmentsOf("Doch jedes Mal erwies sich der Vogel als Taube."),
		{
			r_3: picked("Lexeme/NOUN", {
				"Lexeme/NOUN": 0.94,
				"Lexeme/ADV": 0.06,
			}),
			cc_3: picked("adverb"),
		},
	);
	expect(judge.questionsOf("closed")?.cc_3).toBeUndefined();
	expect(unitAt(units, 4)).toEqual({
		segments: [4],
		route: route("Lexeme", "NOUN"),
	});
	// Fixed closed-class spellings (Selbst, Nein) also defer to the open route
	// when capitalized mid-sentence as nouns.
	// Sie0 _1 akzeptierte2 _3 kein4 _5 Nein6 .7
	const nein = await run(segmentsOf("Sie akzeptierte kein Nein."), {
		r_4: picked("Lexeme/NOUN"),
	});
	expect(unitAt(nein.units, 6)?.route).toEqual(route("Lexeme", "NOUN"));
	// Er0 _1 fand2 _3 sein4 _5 eigenes6 _7 Selbst8 .9
	const selbst = await run(segmentsOf("Er fand sein eigenes Selbst."), {
		r_5: picked("Lexeme/NOUN"),
	});
	expect(unitAt(selbst.units, 8)?.route).toEqual(route("Lexeme", "NOUN"));
});

test("position-capitalized closed-class words still ask closed-class uses, including noun and verb homographs", async () => {
	// Kommst0 _1 du2 ?3 _4 –5 _6 Ja7 .8
	const dialogue = await run(segmentsOf("Kommst du? – Ja."), {
		r_3: picked("Lexeme/NOUN"),
		cc_3: picked("answer"),
	});
	expect(dialogue.judge.questionsOf("closed")?.cc_3).toBeDefined();
	expect(unitAt(dialogue.units, 7)?.route).toEqual(route("Lexeme", "INTJ"));
	// Halt0 _1 fand2 _3 er4 _5 keinen6 .7
	const haltNoun = await run(segmentsOf("Halt fand er keinen."), {
		cc_1: picked("noun"),
	});
	const haltQuestion = haltNoun.judge.questionsOf("closed")?.cc_1;
	expect(
		haltQuestion?.type === "choice" && Object.keys(haltQuestion.criteria),
	).toEqual(["modal", "interjection", "noun", "verb"]);
	expect(unitAt(haltNoun.units, 0)?.route).toEqual(route("Lexeme", "NOUN"));
	// Mal0 _1 ein2 _3 Bild4 !5
	const malVerb = await run(segmentsOf("Mal ein Bild!"), {
		cc_1: picked("verb"),
	});
	const malQuestion = malVerb.judge.questionsOf("closed")?.cc_1;
	expect(
		malQuestion?.type === "choice" && Object.keys(malQuestion.criteria),
	).toEqual(["modal", "adverb", "noun", "verb"]);
	expect(unitAt(malVerb.units, 0)?.route).toEqual(route("Lexeme", "VERB"));
});
