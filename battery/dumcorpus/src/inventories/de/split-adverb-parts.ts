import {
	pronominalAdverbParts,
	type SplitAdverbParts,
} from "./pronominal-adverbs.js";
import { directionalAdverbParts } from "./wh-adverbs.js";

/**
 * Every German adverb whose two parts stand apart with other words between
 * them, read as one target (Da kann ich nichts für, Wo kommst du her; Rule
 * de/split-adverb-is-one-target): each pair's head, tail and the authored
 * ADV they form. The da(r)-, hier- and wo(r)- pronominal adverbs, then the
 * directional dahin, daher, hierhin, hierher, wohin and woher.
 */
export const germanSplitAdverbParts: readonly SplitAdverbParts[] = [
	...pronominalAdverbParts,
	...directionalAdverbParts,
];
