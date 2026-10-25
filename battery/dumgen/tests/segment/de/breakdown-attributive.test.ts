import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { BreakdownInput } from "../../../src/segment/breakdown.js";
import { germanConstituents } from "../../../src/segment/de/breakdown/constituents.js";
import { formCandidates } from "../../../src/segment/de/breakdown/forms.js";
import { input, judgeWanting, shown } from "./breakdown-support.js";

// The user's 2026-10-25 ruling on #1241: an adjective first part may show
// its frozen attributive ending (ADR 0050).

const run = async (
	reading: BreakdownInput,
	judge: ReturnType<typeof judgeWanting>,
) => {
	const result = await Effect.runPromise(
		germanConstituents(reading, judge.ask),
	);
	return result.kind === "Constituents" ? shown(result.pieces) : result.kind;
};

describe("an adjective first part with its attributive ending", () => {
	test("offers the adjective with its declension stem undone", () => {
		expect(formCandidates("Hohe", "Lexeme", "ADJ")).toContain("hoch");
		expect(formCandidates("dunkle", "Lexeme", "ADJ")).toContain("dunkel");
		expect(formCandidates("kleines", "Lexeme", "ADJ")).toEqual([
			"kleines",
			"klein",
		]);
	});

	test("keeps the ending in the adjective's letters, never an Interfix", async () => {
		// DWDS: Hohelied, Wortzerlegung "hoch Lied".
		const hoch = judgeWanting(
			"Hohe + lied",
			"r_0=Lexeme/ADJ",
			"hoch",
			"Lied",
		);
		expect(
			await run(input("Lexeme", "NOUN", "Hohelied", "📜"), hoch),
		).toEqual(["Hohe→Lexeme/ADJ:hoch", "lied→Lexeme/NOUN:Lied"]);
		// The gold Langeweile's shape: lang's -e is no Interfix -e-.
		const lang = judgeWanting(
			"Lange + weile",
			"r_0=Lexeme/ADJ",
			"lang",
			"Weile",
		);
		expect(
			await run(input("Lexeme", "NOUN", "Langeweile", "🥱"), lang),
		).toEqual(["Lange→Lexeme/ADJ:lang", "weile→Lexeme/NOUN:Weile"]);
	});
});
