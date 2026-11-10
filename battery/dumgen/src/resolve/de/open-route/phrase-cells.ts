/**
 * The cells a word's noun phrase allows where it stands (#1326, #1339),
 * read through the paradigm (`paradigm.ts`) from what the Sentence holds
 * around it:
 *
 * - the determiner its phrase opens with, over the attributes between (an
 *   ADJ, an ADV, a NUM): its authored cells (dem is Dat.Sing.Masc/Neut);
 * - the preposition that governs the phrase, by the ADP Case Table;
 * - an attributive ending: an ADJ's own, a noun's adjacent attribute's, or
 *   for a determiner the attribute right after it (die kleinen is plural);
 * - coordination: a phrase after und, oder, sowie or sondern shares its
 *   case with the conjunct before it (nach etwas Ruhe und verlässlichen
 *   Nächten is Dat), and an attribute before und belongs to the same
 *   phrase (kleine und große Kinder).
 *
 * An attributive ADJ inside its noun's unit, which opens before it with
 * the noun's article (`[einer … Heizwendel]`), reads them where that unit
 * opens, so an attribute of its own between them (`in einem Metallrohr`)
 * hides neither the article nor the preposition before it (#1337).
 * A determiner (a closed DET) and a pronoun read no determiner before
 * them: a run of determiners inflects as its first says (die beiden).
 * Evidence that leaves no cell is dropped, never trusted over the rest.
 */

import type { Segment, Unit } from "../../../segment/segmented-sentence.js";
import type { Target } from "../target.js";
import {
	bothAllow,
	casesOf,
	casesOnly,
	determinerCells,
	endingCells,
	everyCell,
	type PhraseCell,
	prepositionCells,
	type SurfaceCase,
} from "./paradigm.js";
import { fold } from "./shape.js";

/** The routes whose units may stand between a word and its phrase's determiner. */
const attributes: ReadonlySet<string> = new Set(["ADJ", "ADV", "NUM"]);

/** The routes of the units a phrase's head noun belongs to, which may open with its article. */
const heads: ReadonlySet<string> = new Set(["NOUN", "PROPN"]);

/**
 * The routes of the units a phrase's determiner belongs to: its own, its
 * noun's, or an idiom's that holds the whole phrase (mit den Wölfen heulen).
 */
const articleHolders: ReadonlySet<string> = new Set(["DET", ...heads, "VERB"]);

/** The routes of a conjunct whose case the phrase after a coordinator shares. */
const conjuncts: ReadonlySet<string> = new Set(["NOUN", "PROPN", "PRON"]);

/** The routes of a governor whose unit holds the preposition it governs (sich sehnen nach). */
const governors: ReadonlySet<string> = new Set(["VERB", "ADJ", "NOUN"]);

/** The coordinators that join two phrases of one case. */
const coordinators: ReadonlySet<string> = new Set([
	"und",
	"oder",
	"sowie",
	"sondern",
]);

/** The word a Segment stands for: a fused piece's, else its letters. */
const wordOf = (segment: Segment) => fold(segment.surface ?? segment.text);

type Reached = {
	readonly segment: Segment;
	readonly unit: Unit | undefined;
	readonly kind: string | undefined;
	/** Whether it is its unit's first Segment. */
	readonly opensUnit: boolean;
	/** Whether a comma stands between it and the phrase. */
	readonly pastComma: boolean;
};

const routedUnit = (units: readonly Unit[], index: number) =>
	units.find(({ segments: held }) => held.includes(index));

const kindOf = (unit: Unit | undefined) =>
	unit === undefined || unit.route === "Unresolved"
		? undefined
		: unit.route.kind;

/**
 * The Segments before `from` that are no whitespace or comma, nearest
 * first, each with its unit and that unit's route.
 */
