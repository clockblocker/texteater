import {
	cliticEntry,
	fusedWordAt,
	fusedWordSegments,
	fusionEntry,
} from "../../universal/fusion-table.js";
import { germanFusionTable } from "./fusion-entries.js";

/**
 * A Segment a host stores: a fusion component carries the surface it stands
 * for (`i` stands for `in`); every other Segment keeps its own letters.
 */
export type PieceSegment<Kind extends string = string> = {
	readonly kind: Kind;
	readonly text: string;
	readonly surface?: string;
};

/**
 * Splits every German fused word into one Segment per component, exactly as
 * Dumgen's segmentation and Sentence Analysis do (Dumgen ADR 0004, system ADR
 * 0035): `im` is `i` standing for `in` beside `m` standing for `dem`. Pieces
 * that arrive split already keep their surface, or gain it when they lack
 * one, so Segments from Dumgen's segmenter pass through unchanged. A host
 * that stores a Sentence without an analysis uses this, so it still holds
 * the pieces. Clitics and abbreviations stay one Segment, as they already are.
 */
export function splitGermanFusedWords<Kind extends string>(
	segments: readonly {
		readonly kind: Kind;
		readonly text: string;
		readonly surface?: string;
	}[],
): readonly PieceSegment<Kind>[] {
	const split: PieceSegment<Kind>[] = [];
	for (let index = 0; index < segments.length; index += 1) {
		const segment = segments[index];
		if (!segment) continue;
		const run = fusedWordAt(germanFusionTable, segments, index);
		const pieces = run
			? fusedWordSegments(
					germanFusionTable,
					run
						.map((position) => segments[position]?.text ?? "")
						.join(""),
				)
			: segment.kind === "ResolvableText"
				? fusedWordSegments(germanFusionTable, segment.text)
				: undefined;
		if (!pieces) {
			split.push(segment);
			continue;
		}
		for (const piece of pieces)
			split.push({ kind: segment.kind, ...piece });
		index += (run?.length ?? 1) - 1;
	}
	return split;
}

/** Whether intake splits this German word into pieces (`im`, `aufs`). */
export function isGermanFusedWord(text: string): boolean {
	return fusionEntry(germanFusionTable, text) !== undefined;
}

/**
 * The authored one-liner explaining a German Fusion value: the table fusion
 * it spells (`im`), or the attached clitic ending it (`geht's`).
 */
export function germanFusionOneLiner(fusion: {
	readonly spelling: string;
	readonly components: readonly { readonly span: string }[];
}): string | undefined {
	const entry = fusionEntry(germanFusionTable, fusion.spelling);
	if (entry) return entry.oneLiner;
	const clitic = fusion.components.at(-1)?.span;
	return clitic === undefined
		? undefined
		: cliticEntry(germanFusionTable, clitic)?.oneLiner;
}
