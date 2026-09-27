import type { SegmentedSentence } from "../../types.js";
import {
	cliticEntry,
	fusedWordAt,
	fusionEntry,
} from "../../universal/fusion-table.js";
import { germanFusionTable } from "./fusion-entries.js";

/**
 * The Sentence with every split table fusion joined back into one
 * ResolvableText Segment (`i` + `m` is `im`). Intake judges a fused word as
 * the word the reader sees and lets the fusion table split it again; offsets
 * do not move.
 */
export function joinFusedWords(
	sentence: SegmentedSentence<"de">,
): SegmentedSentence<"de"> {
	const segments: SegmentedSentence<"de">["segments"][number][] = [];
	for (let index = 0; index < sentence.segments.length; index += 1) {
		const pieces = fusedWordAt(germanFusionTable, sentence.segments, index);
		const segment = sentence.segments[index];
		if (!segment) continue;
		if (!pieces) {
			segments.push(segment);
			continue;
		}
		segments.push({
			kind: "ResolvableText",
			text: pieces
				.map((piece) => sentence.segments[piece]?.text ?? "")
				.join(""),
		});
		index += pieces.length - 1;
	}
	return { ...sentence, segments };
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
