import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { BreakdownInput } from "../../../src/segment/breakdown-pieces.js";
import { germanConstituents } from "../../../src/segment/de/breakdown/constituents.js";
import { formCandidates } from "../../../src/segment/de/breakdown/forms.js";
import { wordAnalyses } from "../../../src/segment/de/breakdown/word-analyses.js";
import { input, judgeWanting, shown } from "./breakdown-support.js";

// The four shapes the user's 2026-10-24 Breakdown rulings need (#1280),
// each shown on a word that is no Breakdown Record, checked against DWDS.

const run = async (
	reading: BreakdownInput,
	judge: ReturnType<typeof judgeWanting>,
) => {
	const result = await Effect.runPromise(
		germanConstituents(reading, judge.ask),
	);
	return result.kind === "Constituents" ? shown(result.pieces) : result.kind;
};

const labels = (word: string, kind: string) =>
	wordAnalyses(word, kind).map(({ label }) => label);

/** Every option key a stage's questions offered. */
const offered = (judge: ReturnType<typeof judgeWanting>, stage: string) =>
	judge
		.requests()
		.filter((request) => request.stage === stage)
		.flatMap((request) =>
			Object.values(request.questions).flatMap((question) =>
				question.type === "choice"
					? Object.keys(question.criteria)
					: [],
			),
		);

describe("a cranberry piece links to its Root (ADR 0050, ADR 0051)", () => {
	// DWDS: Brombeere, Wortzerlegung "Beere"; Brom- from ahd. brāmo, no word today.
	test("a noun's first of two parts may be a Root, spelled as it shows", async () => {
		expect(labels("Brombeere", "NOUN")).toContain("Brom + beere");
		const judge = judgeWanting(
			"Brom + beere",
			"r_0=Morpheme/Root",
			"Beere",
		);
		expect(
			await run(input("Lexeme", "NOUN", "Brombeere", "🫐"), judge),
		).toEqual(["Brom→Morpheme/Root:brom", "beere→Lexeme/NOUN:Beere"]);
		expect(offered(judge, "breakdown-routes")).toContain("Morpheme/Root");
	});

	test("only a noun's first part is offered as one, never a head, a verb's or an adjective's part", async () => {
		// eislaufen (DWDS: eisgelaufen, eiszulaufen): eis is no listed part, so jev is asked.
		const verb = judgeWanting("eis + laufen", "r_0=Lexeme/NOUN", "Eis");
		await run(input("Lexeme", "VERB", "eislaufen"), verb);
		expect(verb.stages()).toContain("breakdown-routes");
		expect(offered(verb, "breakdown-routes")).not.toContain(
			"Morpheme/Root",
		);
		const adjective = judgeWanting("hell + blau", "r_0=Lexeme/ADJ", "hell");
		await run(input("Lexeme", "ADJ", "hellblau"), adjective);
		expect(offered(adjective, "breakdown-routes")).not.toContain(
			"Morpheme/Root",
		);
		const noun = judgeWanting(
			"Haus + tür",
			"r_0=Lexeme/NOUN",
			"Haus",
			"Tür",
		);
		expect(await run(input("Lexeme", "NOUN", "Haustür"), noun)).toEqual([
			"Haus→Lexeme/NOUN:Haus",
			"tür→Lexeme/NOUN:Tür",
		]);
	});
});

describe("E before a hyphen may be the prefix e- (DWDS 2e-)", () => {
	// DWDS: E-Book, Wortzerlegung "2e-".
	test("E-Book is offered as e- + Book beside E + Book, and jev picks", async () => {
		expect(labels("E-Book", "NOUN")).toEqual([
			"E + Book",
			"E- (prefix, short for elektronisch) + Book",
		]);
		const judge = judgeWanting(
			"E- (prefix, short for elektronisch) + Book",
			"Book",
		);
		expect(
			await run(input("Lexeme", "NOUN", "E-Book", "📱📖"), judge),
		).toEqual(["E→Morpheme/Prefix:e-", "-", "Book→Lexeme/NOUN:Book"]);
		expect(judge.stages()[0]).toBe("breakdown-analysis");
	});

	test("no e- cut without a hyphen, nor in a word with more hyphens", () => {
		for (const label of [
			...labels("Ebbe", "NOUN"),
			...labels("erkalten", "VERB"),
			...labels("E-Book-Reader", "NOUN"),
		])
			expect(label).not.toContain("short for elektronisch");
		expect(labels("E-Book-Reader", "NOUN")).toEqual(["E + Book + Reader"]);
	});
});

