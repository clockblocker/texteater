/**
 * Dumgen's public entry: German `segment.inUnits` (Dumgen ADR 0007, #701).
 * `splitText` splits a Text into paragraphs and Sentences in code;
 * `createSegment({ ask }).inUnits` turns each Sentence into its Segments and
 * its biggest units, each with its route or `Unresolved`, asking jev
 * through the host's `JevAsk`. `createTypeSafeAsk` is the production
 * `JevAsk`: `fetch` to the TypeSafe API, with no `node:*` import.
 */
export type { Answer, Answers } from "./segment/ask.js";
export type { GermanInventory } from "./segment/de/inventory.js";
export {
	createSegment,
	type InUnitsInput,
	type SegmentCall,
	type Segmenters,
	type SegmentOptions,
} from "./segment/in-units.js";
export {
	type JevAsk,
	type JevRequest,
	type JevResponse,
	pinnedJevModel,
	questionsPerRequest,
} from "./segment/jev.js";
export type {
	Route,
	Segment,
	SegmentedSentence,
	SegmentedText,
	SegmentLanguage,
	Unit,
} from "./segment/segmented-sentence.js";
export { type SplitText, splitText } from "./segment/split-text.js";
export {
	createTypeSafeAsk,
	type Fetch,
	type TypeSafeAskOptions,
} from "./segment/typesafe-ask.js";
