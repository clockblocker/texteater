/**
 * Which full word a colloquial adverb shorthand shortens: a her- or hin-
 * adverb (Rule de/r-adverb-is-her-or-hin-shorthand) or a da(r)- pronominal
 * adverb (Rule de/dr-adverb-is-da-shorthand).
 */
export type GermanAdverbShorthandSeries = "herOrHin" | "da";

/** One colloquial shorthand and the full words it may stand for. */
type GermanAdverbShorthand = {
	readonly series: GermanAdverbShorthandSeries;
	readonly expansions: readonly string[];
};

/**
 * The colloquial r- and dr- adverbs, each with the words it may stand for. A
 * shorthand is no Lemma and no spelling of its own: it is the Shorthand
 * member of the full word it shortens, which is the target.
 *
 * - raus, rein, rüber, runter and rauf neutralize the her-/hin- pair, ran
 *   shortens heran alone, and rum shortens herum, which no inventory
 *   authors yet (`wh-adverbs.ts`).
 * - dran, drauf, draus, drin, drüber, drum and drunter shorten the da(r)-
 *   forms (`pronominal-adverbs.ts`).
 */
export const germanAdverbShorthands: Readonly<
	Record<string, GermanAdverbShorthand>
> = {
	rein: { series: "herOrHin", expansions: ["herein", "hinein"] },
	raus: { series: "herOrHin", expansions: ["heraus", "hinaus"] },
	rüber: { series: "herOrHin", expansions: ["herüber", "hinüber"] },
	runter: { series: "herOrHin", expansions: ["herunter", "hinunter"] },
	rauf: { series: "herOrHin", expansions: ["herauf", "hinauf"] },
	ran: { series: "herOrHin", expansions: ["heran"] },
	rum: { series: "herOrHin", expansions: ["herum"] },
	dran: { series: "da", expansions: ["daran"] },
	drauf: { series: "da", expansions: ["darauf"] },
	draus: { series: "da", expansions: ["daraus"] },
	drin: { series: "da", expansions: ["darin"] },
	drüber: { series: "da", expansions: ["darüber"] },
	drum: { series: "da", expansions: ["darum"] },
	drunter: { series: "da", expansions: ["darunter"] },
};
