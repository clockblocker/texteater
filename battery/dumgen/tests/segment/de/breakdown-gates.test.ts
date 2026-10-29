import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { BreakdownInput } from "../../../src/segment/breakdown.js";
import { germanConstituents } from "../../../src/segment/de/breakdown/constituents.js";
import {
	formCandidates,
	onlyPronoun,
	reflexiveFormGuide,
} from "../../../src/segment/de/breakdown/forms.js";
import { input, judgeWanting, shown } from "./breakdown-support.js";

// The round-3 general fixes (#1241), each shown on a word or wording that
// is no Breakdown Record.

const run = async (
	reading: BreakdownInput,
	judge: ReturnType<typeof judgeWanting>,
) => {
	const result = await Effect.runPromise(
		germanConstituents(reading, judge.ask),
	);
	return result.kind === "Constituents" ? shown(result.pieces) : result.kind;
};

/** Every question a stage asked, as its instructions and option texts. */
const askedAt = (judge: ReturnType<typeof judgeWanting>, stage: string) =>
	judge
		.requests()
		.filter((request) => request.stage === stage)
		.flatMap((request) =>
			Object.values(request.questions).map((question) =>
				[
					String(question.instructions),
					...(question.type === "choice"
						? Object.values(question.criteria).map(String)
						: []),
				].join(" | "),
			),
		);

describe("a prefix's base is offered as a verb only when it is one (proposal 3)", () => {
	// DWDS: bemannen, Wortzerlegung "be- Mann"; verbrennen "ver- brennen".
	test("no verb mannen: be- + mannen leaves the analysis question", async () => {
		const judge = judgeWanting(
			"be- (prefix) + mann + -en (citation ending)",
			"Lexeme/NOUN",
			"Mann",
		);
		expect(
			await run(input("Lexeme", "VERB", "bemannen", "🧑‍🚀"), judge),
		).toEqual(["be→Morpheme/Prefix:be-", "mann→Lexeme/NOUN:Mann", "en"]);
		expect(judge.stages()[0]).toBe("breakdown-words");
		const analysis = askedAt(judge, "breakdown-analysis").join(" ");
		expect(analysis).toContain("be- (prefix) + mann + -en");
		expect(analysis).not.toContain("be- (prefix) + mannen");
	});

	test("brennen is a verb: ver- + brennen stays and ver- + brenn + -en leaves (#1241 round 8)", async () => {
		const yes = judgeWanting("ver- (prefix) + brennen", "brennen");
		await run(input("Lexeme", "VERB", "verbrennen", "🔥"), yes);
		const analysis = askedAt(yes, "breakdown-analysis").join(" ");
		expect(analysis).toContain("ver- (prefix) + brennen");
		expect(analysis).not.toContain("ver- (prefix) + brenn + -en");
	});
});

describe("the base before -ung is a verb (proposal 4a, Fleischer/Barz)", () => {
	// DWDS: Heizung, Wortzerlegung "heizen -ung".
	test("Heiz is heizen, its route unasked", async () => {
		const judge = judgeWanting("Heiz + -ung (suffix)", "heizen");
		expect(
			await run(input("Lexeme", "NOUN", "Heizung", "🔥"), judge),
		).toEqual(["Heiz→Lexeme/VERB:heizen", "ung→Morpheme/Suffix:-ung"]);
		expect(judge.stages()).not.toContain("breakdown-routes");
	});
});

describe("a cranberry Root is offered only for a part that is no word (proposal 4b)", () => {
	// DWDS: Kaugummi, Wortzerlegung "kauen Gummi".
	test("Kau is kauen's stem, so Root is not offered", async () => {
		const judge = judgeWanting(
			"Kau + gummi",
			"Kau",
			"r_0=Lexeme/VERB",
			"kauen",
			"Gummi",
		);
		expect(
			await run(input("Lexeme", "NOUN", "Kaugummi", "🍬"), judge),
		).toEqual(["Kau→Lexeme/VERB:kauen", "gummi→Lexeme/NOUN:Gummi"]);
		expect(askedAt(judge, "breakdown-routes").join(" ")).not.toContain(
			"cranberry",
		);
	});

	// DWDS: Lindwurm, Wortzerlegung "Wurm"; lind- from ahd. lint, snake.
	test("Lind is no word, so Root is offered", async () => {
		const judge = judgeWanting("Lind + wurm", "r_0=Morpheme/Root", "Wurm");
		expect(
			await run(input("Lexeme", "NOUN", "Lindwurm", "🐉"), judge),
		).toEqual(["Lind→Morpheme/Root:lind", "wurm→Lexeme/NOUN:Wurm"]);
	});
});

describe("closed-class parts come from dumcorpus (proposals 2 and 5)", () => {
	test("a pronoun's headword is the inventory's, and a reflexive form offers sich", () => {
		expect(formCandidates("dies", "Lexeme", "PRON")).toEqual(["dieser"]);
		expect(formCandidates("dich", "Lexeme", "PRON")).toEqual([
			"dich",
			"sich",
		]);
		expect(formCandidates("bald", "Lexeme", "ADV")).toEqual(["bald"]);
		expect(onlyPronoun("was")).toBe(true);
		expect(onlyPronoun("dich")).toBe(true);
		// das also spells the article, so its route is asked.
		expect(onlyPronoun("das")).toBe(false);
		expect(onlyPronoun("bald")).toBe(false);
	});

	test("was is a PRON unasked, and so is uns, whose headword question names sich", async () => {
		const was = judgeWanting("was");
		await run(input("Locution", "ADV", "was sonst noch", "➕"), was);
		expect(askedAt(was, "breakdown-routes").join(" ")).not.toContain(
			'"was"',
		);
		const uns = judgeWanting("r_0=Lexeme/ADP", "f_1=f0");
		expect(
			await run(input("Locution", "ADV", "unter uns", "🤫"), uns),
		).toEqual(["unter→Lexeme/ADP:unter", " ", "uns→Lexeme/PRON:uns"]);
		expect(askedAt(uns, "breakdown-forms").join(" ")).toContain(
			reflexiveFormGuide,
		);
	});

	test("a zu closing a wording after its open slot is the infinitive PART", async () => {
		const judge = judgeWanting("r_0=Lexeme/SCONJ", "anstatt");
		expect(
			await run(input("Locution", "SCONJ", "anstatt … zu", "🔄"), judge),
		).toEqual(["anstatt→Lexeme/SCONJ:anstatt", " … ", "zu→Lexeme/PART:zu"]);
		expect(askedAt(judge, "breakdown-routes").join(" ")).not.toContain(
			'"zu"',
		);
	});
});
