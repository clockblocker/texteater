import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { JudgedGrammar } from "../../src/resolve/types.js";
import {
	attested,
	fakeJev,
	fakeLuna,
	resolveOnce,
	sentenceOf,
	unitOf,
} from "./support.js";

// resolve.grammar reports what jev judged before Luna has written the
// headword (#1326), and the click waits for the report before it returns.

test("a verb's judged grammar reaches the host while Luna is still writing its headword", async () => {
	const order: string[] = [];
	const reports: JudgedGrammar[] = [];
	const luna = fakeLuna(
		({ members }) => {
			order.push("luna");
			return {
				canonicalForm: "kommen",
				members: members.map(({ text }) => text),
				emojiDescription: "🚶",
			};
		},
		{ delayMs: 40 },
	);
	// Er0 _1 kommt2 .3
	const { result } = await resolveOnce(
		{ jev: fakeJev({ prefix: "None" }).ask, luna: luna.ask },
		{
			sentence: sentenceOf("Er kommt."),
			unit: unitOf([2], "Lexeme/VERB"),
			onJudged: (judged) =>
				Effect.sync(() => {
					order.push("judged");
					reports.push(judged);
				}),
		},
	);
	expect(order).toEqual(["judged", "luna"]);
	expect(reports).toHaveLength(1);
	const [judged] = reports;
	const { surface } = attested(result);
	expect(judged).toEqual({
		route: { language: "de", family: "Lexeme", kind: "VERB" },
		coreFeatures: surface.lemma.coreFeatures,
		inflectionalFeatures:
			"inflectionalFeatures" in surface
				? surface.inflectionalFeatures
				: null,
		surfaceFeatures: surface.surfaceFeatures,
		spelling: surface.spelling,
		members: [{ segment: 2, orthography: "Standard" }],
		realizationCoverage: "Full",
		pending: [],
	});
});

test("a common NOUN's report says its gender and Case wait for Luna's article, and the click waits for a slow report", async () => {
	let settled = false;
	// Der0 _1 Tisch2 _3 steht4 .5
	const { result } = await resolveOnce(
		{
			jev: fakeJev({
				gender: "der",
				nounKind: "Ordinary",
				number: "Sing",
			}).ask,
			luna: fakeLuna(() => ({
				canonicalForm: "Tisch",
				members: ["Der", "Tisch"],
				article: "der",
			})).ask,
		},
		{
			sentence: sentenceOf("Der Tisch steht."),
			unit: unitOf([0, 2], "Lexeme/NOUN"),
			onJudged: (judged) =>
				Effect.promise(async () => {
					expect(judged.pending).toEqual(["gender", "case"]);
					await new Promise((resolve) => setTimeout(resolve, 30));
					settled = true;
				}),
		},
	);
	expect(result._tag).toBe("Resolved");
	expect(settled).toBe(true);
});
