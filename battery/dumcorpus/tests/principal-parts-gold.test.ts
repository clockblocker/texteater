import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { germanConjugationClass, variantIdOf } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { loadSpecRecords } from "../src/index.js";
import { germanSelectionIssues } from "../src/inflection.js";

/** Each gold verb Reading's licensed principal parts, as a selection. */
function goldVerbs() {
	return loadSpecRecords().flatMap((record) =>
		record.targets.flatMap((target) => {
			const { lemma } = target.attestation.surface;
			const paradigm = target.paradigm ?? {};
			if (lemma.language !== "de" || !paradigm.preterite) return [];
			const selection: Partial<
				Record<Dumrel.DimensionId, Dumrel.ParadigmVariant[]>
			> = {};
			for (const [dimension, values] of Object.entries(paradigm) as [
				Dumrel.DimensionId,
				readonly string[],
			][])
				selection[dimension] = values.map((value) => ({
					id: variantIdOf(lemma, dimension, value),
					value,
					provenance: "Authored",
				}));
			return [
				{
					id: record.id,
					lemma: lemma as Dumling.Lemma<"de">,
					selection,
				},
			];
		}),
	);
}

// The forms are the source of truth, and gold keeps each licensed selection
// consistent with the classes its Präteritum forms derive (ADR 0038), per
// variant; gold that breaks that is a slip.
test("gold's licensed principal parts agree with the conjugation class of each Präteritum (#1217)", () => {
	const verbs = goldVerbs();
	const slips = verbs.flatMap(({ id, lemma, selection }) =>
		germanSelectionIssues(lemma, selection).map(
			(issue) => `${id}: ${issue}`,
		),
	);
	expect(slips).toEqual([]);
	expect(verbs.length).toBeGreaterThan(20);
	const classes = new Set(
		verbs.flatMap(({ lemma, selection }) =>
			(selection.preterite ?? []).map(({ value }) =>
				germanConjugationClass(lemma.canonicalForm, value),
			),
		),
	);
	expect(classes).toEqual(new Set(["Strong", "Weak", "Mixed"]));
	// Free and conditioned doublets are checked per variant too.
	expect(
		verbs.some(({ selection }) => (selection.preterite ?? []).length > 1),
	).toBe(true);
});

test("a Weak Präteritum's Konjunktiv II is itself, and a Strong one's never is", () => {
	const variant = (value: string) => ({
		id: value,
		value,
		provenance: "Produced" as const,
	});
	const lemma = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm: "melken",
		coreFeatures: { hasSepPrefix: null, lexicallyReflexive: null },
	} as const;
	expect(
		germanSelectionIssues(lemma, {
			preterite: [variant("melkte"), variant("molk")],
			subjunctivePast: [variant("melkte"), variant("mölke")],
			pastParticiple: [variant("gemelkt"), variant("gemolken")],
		}),
	).toEqual([]);
	expect(
		germanSelectionIssues(lemma, {
			preterite: [variant("melkte")],
			subjunctivePast: [variant("mölke")],
		}),
	).toEqual([
		"The Weak Präteritum melkte is no Konjunktiv II form",
		"A Weak verb's Konjunktiv II mölke is no Präteritum",
	]);
	expect(
		germanSelectionIssues(lemma, {
			preterite: [variant("molk")],
			subjunctivePast: [variant("molk")],
			pastParticiple: [variant("gemelkt")],
		}),
	).toEqual([
		"The Strong Präteritum molk is a Konjunktiv II form",
		"A Strong Präteritum takes a Partizip II in -n: gemelkt",
	]);
});
