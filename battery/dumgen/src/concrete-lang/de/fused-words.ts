import {
	cliticEntry,
	fusedWordPieces,
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
 * Sentence Analysis places them (Dumgen ADR 0004, system ADR 0035): `im` is
 * `i` standing for `in` beside `m` standing for `dem`. A host that stores a
 * Sentence without an analysis uses this, so it still holds the pieces.
 * Clitics and abbreviations stay one Segment, as they already are.
 */
export function splitGermanFusedWords<Kind extends string>(
	segments: readonly { readonly kind: Kind; readonly text: string }[],
): readonly PieceSegment<Kind>[] {
	return segments.flatMap(({ kind, text }) => {
		const fusion =
			kind === "ResolvableText"
				? fusionEntry(germanFusionTable, text)
				: undefined;
		if (!fusion) return [{ kind, text }];
		const pieces = fusedWordPieces(fusion, text);
		return fusion.components.map((component, position) => ({
			kind,
			text: pieces[position] ?? "",
			surface:
				typeof component.surface === "string"
					? component.surface
					: component.surface[0],
		}));
	});
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
