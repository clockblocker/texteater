import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { BreakdownInput } from "../../../src/segment/breakdown.js";
import { germanConstituents } from "../../../src/segment/de/breakdown/constituents.js";
import { formCandidates } from "../../../src/segment/de/breakdown/forms.js";
import { interfixOf } from "../../../src/segment/de/breakdown/interfix.js";
import { germanMorphemes } from "../../../src/segment/de/breakdown/morphemes.js";
import { wordingPieces } from "../../../src/segment/de/breakdown/phraseme-parts.js";
import { wordAnalyses } from "../../../src/segment/de/breakdown/word-analyses.js";
import { input, judgeWanting, shown } from "./breakdown-support.js";

describe("candidates code proposes", () => {
	test("a word's analyses: cuts, a particle and a suffix, never a suffix as a head", () => {
		const labels = wordAnalyses("Entspannung", "NOUN").map(
			({ label }) => label,
		);
		expect(labels).toContain("Entspann + -ung (suffix)");
		expect(labels).toContain("Ent- (prefix) + spannung");
		expect(labels).not.toContain("Entspann + ung");
		expect(
			wordAnalyses("einkaufen", "VERB").map(({ label }) => label),
		).toContain("ein- (prefix) + kaufen");
		expect(
			wordAnalyses("verarzten", "VERB").map(({ label }) => label),
		).toContain("ver- (prefix) + arzt + -en (citation ending)");
		expect(wordAnalyses("Lauf", "NOUN")).toEqual([]);
	});

	test("Canonical Forms undo inflection, truncation and umlaut", () => {
		expect(formCandidates("liegt", "Lexeme", "VERB")).toContain("liegen");
		expect(formCandidates("hat", "Lexeme", "VERB")).toContain("haben");
		expect(formCandidates("trifft", "Lexeme", "VERB")).toContain("treffen");
		expect(formCandidates("Wach", "Lexeme", "VERB")).toEqual(["wachen"]);
		expect(formCandidates("Hause", "Lexeme", "NOUN")).toContain("Haus");
		expect(formCandidates("Gäst", "Lexeme", "NOUN")).toContain("Gast");
		expect(formCandidates("Morgenstund", "Lexeme", "NOUN")).toContain(
			"Morgenstunde",
		);
		expect(formCandidates("guten", "Lexeme", "ADJ")).toContain("gut");
		expect(formCandidates("dem Pfeffer", "Lexeme", "NOUN")[0]).toBe(
			"Pfeffer",
		);
		expect(formCandidates("zu Hause", "Locution", "ADV")).toEqual([
			"zu Hause",
		]);
	});

	test("a linking element is the letters past the part's form", () => {
		expect(interfixOf("Gäste", "Gast")).toEqual({
			word: "Gäst",
			interfix: "e",
			canonicalForm: "-e-",
		});
		expect(interfixOf("Arbeits", "Arbeit")?.canonicalForm).toBe("-s-");
		expect(interfixOf("Hilfs", "Hilfe")?.word).toBe("Hilf");
		expect(interfixOf("Kohle", "Kohle")).toBeUndefined();
		expect(interfixOf("Schul", "Schule")).toBeUndefined();
	});

	test("a wording groups an article with its noun and splits a fused word", () => {
		expect(
			wordingPieces("da liegt der Hase im Pfeffer").map((piece) =>
				piece.role === "Part" ? `[${piece.letters}]` : piece.letters,
			),
		).toEqual([
			"[da]",
			" ",
			"[liegt]",
			" ",
			"[der Hase]",
			" ",
			"[i]",
			"[m Pfeffer]",
		]);
		expect(
			wordingPieces("jdm. auf den Keks gehen").filter(
				(piece) => piece.role === "Part",
			),
		).toHaveLength(3);
	});
});

