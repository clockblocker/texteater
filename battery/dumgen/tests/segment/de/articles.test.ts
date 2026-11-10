import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { Answer } from "../../../src/segment/ask.js";
import { fusedArticle } from "../../../src/segment/de/assembly.js";
import { sentenceOf } from "../../../src/segment/de/sentence.js";
import type { Segment, Unit } from "../../../src/segment/segmented-sentence.js";
import { segmentsOf } from "../../lab/evaluation/spec-corpus/fixtures.js";
import { groups } from "./code-rules-support.js";
import { fakeJudge, germanUnits, noul, picked, route } from "./fake-judge.js";

/** A written word split into its pieces: zum is zu and m (dem). */
const fused = (...parts: (readonly [string, string])[]): Segment[] =>
	parts.map(([text, surface]) => ({
		kind: "ResolvableText",
		text,
		surface,
	}));

// Das0 _1 Museum2 _3 öffnet4 _5 zu6 m7 _8 Beispiel9 _10 a11 m12 _13 Montag14 .15
const zumBeispiel: readonly Segment[] = [
	...segmentsOf("Das Museum öffnet "),
	...fused(["zu", "zu"], ["m", "dem"]),
	...segmentsOf(" Beispiel "),
	...fused(["a", "an"], ["m", "dem"]),
	...segmentsOf(" Montag."),
];
// Was0 _1 zu2 m3 _4 …5 ?6
const wasZum: readonly Segment[] = [
	...segmentsOf("Was "),
	...fused(["zu", "zu"], ["m", "dem"]),
	{ kind: "Whitespace", text: " " },
	{ kind: "Punctuation", text: "…" },
	{ kind: "Punctuation", text: "?" },
];
// Sie0 _1 gingen2 _3 die4 _5 »6 Vorderreihe7 «8 _9 entlang10 .11
const vorderreihe: readonly Segment[] = [
	...segmentsOf("Sie gingen die "),
	{ kind: "Punctuation", text: "»" },
	{ kind: "ResolvableText", text: "Vorderreihe" },
	{ kind: "Punctuation", text: "«" },
	...segmentsOf(" entlang."),
];

const unitsOf = (
	segments: readonly Segment[],
	answers: Readonly<Record<string, Answer>> = {},
): Promise<Unit[]> =>
	Effect.runPromise(germanUnits({ segments }, fakeJudge(answers).ask));

test("no fused article piece ends as a unit of its own, whatever the judge's slots say (#1334)", async () => {
	for (const segments of [zumBeispiel, wasZum]) {
		const articles = sentenceOf({ segments })
			.pieces.filter(fusedArticle)
			.map((piece) => piece.segment);
		expect(articles.length).toBeGreaterThan(0);
		// The fake judge answers every article slot none.
		for (const unit of await unitsOf(segments))
			expect(
				unit.segments.length === 1 &&
					articles.includes(unit.segments[0] ?? -1),
			).toBe(false);
	}
});

test("article-head: a fused article the judge gives no host joins the noun its phrase opens", async () => {
	const result = await groups(
		zumBeispiel,
		{ s_article_5: picked("none", { p6: 0.12, p9: 0.28, none: 0.6 }) },
		"article-head",
	);
	expect(result.without).toContainEqual([7]);
	expect(result.with).toEqual([[0], [2], [4], [6], [7, 9], [11], [12, 14]]);
});

test("article-head: a fused article with no noun after it keeps its written word whole, a Locution", async () => {
	const units = await unitsOf(wasZum, { r_2_3: picked("Locution/ADV") });
	expect(units).toContainEqual({
		segments: [2, 3],
		route: route("Locution", "ADV"),
	});
});

test("article-head: an article joins the noun after a quote mark, though the quote mark ends the slot's clause", async () => {
	const result = await groups(vorderreihe, {}, "article-head");
	expect(result.without).toContainEqual([4]);
	expect(result.with).toContainEqual([4, 7]);
});

test("a noun read fixed at the expression floor right after a fused article is one Locution with the fused word", async () => {
	const answers = {
		f_6: noul(0.74),
		r_4_5_6: picked("Locution/ADV"),
	};
	expect(await unitsOf(zumBeispiel, answers)).toContainEqual({
		segments: [6, 7, 9],
		route: route("Locution", "ADV"),
	});
	const free = await unitsOf(zumBeispiel, { ...answers, f_6: noul(0.6) });
	expect(free.map((unit) => unit.segments)).toEqual([
		[0],
		[2],
		[4],
		[6],
		[7, 9],
		[11],
		[12, 14],
	]);
	// Ich0 _1 bitte2 _3 um4 _5 Ruhe6 .7: a preposition written apart is the expression pairs'.
	const ruhe = await unitsOf(segmentsOf("Ich bitte um Ruhe."), {
		f_4: noul(0.71),
	});
	expect(ruhe.map((unit) => unit.segments)).toContainEqual([6]);
});

test("an article standing alone routes as the DET it is, or the PRON the Rule test reads", async () => {
	// Er0 _1 nahm2 _3 den4 .5: identity c0 is the article den.
	const segments = segmentsOf("Er nahm den.");
	const lone = (modifies: number) =>
		unitsOf(segments, {
			i_3: picked("c0", { c0: 0.7, c1: 0.2, c2: 0.1 }),
			tm_3: noul(modifies),
			r_3: picked("Lexeme/NOUN"),
		});
	expect((await lone(0.9))[2]).toMatchObject({
		segments: [4],
		route: route("Lexeme", "DET"),
		identity: { kind: "DET", canonicalForm: "den", pronType: "Art" },
	});
	expect((await lone(0.1))[2]).toMatchObject({
		segments: [4],
		route: route("Lexeme", "PRON"),
	});
});