function* before(
	segments: readonly Segment[],
	units: readonly Unit[],
	from: number,
): Generator<Reached> {
	let pastComma = false;
	for (let index = from - 1; index >= 0; index--) {
		const segment = segments[index];
		if (!segment) return;
		if (segment.kind === "Whitespace") continue;
		if (segment.kind === "Punctuation") {
			if (segment.text !== ",") return;
			pastComma = true;
			continue;
		}
		const unit = routedUnit(units, index);
		yield {
			segment,
			unit,
			kind: kindOf(unit),
			opensUnit: unit?.segments[0] === index,
			pastComma,
		};
	}
}

/** The nearest Segment on `side` of `index` that is no whitespace, with its unit. */
function adjacent(
	segments: readonly Segment[],
	units: readonly Unit[],
	index: number,
	side: -1 | 1,
): { readonly segment: Segment; readonly unit: Unit | undefined } | undefined {
	for (let at = index + side; at >= 0 && at < segments.length; at += side) {
		const segment = segments[at];
		if (!segment || segment.kind === "Punctuation") return undefined;
		if (segment.kind === "Whitespace") continue;
		return { segment, unit: routedUnit(units, at) };
	}
	return undefined;
}

/** The ending cells of a one-Segment ADJ unit's Segment, if `reached` is one. */
function attributeEnding(
	reached: ReturnType<typeof adjacent>,
): readonly PhraseCell[] | undefined {
	const unit = reached?.unit;
	return reached &&
		unit &&
		unit.route !== "Unresolved" &&
		unit.route.kind === "ADJ" &&
		unit.segments.length === 1
		? endingCells(reached.segment.text)
		: undefined;
}

/**
 * Where an ADJ's phrase opens when the ADJ stands inside its head noun's
 * unit: the unit after it, over attributes and commas, is a NOUN or PROPN
 * whose first Segment comes before the ADJ. Undefined otherwise.
 */
function headOpening(
	segments: readonly Segment[],
	units: readonly Unit[],
	last: number,
	first: number,
): number | undefined {
	for (let index = last + 1; index < segments.length; index++) {
		const segment = segments[index];
		if (!segment || segment.kind === "Whitespace") continue;
		if (segment.kind === "Punctuation") {
			if (segment.text === ",") continue;
			return undefined;
		}
		const unit = routedUnit(units, index);
		if (!unit || unit.route === "Unresolved") return undefined;
		if (attributes.has(unit.route.kind)) {
			index = Math.max(index, ...unit.segments);
			continue;
		}
		const [opening] = unit.segments;
		return heads.has(unit.route.kind) &&
			opening !== undefined &&
			opening < first
			? opening
			: undefined;
	}
	return undefined;
}

/** A narrowing of cells that drops any evidence that would leave none. */
class Narrowing {
	cells: readonly PhraseCell[] = everyCell;
	by(allowed: readonly PhraseCell[] | undefined): void {
		if (!allowed) return;
		const kept = bothAllow(this.cells, allowed);
		if (kept.length > 0) this.cells = kept;
	}
}

/** What one Segment before a phrase does to the walk back from it. */
type Step =
	| { readonly tag: "Skip" }
	| { readonly tag: "Determiner"; readonly cells: readonly PhraseCell[] }
	| { readonly tag: "Coordinator" }
	| { readonly tag: "End"; readonly cells?: readonly PhraseCell[] };

/**
 * The step a Segment before the phrase makes, `determined` once its
 * determiner is found: a determiner, an attribute or an indeclinable
 * determiner (etwas, genug) before it, a coordinator, or the end, with
 * the cases a preposition there governs.
 */
function stepOf(
	{ segment, kind, opensUnit, pastComma }: Reached,
	ownDeterminer: boolean,
	determined: boolean,
): Step {
	const word = wordOf(segment);
	const cells =
		ownDeterminer && (kind === undefined || articleHolders.has(kind))
			? determinerCells(word)
			: undefined;
	if (cells) return { tag: "Determiner", cells };
	if (!determined && kind !== undefined && attributes.has(kind))
		return { tag: "Skip" };
	if (!determined && kind === "DET" && !determinerCells(word))
		return { tag: "Skip" };
	if (kind === "CCONJ" && coordinators.has(word))
		return { tag: "Coordinator" };
	// A circumposition's last word governs nothing after it (von … aus).
	if (kind === "ADP" && opensUnit)
		return { tag: "End", cells: prepositionCells(word) ?? everyCell };
	// A preposition its governor's unit holds governs the phrase after it
	// as well; past a comma it may be a separable prefix ending a clause.
	if (kind !== undefined && governors.has(kind) && !pastComma)
		return { tag: "End", cells: prepositionCells(word) ?? everyCell };
	return { tag: "End" };
}

