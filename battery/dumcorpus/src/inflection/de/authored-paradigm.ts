import type * as Dumling from "dumling/types";
import { variantIdOf } from "dumrel";
import type * as Dumrel from "dumrel/types";

import { closedVerbTableOf } from "./closed-paradigms.js";

/**
 * The Lemma Paradigm of a closed VERB (sein, haben, werden and the modals),
 * read off its authored table (ADR 0048): one `Authored` variant per form of
 * each principal part, and no Licences, so every authored Reading takes
 * every variant. Undefined for any other Lemma; an AUX, DET or PRON route
 * has no Variation Dimensions, and its authored table is its paradigm.
 */
export function germanAuthoredParadigm(
	lemma: Dumling.Lemma<"de">,
): Dumrel.LemmaParadigm | undefined {
	if (lemma.kind !== "VERB") return undefined;
	const table = closedVerbTableOf(lemma);
	if (table === undefined) return undefined;
	const parts: readonly (readonly [Dumrel.DimensionId, readonly string[]])[] =
		[
			["preterite", table.preterite[2] ?? []],
			["present1", table.present[0] ?? []],
			["present2", table.present[1] ?? []],
			["present3", table.present[2] ?? []],
			["pastParticiple", table.participle],
			["subjunctivePast", table.subjunctive2[2] ?? []],
		];
	const dimensions: Partial<
		Record<Dumrel.DimensionId, Dumrel.ParadigmDimension>
	> = {};
	for (const [dimension, values] of parts) {
		const variants = values
			.map((value) => ({
				id: variantIdOf(lemma, dimension, value),
				value,
				provenance: "Authored" as const,
			}))
			.sort((left, right) =>
				left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
			);
		dimensions[dimension] = { variants, licences: {} };
	}
	return { dimensions };
}
