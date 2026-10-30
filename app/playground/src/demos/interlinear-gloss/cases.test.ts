import { describe, expect, test } from "bun:test";
import { wordsOf } from "@/fixtures";
import { cases, firstCard } from "./cases";
import { glossParts, labelsIn, linksOf, litBy, noteFor } from "./focus";
import { abbreviations, type GlossCase, type Step } from "./model";

/** Each step a case glosses, by the Card that shows it. */
const stepsOf = (glossCase: GlossCase): [string, Step][] => [
	...(glossCase.attestation.syntax
		? [["attestation", glossCase.attestation.syntax] as [string, Step]]
		: []),
	["surface", glossCase.surface.inflection],
];

/** The capitalised parts of a step's glosses that name no abbreviation. */
const unknownLabels = (step: Step): string[] =>
	step.columns
		.flatMap((column) => column.pieces)
		.flatMap((piece) => glossParts(piece.leipzig))
		.map((part) => part.text)
		.filter(
			(text) =>
				/^[0-9]*[A-Z]{1,}$/u.test(text) &&
				abbreviations[text] === undefined,
		);

describe("interlinear-gloss cases", () => {
	for (const glossCase of cases) {
		const marked = wordsOf(glossCase.text)
			.filter((word) => word.unitId)
			.map((word) => word.text);

		describe(glossCase.id, () => {
			test("the Attestation is the text's marked words, in order", () => {
				expect(glossCase.attestation.title).toBe(marked.join(" "));
				const syntax = glossCase.attestation.syntax;
				if (syntax)
					expect(syntax.columns.map((column) => column.word)).toEqual(
						marked,
					);
			});

			test("the Attestation lands on the Surface line, token for token", () => {
				const line = glossCase.surface.inflection.columns.map(
					(column) => column.word,
				);
				expect(line.join(" ")).toBe(glossCase.surface.title);
				const syntax = glossCase.attestation.syntax;
				if (syntax)
					expect(syntax.targets.map((target) => target.text)).toEqual(
						line,
					);
			});

			test("the Surface lands on the Lemma's title", () => {
				expect(
					glossCase.surface.inflection.targets
						.map((target) => target.text)
						.join(" "),
				).toBe(glossCase.lemma.title);
			});

			for (const [card, step] of stepsOf(glossCase)) {
				test(`${card}: every line lands on a target, and every target but the article is reached`, () => {
					const ids = step.targets.map((target) => target.id);
					const reached = new Set(
						linksOf(step).map((link) => link.to),
					);
					for (const to of reached) expect(ids).toContain(to);
					for (const target of step.targets)
						if (!target.quiet)
							expect(reached.has(target.id)).toBe(true);
				});

				test(`${card}: every column explains itself, its first among them`, () => {
					for (const column of step.columns)
						expect(column.note).toBeDefined();
					expect(step.columns.map((column) => column.id)).toContain(
						step.first,
					);
				});

				test(`${card}: every capitalised label is a known abbreviation`, () => {
					expect(unknownLabels(step)).toEqual([]);
				});
			}
		});
	}
});

describe("the hard case", () => {
	const hard = cases.find((each) => each.id === "hard");
	const syntax = hard?.attestation.syntax;
	if (!hard || !syntax) throw new Error("no hard case");
	const inflection = hard.surface.inflection;

	test("damit lights mit and the jM slot, and the dass-clause it stands for", () => {
		const lit = litBy(syntax, "c:damit");
		expect([...lit.targets].sort()).toEqual(["jm", "mit"]);
		expect(lit.referents.has("dass")).toBe(true);
		expect(lit.referents.has("lebte")).toBe(true);
	});

	test("es fills jD, and hatte moves to the end of the line", () => {
		expect([...litBy(syntax, "c:es").targets]).toEqual(["jd"]);
		expect(syntax.targets.at(-1)?.id).toBe("hatte");
		expect([...litBy(syntax, "c:hatte").targets]).toEqual(["hatte"]);
	});

	test("the Attestation glosses no inflection", () => {
		for (const column of syntax.columns)
			for (const piece of column.pieces)
				for (const label of labelsIn(piece.leipzig))
					expect(label).toBe("SBJ");
	});

	test("jD drops out of the Lemma, its stub lit with it", () => {
		const lit = litBy(inflection, "c:jd");
		expect(lit.targets.size).toBe(0);
		expect([...lit.drops]).toEqual(["jd"]);
	});

	test("a target without a note explains the word it came from", () => {
		expect(noteFor(inflection, "t:haben")?.word).toBe("hatte");
		expect(noteFor(syntax, "t:jd")?.word).toBe("es");
	});

	test("hatte's gloss names past, indicative and third singular", () => {
		expect(labelsIn("have-PST.IND.3SG")).toEqual(["PST", "IND", "3SG"]);
	});
});

describe("the first Card", () => {
	test("a case that reorders always opens on its Attestation", () => {
		const hard = cases.find((each) => each.id === "hard");
		if (!hard) throw new Error("no hard case");
		expect(firstCard(hard, "skip")).toBe("attestation");
	});

	test("with nothing to reorder, the knob picks the Surface or a static Attestation", () => {
		const simple = cases.find((each) => each.id === "simple");
		if (!simple) throw new Error("no simple case");
		expect(firstCard(simple, "skip")).toBe("surface");
		expect(firstCard(simple, "static")).toBe("attestation");
	});
});
