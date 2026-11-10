/**
 * The cases a Surface that agrees with its noun can take where it stands
 * (#1326): an attributive ADJ, a NUM or SYM Lexeme, a DET, NUM or PRON
 * Locution, and the NOUN itself. What
 * stands before it in its Sentence narrows them, over the attributes
 * between (an ADJ, an ADV, a NUM): the determiner its noun phrase opens
 * with, read through its authored cells (dem is Dat), and the preposition
 * that governs the phrase, read through the ADP Case Table (mit is Dat).
 * An ADJ's own ending narrows them too: -em is only Dat, and -e and -es
 * only Nom or Acc. Every agreeing route reads the one answer, so its case
 * question offers only these.
 */

import {
	authoredRealizations,
	germanAdpositionAllowedCases,
	germanAdpositionEntry,
} from "dumcorpus/inventories";
import type { Segment, Unit } from "../../../segment/segmented-sentence.js";
import type { Target } from "../target.js";
import { cases, fold } from "./shape.js";

export type SurfaceCase = (typeof cases)[number];

/** The routes whose units may stand between a Surface and its phrase's determiner. */
const attributes: ReadonlySet<string> = new Set(["ADJ", "ADV", "NUM"]);

/** The routes of the units a phrase's determiner belongs to: its own, or its noun's. */
const articleHolders: ReadonlySet<string> = new Set(["DET", "NOUN", "PROPN"]);

/** The word a Segment stands for: a fused piece's, else its letters. */
const wordOf = (segment: Segment) => fold(segment.surface ?? segment.text);

/**
 * The cases a determiner spelled `word` takes in any of its authored
 * cells, or undefined when it is none or a cell leaves the case open.
 */
function determinerCases(word: string): readonly SurfaceCase[] | undefined {
	const cells = authoredRealizations.filter(
		({ member, spelled }) =>
			member.lemma.kind === "DET" && fold(spelled) === word,
	);
	if (cells.length === 0) return undefined;
	const found = new Set<string>();
	for (const { member, inflection } of cells) {
		const core: Readonly<Record<string, unknown>> =
			member.lemma.coreFeatures;
		const value = inflection?.case ?? core.case;
		if (typeof value !== "string") return undefined;
		found.add(value);
	}
	return cases.filter((grammaticalCase) => found.has(grammaticalCase));
}

/** The cases a preposition spelled `word` governs, by the ADP Case Table. */
function prepositionCases(word: string): readonly SurfaceCase[] | undefined {
	const entry = germanAdpositionEntry({
		family: "Lexeme",
		canonicalForm: word,
	});
	if (!entry) return undefined;
	const allowed: readonly string[] = germanAdpositionAllowedCases(entry);
	return cases.filter((grammaticalCase) => allowed.includes(grammaticalCase));
}

/** The cases an attributive ending allows, by the strong, mixed and weak declensions together. */
function endingCases(text: string): readonly SurfaceCase[] | undefined {
	const word = fold(text);
	if (word.endsWith("em")) return ["Dat"];
	if (word.endsWith("es") || word.endsWith("e")) return ["Nom", "Acc"];
	return undefined;
}

/**
 * The Segments before `from` that are no whitespace or comma, nearest
 * first, each with the route of the unit it belongs to.
 */
function* before(
	segments: readonly Segment[],
	units: readonly Unit[],
	from: number,
): Generator<{
	readonly segment: Segment;
	readonly kind: string | undefined;
	/** Whether it is its unit's first Segment. */
	readonly opensUnit: boolean;
}> {
	for (let index = from - 1; index >= 0; index--) {
		const segment = segments[index];
		if (!segment) return;
		if (segment.kind === "Whitespace") continue;
		if (segment.kind === "Punctuation") {
			if (segment.text === ",") continue;
			return;
		}
		const unit = units.find(({ segments: held }) => held.includes(index));
		yield {
			segment,
			kind:
				unit === undefined || unit.route === "Unresolved"
					? undefined
					: unit.route.kind,
			opensUnit: unit?.segments[0] === index,
		};
	}
}

/**
 * The cases an agreeing Surface can take here, in catalog order: all four
 * when nothing before it or in its ending narrows them. Evidence that
 * leaves no case is dropped, never trusted over the rest.
 */
export function surfaceCases(
	target: Target,
	units: readonly Unit[],
): readonly SurfaceCase[] {
	const [first] = target.members;
	let open: readonly SurfaceCase[] = cases;
	const narrow = (allowed: readonly SurfaceCase[] | undefined) => {
		const kept = allowed
			? open.filter((grammaticalCase) =>
					allowed.includes(grammaticalCase),
				)
			: open;
		if (kept.length > 0) open = kept;
	};
	if (target.route.kind === "ADJ" && first && target.members.length === 1)
		narrow(endingCases(first.text));
	if (!first) return open;
	// The phrase's determiner is the first of a run of them: «beiden» of
	// «die beiden» inflects as the article before it says.
	let determiner: readonly SurfaceCase[] | undefined;
	for (const { segment, kind, opensUnit } of before(
		target.segments,
		units,
		first.segment,
	)) {
		const word = wordOf(segment);
		const cells =
			kind === undefined || articleHolders.has(kind)
				? determinerCases(word)
				: undefined;
		if (cells) {
			determiner = cells;
			continue;
		}
		if (!determiner && kind !== undefined && attributes.has(kind)) continue;
		// A circumposition's last word governs nothing after it (von … aus).
		if (kind === "ADP" && opensUnit) narrow(prepositionCases(word));
		break;
	}
	narrow(determiner);
	return open;
}
