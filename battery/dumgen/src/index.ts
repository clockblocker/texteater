/**
 * German `segment.inUnits` (Dumgen ADR 0007, #701): a Sentence's Segments go
 * in, and its biggest units come back, each with its route or `Unresolved`.
 * The segmenter itself is still built in the lab; this entry carries the
 * contract its evaluator scores.
 */
export type {
	Route,
	SegmentInUnitsInput,
	SegmentInUnitsOutput,
	Unit,
} from "./evaluation/spec-corpus/segment-in-units.js";
