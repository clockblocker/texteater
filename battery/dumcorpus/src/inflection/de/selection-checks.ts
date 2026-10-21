import type * as Dumling from "dumling/types";
import { germanConjugationClass } from "dumrel";
import type * as Dumrel from "dumrel/types";

import type { PackSelection } from "../types.js";
import { lower } from "./orthography.js";

const finiteWord = (form: string) => lower(form.split(" ")[0] ?? "");
const valuesOf = (variants: readonly Dumrel.ParadigmVariant[] | undefined) =>
	(variants ?? []).map(({ value }) => value);

/**
 * Why one Licence Group's selection of a German verb's variants breaks the
 * classes its Präteritum forms derive (ADR 0038), checked per variant:
 *
 * - a Weak Präteritum is a Konjunktiv II form, and a Strong or Mixed one
 *   never is (`wäre`, `müsste`, `verbrennte`); where every Präteritum is
 *   Weak, every Konjunktiv II form is one of them;
 * - a Strong Präteritum comes with a Partizip II in -n and a Mixed one with
 *   one in -t; where all share the class, every participle ends so. A Weak
 *   Präteritum may have a strong participle (`backte`, `gebacken`).
 *
 * A check whose dimensions the selection lacks is skipped. Empty when the
 * selection is consistent.
 */
export function germanSelectionIssues(
	lemma: Dumling.Lemma<"de">,
	selection: PackSelection,
): string[] {
	const preterites = valuesOf(selection.preterite);
	if (preterites.length === 0) return [];
	const classes = preterites.map((form) =>
		germanConjugationClass(lemma.canonicalForm, form),
	);
	return [
		...subjunctiveIssues(
			preterites,
			classes,
			valuesOf(selection.subjunctivePast).map(finiteWord),
		),
		...participleIssues(
			classes,
			valuesOf(selection.pastParticiple).map(finiteWord),
		),
	];
}

function subjunctiveIssues(
	preterites: readonly string[],
	classes: readonly Dumrel.ConjugationClass[],
	subjunctives: readonly string[],
): string[] {
	if (subjunctives.length === 0) return [];
	const issues: string[] = [];
	preterites.forEach((form, index) => {
		const weak = classes[index] === "Weak";
		if (subjunctives.includes(finiteWord(form)) !== weak)
			issues.push(
				weak
					? `The Weak Präteritum ${form} is no Konjunktiv II form`
					: `The ${classes[index]} Präteritum ${form} is a Konjunktiv II form`,
			);
	});
	const pasts = preterites.map(finiteWord);
	if (classes.every((value) => value === "Weak"))
		for (const form of subjunctives)
			if (!pasts.includes(form))
				issues.push(
					`A Weak verb's Konjunktiv II ${form} is no Präteritum`,
				);
	return issues;
}

function participleIssues(
	classes: readonly Dumrel.ConjugationClass[],
	participles: readonly string[],
): string[] {
	if (participles.length === 0) return [];
	const issues: string[] = [];
	for (const [kind, ending] of [
		["Strong", /n$/u],
		["Mixed", /t$/u],
	] as const) {
		if (!classes.includes(kind)) continue;
		const fits = classes.every((value) => value === kind)
			? participles.every((form) => ending.test(form))
			: participles.some((form) => ending.test(form));
		if (!fits)
			issues.push(
				`A ${kind} Präteritum takes a Partizip II in -${kind === "Strong" ? "n" : "t"}: ${participles.join(", ")}`,
			);
	}
	return issues;
}