describe("a hyphenated compound's front phrase is flat, every word a part (ADR 0054)", () => {
	test("Kopf-an-Kopf-Rennen links each word, and no run is weighed as a Locution", async () => {
		const judge = judgeWanting(
			"r_0=Lexeme/NOUN",
			"r_1=Lexeme/ADP",
			"r_2=Lexeme/NOUN",
			"Kopf",
			"an",
			"Rennen",
		);
		expect(
			await run(input("Lexeme", "NOUN", "Kopf-an-Kopf-Rennen"), judge),
		).toEqual([
			"Kopf→Lexeme/NOUN:Kopf",
			"-",
			"an→Lexeme/ADP:an",
			"-",
			"Kopf→Lexeme/NOUN:Kopf",
			"-",
			"Rennen→Lexeme/NOUN:Rennen",
		]);
		expect(offered(judge, "breakdown-routes")).not.toContain(
			"Locution/ADV",
		);
	});
});

describe("a verb's head may be tun, German's one infinitive of three letters", () => {
	// DWDS: wehtun, Wortzerlegung "2weh" (Adjektiv) + "tun".
	test("wehtun is cut as weh + tun, and tun is its own Canonical Form", async () => {
		expect(labels("wehtun", "VERB")).toContain("weh + tun");
		expect(formCandidates("tun", "Lexeme", "VERB")[0]).toBe("tun");
		expect(
			await run(
				input("Lexeme", "VERB", "wehtun", "🤕"),
				judgeWanting("weh + tun", "r_0=Lexeme/ADJ", "weh", "tun"),
			),
		).toEqual(["weh→Lexeme/ADJ:weh", "tun→Lexeme/VERB:tun"]);
	});

	test("a verb's first part is judged as a word written apart, not as a verb's stem", async () => {
		const judge = judgeWanting("eis + laufen", "r_0=Lexeme/NOUN", "Eis");
		await run(input("Lexeme", "VERB", "eislaufen"), judge);
		const [routes] = judge
			.requests()
			.filter(({ stage }) => stage === "breakdown-routes");
		const instructions = String(routes?.questions.r_0?.instructions);
		expect(instructions).toContain("never a bare stem");
		expect(instructions).not.toContain("Schwimm");
	});

	test("no other three-letter verb head is offered", () => {
		expect(labels("verraten", "VERB")).not.toContain("verra + ten");
		expect(labels("einladen", "VERB")).not.toContain("einla + den");
	});
});

describe("a verb's first part dumcorpus lists is pinned to its ruled Lexeme (#1241)", () => {
	/** Every question id the judge was asked at a stage. */
	const askedIds = (judge: ReturnType<typeof judgeWanting>, stage: string) =>
		judge
			.requests()
			.filter((request) => request.stage === stage)
			.flatMap((request) => Object.keys(request.questions));

	// DWDS: wehtun, Wortzerlegung "2weh" (Adjektiv) + "tun"; jev read wehen.
	test("weh in wehtun is ADJ weh, whatever jev would say", async () => {
		const judge = judgeWanting(
			"weh + tun",
			"r_0=Lexeme/VERB",
			"wehen",
			"tun",
		);
		expect(
			await run(input("Lexeme", "VERB", "wehtun", "🤕"), judge),
		).toEqual(["weh→Lexeme/ADJ:weh", "tun→Lexeme/VERB:tun"]);
		expect(askedIds(judge, "breakdown-routes")).toEqual([]);
		expect(askedIds(judge, "breakdown-forms")).not.toContain("f_0");
	});

	// DWDS: kennenlernen, Wortzerlegung "kennen" + "lernen".
	test("kennen in kennenlernen is VERB kennen, unasked", async () => {
		const judge = judgeWanting(
			"kennen + lernen",
			"r_0=Lexeme/ADJ",
			"lernen",
		);
		expect(
			await run(input("Lexeme", "VERB", "kennenlernen", "🤝"), judge),
		).toEqual(["kennen→Lexeme/VERB:kennen", "lernen→Lexeme/VERB:lernen"]);
		expect(askedIds(judge, "breakdown-routes")).toEqual([]);
	});

	test("a listed part that is no verb's first part is still asked", async () => {
		// fest as a noun's first part: Festland, DWDS Wortzerlegung "fest" + "Land".
		const judge = judgeWanting(
			"Fest + land",
			"r_0=Lexeme/ADJ",
			"fest",
			"Land",
		);
		expect(
			await run(input("Lexeme", "NOUN", "Festland", "🏝"), judge),
		).toEqual(["Fest→Lexeme/ADJ:fest", "land→Lexeme/NOUN:Land"]);
		expect(askedIds(judge, "breakdown-routes")).toContain("r_0");
	});
});
