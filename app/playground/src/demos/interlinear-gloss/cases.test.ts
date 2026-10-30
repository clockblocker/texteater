import { describe, expect, test } from "bun:test";
import { wordsOf } from "@/fixtures";
import { abbreviations, cases, unitOf } from "./cases";
import { glossParts, labelsIn, linksOf, litBy, noteFor } from "./focus";

describe("interlinear-gloss cases", () => {
	for (const glossCase of cases) {
		describe(glossCase.id, () => {
			test("the unit's columns are the text's marked words, in order", () => {
				const marked = wordsOf(glossCase.text)
					.filter((word) => word.unitId)
					.map((word) => word.text);
				expect(unitOf(glossCase).map((column) => column.word)).toEqual(
					marked,
				);
			});

			test("the clicked word is in the unit, and every unit word explains itself", () => {
				const unit = unitOf(glossCase);
				expect(unit.map((column) => column.id)).toContain(
					glossCase.clicked,
				);
				for (const column of unit) expect(column.note).toBeDefined();
			});

			test("every line lands on a lemma piece, and every piece but the article is reached", () => {
				const ids = glossCase.lemma.pieces.map((piece) => piece.id);
				const reached = new Set(
					linksOf(glossCase).map((link) => link.to),
				);
				for (const to of reached) expect(ids).toContain(to);
				for (const piece of glossCase.lemma.pieces)
					if (!piece.quiet) expect(reached.has(piece.id)).toBe(true);
			});

			test("every capitalised label in a gloss is a known abbreviation", () => {
				const glosses = [
					...glossCase.clause.flatMap((column) =>
						column.pieces.map((piece) => piece.leipzig),
					),
					...glossCase.lemma.pieces.map((piece) => piece.leipzig),
				];
				for (const gloss of glosses)
					for (const part of glossParts(gloss))
						if (/^[0-9]*[A-Z]{1,}$/u.test(part.text))
							expect(abbreviations[part.text]).toBeDefined();
			});

			test("the lemma's title is its pieces in order", () => {
				expect(
					glossCase.lemma.pieces.map((piece) => piece.text).join(" "),
				).toBe(glossCase.lemma.title);
			});
		});
	}
});

describe("focus", () => {
	const hard = cases.find((each) => each.id === "hard");
	if (!hard) throw new Error("no hard case");

	test("damit lights mit and the jM slot, and the dass-clause it stands for", () => {
		const lit = litBy(hard, "c:damit");
		expect([...lit.lemma].sort()).toEqual(["jm", "mit"]);
		expect(lit.referents.has("dass")).toBe(true);
		expect(lit.referents.has("lebte")).toBe(true);
	});

	test("the jM slot lights damit, the word that fills it", () => {
		expect([...litBy(hard, "l:jm").columns]).toEqual(["damit"]);
	});

	test("es lands nowhere in the lemma", () => {
		expect(litBy(hard, "c:es").lemma.size).toBe(0);
	});

	test("a lemma piece without a note explains the word it came from", () => {
		expect(noteFor(hard, "l:haben")?.word).toBe("hatte");
	});

	test("hatte's gloss names past, indicative and third singular", () => {
		expect(labelsIn("have-PST.IND.3SG")).toEqual(["PST", "IND", "3SG"]);
	});
});