/**
 * The evidence before `from` for the phrase that opens there: the
 * preposition, a coordinated conjunct's case, and, when `ownDeterminer`,
 * the determiner its phrase opens with (the first of a run of them:
 * «beiden» of «die beiden» inflects as the article before it says).
 * Past a coordinator, an attribute belongs to the same phrase, and a
 * noun or pronoun conjunct shares only its case.
 */
function evidenceBefore(
	segments: readonly Segment[],
	units: readonly Unit[],
	from: number,
	ownDeterminer: boolean,
	narrowing: Narrowing,
): void {
	let determiner: readonly PhraseCell[] | undefined;
	let coordinated = false;
	for (const reached of before(segments, units, from)) {
		const { unit, kind } = reached;
		if (coordinated) {
			coordinated = false;
			if (!determiner && kind !== undefined && attributes.has(kind))
				continue;
			if (unit && kind !== undefined && conjuncts.has(kind))
				narrowing.by(casesOnly(conjunctCells(segments, units, unit)));
			break;
		}
		const step = stepOf(reached, ownDeterminer, determiner !== undefined);
		if (step.tag === "Skip") continue;
		if (step.tag === "Determiner") {
			determiner = step.cells;
			continue;
		}
		if (step.tag === "Coordinator") {
			coordinated = true;
			continue;
		}
		narrowing.by(step.cells);
		break;
	}
	narrowing.by(determiner);
}

/**
 * The cells of the conjunct `unit` heads: what stands before it, and its
 * own article when its unit opens with one (der Musik).
 */
function conjunctCells(
	segments: readonly Segment[],
	units: readonly Unit[],
	unit: Unit,
): readonly PhraseCell[] {
	const [opening = 0] = unit.segments;
	const first = segments[opening];
	const owned = first && determinerCells(wordOf(first)) !== undefined;
	const narrowing = new Narrowing();
	evidenceBefore(
		segments,
		units,
		owned ? opening + 1 : opening,
		kindOf(unit) !== "PRON",
		narrowing,
	);
	return narrowing.cells;
}

/**
 * The cells a word that agrees with its phrase can take where it stands,
 * in catalog order: every cell when nothing narrows them.
 */
export function phraseCells(
	target: Target,
	units: readonly Unit[],
): readonly PhraseCell[] {
	const [first] = target.members;
	const narrowing = new Narrowing();
	if (!first) return narrowing.cells;
	const last = target.members.at(-1) ?? first;
	const { family, kind } = target.route;
	const closed = family === "Lexeme" && (kind === "DET" || kind === "PRON");
	if (kind === "ADJ" && target.members.length === 1)
		narrowing.by(endingCells(first.text));
	if (kind === "NOUN" || kind === "PROPN")
		narrowing.by(
			attributeEnding(adjacent(target.segments, units, last.segment, -1)),
		);
	if (family === "Lexeme" && kind === "DET")
		narrowing.by(
			attributeEnding(adjacent(target.segments, units, last.segment, 1)),
		);
	const opening =
		kind === "ADJ"
			? headOpening(target.segments, units, last.segment, first.segment)
			: undefined;
	evidenceBefore(
		target.segments,
		units,
		opening === undefined ? first.segment : opening + 1,
		!closed,
		narrowing,
	);
	return narrowing.cells;
}

/** The cases a word that agrees with its phrase can take where it stands (`phraseCells`). */
export function surfaceCases(
	target: Target,
	units: readonly Unit[],
): readonly SurfaceCase[] {
	return casesOf(phraseCells(target, units));
}