describe("German segment.inConstituents", () => {
	const run = (
		reading: BreakdownInput,
		judge: ReturnType<typeof judgeWanting>,
	) => Effect.runPromise(germanConstituents(reading, judge.ask));

	test("a compound: jev picks the cut and the first part, code its head and Interfix", async () => {
		const judge = judgeWanting(
			"Gäste + haus",
			"Lexeme/NOUN",
			"Gast",
			"Haus",
		);
		const result = await run(
			input("Lexeme", "NOUN", "Gästehaus", "🏨"),
			judge,
		);
		expect(result.kind === "Constituents" && shown(result.pieces)).toEqual([
			"Gäst→Lexeme/NOUN:Gast",
			"e→Morpheme/Interfix:-e-",
			"haus→Lexeme/NOUN:Haus",
		]);
		// The cranberry check comes before the routes (#1241 round 3).
		expect(judge.stages()).toEqual([
			"breakdown-analysis",
			"breakdown-words",
			"breakdown-routes",
			"breakdown-forms",
		]);
	});

	test("a true particle links to its Prefix and a citation ending is filler", async () => {
		const einkaufen = await run(
			input("Lexeme", "VERB", "einkaufen"),
			judgeWanting("ein- (prefix) + kaufen", "kaufen"),
		);
		expect(
			einkaufen.kind === "Constituents" && shown(einkaufen.pieces),
		).toEqual(["ein→Morpheme/Prefix:ein-", "kaufen→Lexeme/VERB:kaufen"]);
		const verarzten = await run(
			input("Lexeme", "VERB", "verarzten"),
			judgeWanting(
				"ver- (prefix) + arzt + -en (citation ending)",
				"Lexeme/NOUN",
				"Arzt",
			),
		);
		expect(
			verarzten.kind === "Constituents" && shown(verarzten.pieces),
		).toEqual(["ver→Morpheme/Prefix:ver-", "arzt→Lexeme/NOUN:Arzt", "en"]);
	});

	test("none: a word too short to cut asks nothing, and jev may pick none", async () => {
		const short = judgeWanting();
		expect(await run(input("Lexeme", "NOUN", "Lauf"), short)).toEqual({
			kind: "NoConstituents",
		});
		expect(short.stages()).toEqual([]);
		expect(
			await run(input("Lexeme", "VERB", "spannen"), judgeWanting("none")),
		).toEqual({ kind: "NoConstituents" });
	});

	test("a phraseme: a Locution inside it is one part, the wording bare (ADR 0052)", async () => {
		const judge = judgeWanting(
			"zu Hause",
			"r_0=Lexeme/CCONJ",
			"r_1=Locution/ADV",
			"r_2=Lexeme/VERB",
			"fühlen",
		);
		const result = await run(
			input("Locution", "VERB", "wie zu Hause fühlen"),
			judge,
		);
		expect(result.kind === "Constituents" && shown(result.pieces)).toEqual([
			"wie→Lexeme/CCONJ:wie",
			" ",
			"zu Hause→Locution/ADV:zu Hause",
			" ",
			"fühlen→Lexeme/VERB:fühlen",
		]);
	});

	test("a Saying's sich is a part of its own, never joined to its verb (ADR 0052)", async () => {
		const judge = judgeWanting(
			"r_1=Lexeme/PRON",
			"r_2=Lexeme/VERB",
			"betten",
		);
		const result = await run(
			input("Saying", "Saying", "Wie man sich bettet, so liegt man"),
			judge,
		);
		expect(
			result.kind === "Constituents" && shown(result.pieces).slice(4, 7),
		).toEqual(["sich→Lexeme/PRON:sich", " ", "bettet→Lexeme/VERB:betten"]);
	});
});

describe("German segment.inMorphemes", () => {
	test("a bottom word with no affix to weigh asks nothing", async () => {
		const judge = judgeWanting();
		const pieces = await Effect.runPromise(
			germanMorphemes(input("Lexeme", "VERB", "spannen"), judge.ask),
		);
		expect(shown(pieces)).toEqual([
			"spann→Morpheme/Root:spann",
			"en→Morpheme/Ending:-en",
		]);
		expect(judge.stages()).toEqual([]);
		expect(
			shown(
				await Effect.runPromise(
					germanMorphemes(input("Lexeme", "NOUN", "Haus"), judge.ask),
				),
			),
		).toEqual(["Haus→Morpheme/Root:haus", "→Morpheme/Ending:∅"]);
		expect(
			shown(
				await Effect.runPromise(
					germanMorphemes(
						input("Lexeme", "SCONJ", "obwohl"),
						judge.ask,
					),
				),
			),
		).toEqual(["obwohl→Morpheme/Root:obwohl"]);
	});

	test("jev picks whether a listed prefix is cut off", async () => {
		const judge = judgeWanting("ver (Prefix) · gess (Root) · en (Ending)");
		const pieces = await Effect.runPromise(
			germanMorphemes(input("Lexeme", "VERB", "vergessen"), judge.ask),
		);
		expect(shown(pieces)).toEqual([
			"ver→Morpheme/Prefix:ver-",
			"gess→Morpheme/Root:gess",
			"en→Morpheme/Ending:-en",
		]);
		expect(judge.stages()).toEqual(["breakdown-morphemes"]);
	});
});

test("a verb's n after -el is the Ending -en's Surface, not a Lemma of its own (ADR 0051)", async () => {
	const pieces = await Effect.runPromise(
		germanMorphemes(
			input("Lexeme", "VERB", "lächeln"),
			judgeWanting("läch (Root) · el (Suffix) · n (Ending)").ask,
		),
	);
	expect(shown(pieces)).toEqual([
		"läch→Morpheme/Root:läch",
		"el→Morpheme/Suffix:-el",
		"n→Morpheme/Ending:-en",
	]);
});
