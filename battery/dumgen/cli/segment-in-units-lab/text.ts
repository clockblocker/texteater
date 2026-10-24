/**
 * The lines `report` and `compare` print: rates as percentages, the grouping
 * (#701), its merges and the focus blocks' rows.
 */
import type {
	GroupingExample,
	PolicySummary,
} from "../../lab/segmentation/harness/metrics.js";

export const percent = (value: number) =>
	Number.isNaN(value) ? "–" : `${(100 * value).toFixed(1)}`;

/** B-cubed precision/recall/F1, as `report` and `compare` print it. */
export const hoverText = (precision: number, recall: number, f1: number) =>
	`${percent(precision)}/${percent(recall)}/${percent(f1)}`;

/**
 * One policy's grouping (#701): hover B-cubed on every record, on Full
 * records and over multi-piece gold units, each with [records, Segments],
 * and the highlighted Segments no gold unit asserts; pair precision on Full
 * records, on the pairs any record decides, pair recall and F1, each with
 * [records, pairs]; the over- and under-merges per repetition; membership
 * of discontinuous, multi-piece and one-piece gold units.
 */
export function groupingText(summary: PolicySummary): string {
	const { rates, tally, hoverRecords, pairRecords } = summary;
	return [
		`hover ${hoverText(rates.hoverPrecision, rates.hoverRecall, rates.hoverF1)} [${hoverRecords.all}, ${tally.hoverSegments}]`,
		`Full ${hoverText(rates.fullHoverPrecision, rates.fullHoverRecall, rates.fullHoverF1)} [${hoverRecords.full}, ${tally.fullHoverSegments}]`,
		`multi ${hoverText(rates.multiHoverPrecision, rates.multiHoverRecall, rates.multiHoverF1)} [${hoverRecords.multi}, ${tally.multiHoverSegments}]`,
		`unasserted ${tally.hoverUnasserted}/${tally.hoverHighlighted}`,
		`pairP ${percent(rates.pairPrecision)} [${pairRecords.fullPrecision} Full, ${tally.fullPairs}]`,
		`assertedP ${percent(rates.assertedPairPrecision)} [${pairRecords.assertedPrecision}, ${tally.decidedPairs}]`,
		`pairR ${percent(rates.pairRecall)} [${pairRecords.recall}, ${tally.goldPairs}]`,
		`F1 ${percent(rates.pairF1)} asserted ${percent(rates.assertedPairF1)}`,
		`over ${tally.overMerged} (${summary.overMergedByRepetition.join("/")})`,
		`under ${tally.underMerged} (${summary.underMergedByRepetition.join("/")})`,
		`mem% discontinuous ${percent(rates.discontinuousMembership)} [${tally.discontinuousScored}] multi ${percent(rates.multiMembership)} one ${percent(rates.singleMembership)}`,
	].join("  ");
}

export const groupingLegend =
	"grouping (#701), summed over repetitions: hover = B-cubed P/R/F1 of what hovering each Segment of a scored gold unit highlights, every record; Full = Full records only; multi = Segments of multi-piece gold units only; [records, Segments]; unasserted = highlighted Segments no gold unit asserts, of all highlighted, counted against P; pairP = Segment pairs a returned unit joins that one gold unit holds, Full records only; assertedP = the same over pairs touching an asserted unit on any record; pairR = gold pairs kept together; [records, pairs]; over = returned units joining Segments of 2+ gold units, under = gold units split, per repetition in brackets";

/**
 * One merge on one line, the way `report` prints it and `summary.json`
 * keeps it: an over-merge as its parts with their gold routes (? where no
 * gold unit is asserted), an under-merge as its gold unit and fragments,
 * then the repetitions, the case and the Sentence.
 */
export const exampleLine = (example: GroupingExample) =>
	`${
		example.kind === "over"
			? example.parts
					.map((part) => `[${part.text} ${part.gold ?? "?"}]`)
					.join(" + ")
			: `${example.text} ${example.gold ?? ""} → ${example.parts.map((part) => `[${part.text}]`).join(" ")}`
	} (${example.repetitions.join(",")}) ${example.case} «${example.sentence}»`;

export const focusLine = (label: string, cells: readonly string[]) =>
	console.log(`  ${label.padEnd(44)} ${cells.join(" ")}`);
