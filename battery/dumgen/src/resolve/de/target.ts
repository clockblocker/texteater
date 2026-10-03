/**
 * The unit a German click resolves, as the grammar judges read it: its
 * route, its members in Sentence order with what the fusion table says
 * about each, and the Sentence with the members marked. Members are named
 * `m0`, `m1`, … in the order of the unit's Segments, so member `i` is the
 * Attestation's member `i` (ADR 0003).
 */
import type { EntryType } from "promptsmith/typesafe";
import type {
	Route,
	Segment,
	SegmentedSentence,
	Unit,
} from "../../segment/segmented-sentence.js";
import { type TableSpelling, tableSpelling } from "./member-spelling.js";

export type Member = {
	/** Its index among the unit's members. */
	readonly position: number;
	/** Its Segment's index in the Sentence. */
	readonly segment: number;
	/** The Segment's letters, as the Attestation member attests them. */
	readonly text: string;
	/** What the fusion table says about its spelling, if anything. */
	readonly spelling: TableSpelling | undefined;
	/** How a question names it: `` `members.m1` ("auf") ``. */
	readonly ref: string;
};

export type Target = {
	readonly route: Route;
	readonly segments: readonly Segment[];
	readonly text: string;
	readonly members: readonly Member[];
	/**
	 * Members that continue the member before them without a space: the
	 * later pieces of a fused word the unit holds whole (`zur`).
	 */
	readonly glued: ReadonlySet<number>;
	/**
	 * Whether the unit's first member opens the Sentence, where a capital
	 * says nothing about the word: it only widens which authored spellings
	 * a closed-class member may match. Casing is never decided by it.
	 */
	readonly opensSentence: boolean;
};

/**
 * The target of a routed unit. A unit whose Segments are not ascending
 * ResolvableText Segments of its Sentence is bad input, a Defect.
 */
export function targetOf(
	sentence: SegmentedSentence,
	unit: Unit,
	route: Route,
): Target {
	const { segments } = sentence;
	if (unit.segments.length === 0) throw Error("A unit has a Segment");
	const members = unit.segments.map((segment, position): Member => {
		const value = segments[segment];
		if (
			value?.kind !== "ResolvableText" ||
			(position > 0 && segment <= (unit.segments[position - 1] ?? -1))
		)
			throw Error(
				"A unit's Segments are ascending ResolvableText Segments of its Sentence",
			);
		return {
			position,
			segment,
			text: value.text,
			spelling: tableSpelling(segments, unit.segments, segment),
			ref: `\`members.m${position}\` (${JSON.stringify(value.text)})`,
		};
	});
	// A later piece of a fused word the unit holds whole joins the piece
	// before it (zur), and so does a piece of a split word whose member
	// before it is a piece of the same word (ab … spannen of abzuspannen).
	const runStart = (member: Member) =>
		member.spelling?.orthography === "Fused"
			? member.segment - member.spelling.piece.component
			: undefined;
	const glued = new Set(
		members.flatMap((member) => {
			const { spelling, position } = member;
			if (spelling?.orthography !== "Fused" || position === 0) return [];
			if (spelling.split) {
				const before = members[position - 1];
				return before && runStart(before) === runStart(member)
					? [position]
					: [];
			}
			return spelling.written !== undefined &&
				spelling.piece.component > 0
				? [position]
				: [];
		}),
	);
	const first = segments.findIndex(
		(segment) => segment.kind === "ResolvableText",
	);
	return {
		route,
		segments,
		text: sentence.text,
		members,
		glued,
		opensSentence: unit.segments[0] === first,
	};
}

/**
 * What a member stands for when the fusion table settles it: its written
 * letters for a piece of a fused word the unit holds whole, else the word
 * the Sentence chose for it (`readings`), else the one word the table
 * names for a fused piece or a shorthand.
 */
export function fixedSpelling(
	member: Member,
	readings: ReadonlyMap<number, string> = new Map(),
): string | undefined {
	const { spelling } = member;
	if (!spelling) return undefined;
	if (spelling.orthography === "Fused" && spelling.written !== undefined)
		return spelling.written;
	const chosen = readings.get(member.segment);
	if (chosen !== undefined) return chosen;
	return spelling.surfaces.length === 1 ? spelling.surfaces[0] : undefined;
}

/** Members joined as the Surface shows them, glued pieces without a space. */
export function joinMembers(
	texts: readonly string[],
	glued: ReadonlySet<number>,
	skipped: ReadonlySet<number> = new Set(),
): string {
	let joined = "";
	for (const [position, text] of texts.entries()) {
		if (skipped.has(position)) continue;
		joined += joined && !glued.has(position) ? ` ${text}` : text;
	}
	return joined;
}

/** How the judge reads one member: its letters and what the table says about them. */
function memberGloss(member: Member): string {
	const { spelling } = member;
	if (!spelling) return member.text;
	if (spelling.orthography === "Shorthand")
		return `${member.text}, a shortened word standing for ${spelling.surfaces.join(" or ")}`;
	const word = spelling.piece.pieces.map(({ span }) => span).join("");
	const standsFor =
		spelling.written === undefined && spelling.surfaces.length > 0
			? `, standing for ${spelling.surfaces.join(" or ")}`
			: "";
	return `${member.text}, a piece of the written word ${word}${standsFor}`;
}

/**
 * The state every grammar request reads: the Sentence, the Sentence with
 * the unit's members marked ⟦…⟧, the members, and the route.
 */
export function targetState(target: Target): Record<string, EntryType> {
	const marked = new Set(target.members.map(({ segment }) => segment));
	return {
		sentence: target.text,
		marked: target.segments
			.map(({ text }, index) => (marked.has(index) ? `⟦${text}⟧` : text))
			.join(""),
		members: Object.fromEntries(
			target.members.map((member) => [
				`m${member.position}`,
				memberGloss(member),
			]),
		),
		route: `${target.route.family} ${target.route.kind}`,
	};
}
