import { describe, expect, test } from "bun:test";
import type { Question } from "@typesafe-ai/sdk";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import type { Answers, AskRequest } from "../../../src/segment/ask.js";
import type {
	BreakdownInput,
	ProducedPiece,
} from "../../../src/segment/breakdown.js";
import { germanConstituents } from "../../../src/segment/de/breakdown/constituents.js";
import { formCandidates } from "../../../src/segment/de/breakdown/forms.js";
import { interfixOf } from "../../../src/segment/de/breakdown/interfix.js";
import { germanMorphemes } from "../../../src/segment/de/breakdown/morphemes.js";
import { wordingPieces } from "../../../src/segment/de/breakdown/phraseme-parts.js";
import { wordAnalyses } from "../../../src/segment/de/breakdown/word-analyses.js";
import { asked, noul, picked } from "./fake-judge.js";

const input = (
	family: string,
	kind: string,
	canonicalForm: string,
	emojiDescription = "🧪",
): BreakdownInput => ({
	reading: {
		unitKind: "Reading",
		lemma: {
			unitKind: "Lemma",
			language: "de",
			family,
			kind,
			canonicalForm,
			coreFeatures: {},
		},
		emojiDescription,
	} as Dumling.Reading,
});

/**
 * A judge that picks, in every Choice, the option `wanted` names for its
 * id (`r_0=Lexeme/PRON`), else the option whose text is among `wanted`,
 * else the last one, and says yes to a Noul that quotes a wanted
 * text. It records every request.
 */
function judgeWanting(...wanted: string[]) {
	const requests: AskRequest[] = [];
	const ask = asked((request) => {
		requests.push(request);
		return Object.fromEntries(
			Object.entries(request.questions).map(
				([id, question]: [string, Question]) => {
					if (question.type === "noul")
						return [
							id,
							noul(
								wanted.some((text) =>
									String(question.instructions).includes(
										`"${text}"`,
									),
								)
									? 0.9
									: 0.1,
							),
						];
					const criteria =
						question.type === "choice" ? question.criteria : {};
					const keys = Object.keys(criteria);
					const byId = wanted
						.find((text) => text.startsWith(`${id}=`))
						?.slice(id.length + 1);
					if (byId !== undefined) return [id, picked(byId)];
					const hit = keys.find(
						(key) =>
							wanted.includes(key) ||
							wanted.includes(String(criteria[key])),
					);
					return [id, picked(hit ?? keys.at(-1) ?? "")];
				},
			),
		) satisfies Answers;
	});
	return { ask, stages: () => requests.map(({ stage }) => stage) };
}

/** Pieces as `letters→Family/Kind:form`, filler as its letters. */
const shown = (pieces: readonly ProducedPiece[]) =>
	pieces.map(({ letters, target }) =>
		target
			? `${letters}→${target.family}/${target.kind}:${target.canonicalForm}`
			: letters,
	);

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
		expect(judge.stages()).toEqual([
			"breakdown-analysis",
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

	test("a phraseme: a Locution inside it is one part", async () => {
		const judge = judgeWanting(
			"zu Hause",
			"r_0=Lexeme/PRON",
			"r_1=Lexeme/CCONJ",
			"r_2=Locution/ADV",
			"r_3=Lexeme/VERB",
			"fühlen",
		);
		const result = await run(
			input("Locution", "VERB", "sich wie zu Hause fühlen"),
			judge,
		);
		expect(result.kind === "Constituents" && shown(result.pieces)).toEqual([
			"sich→Lexeme/PRON:sich",
			" ",
			"wie→Lexeme/CCONJ:wie",
			" ",
			"zu Hause→Locution/ADV:zu Hause",
			" ",
			"fühlen→Lexeme/VERB:fühlen",
		]);
	});
	test("sich joins a verb lexically reflexive in the wording, as one part or two links to it (ADR 0050)", async () => {
		const together = await run(
			input("Locution", "VERB", "sich freuen wie ein Schneekönig"),
			judgeWanting("x_0=lexical", "sich freuen"),
		);
		expect(
			together.kind === "Constituents" && shown(together.pieces).at(0),
		).toBe("sich freuen→Lexeme/VERB:sich freuen");

		const apart = await run(
			input("Locution", "VERB", "sich in Grund und Boden schämen"),
			judgeWanting(
				"x_0=lexical",
				"Grund und Boden",
				"r_0=Lexeme/ADP",
				"r_1=Locution/NOUN",
				"in",
				"sich schämen",
			),
		);
		expect(apart.kind === "Constituents" && shown(apart.pieces)).toEqual([
			"sich→Lexeme/VERB:sich schämen",
			" ",
			"in→Lexeme/ADP:in",
			" ",
			"Grund und Boden→Locution/NOUN:Grund und Boden",
			" ",
			"schämen→Lexeme/VERB:sich schämen",
		]);
	});

	test("a free dative sich stays a part of its own (ADR 0050)", async () => {
		const result = await run(
			input("Locution", "VERB", "sich den Kopf zerbrechen"),
			judgeWanting("x_0=dative", "r_0=Lexeme/PRON", "zerbrechen"),
		);
		expect(
			result.kind === "Constituents" && shown(result.pieces).at(0),
		).toBe("sich→Lexeme/PRON:sich");
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
