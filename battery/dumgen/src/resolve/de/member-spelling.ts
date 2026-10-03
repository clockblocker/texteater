/**
 * How a unit's members are spelled where the fusion table settles it (ADR
 * 0035, Rule de/fused-word-pieces): a piece of a fused word is Fused and
 * stands for the word its component names (m of im is dem), a free clitic
 * or an abbreviation is Shorthand and stands for its expansion. Pure code
 * over Dumgen's fusion table; no judge reads it.
 */
import type * as Dumling from "dumling/types";
import { germanFusionTable } from "../../segment/de/fusion-entries.js";
import {
	type FusedPiece,
	fusedPieceAt,
	fusedWordAt,
	shorthandSurfaces,
} from "../../segment/fusion-table.js";
import type { Segment } from "../../segment/segmented-sentence.js";

type Member = Dumling.Attestation<"de">["members"][number];
export type MemberOrthography = Member["orthography"];

/**
 * A Segment whose spelling the fusion table settles. The surfaces are what
 * its letters stand for (m is dem, z.B. is zum Beispiel); none means it
 * keeps its own letters, as a clitic's host does. `written` is set when the
 * unit holds every piece of a table fusion (zur in zur Verfügung stellen):
 * the unit shows the fused word as written, so the piece keeps its letters
 * and joins the piece before it without a space.
 */
export type TableSpelling =
	| {
			readonly orthography: "Fused";
			readonly piece: FusedPiece;
			readonly surfaces: readonly string[];
			readonly written: string | undefined;
			/** A piece of a word split with no table entry, an infixed zu's word. */
			readonly split: boolean;
	  }
	| {
			readonly orthography: "Shorthand";
			readonly surfaces: readonly string[];
	  };

/**
 * The written word a Segment is a piece of: a table fusion or a clitic on
 * its host, or else any run of ResolvableText Segments with nothing
 * between them, such as an infinitive split at its infixed zu (ab, zu,
 * spannen; Rule de/fused-word-pieces), whose pieces keep their letters.
 */
function piecesAt(
	segments: readonly Segment[],
	index: number,
): { readonly piece: FusedPiece; readonly table: boolean } | undefined {
	const piece = fusedPieceAt(germanFusionTable, segments, index);
	if (piece) return { piece, table: true };
	const resolvable = (position: number) =>
		segments[position]?.kind === "ResolvableText";
	if (!resolvable(index)) return undefined;
	let start = index;
	while (resolvable(start - 1)) start--;
	let end = index;
	while (resolvable(end + 1)) end++;
	if (start === end) return undefined;
	const spans = segments.slice(start, end + 1).map(({ text }) => text);
	// Only a word split at its infixed zu: letters around a zu piece.
	const infixed =
		spans.every((span) => /^\p{L}+$/u.test(span)) &&
		spans
			.slice(1, -1)
			.some((span) => span.toLocaleLowerCase("de") === "zu");
	if (!infixed) return undefined;
	return {
		piece: {
			pieces: spans.map((span) => ({ span, surfaces: [] })),
			component: index - start,
		},
		table: false,
	};
}

/** The Segment indices of the written word a Segment is a piece of. */
function fusedWordIndices(
	segments: readonly Segment[],
	index: number,
): number[] {
	const found = piecesAt(segments, index);
	return found
		? found.piece.pieces.map(
				(_, position) => index - found.piece.component + position,
			)
		: [];
}

/**
 * The her- and hin- words a colloquial r- adverb shortens (Rule
 * de/r-adverb-is-her-or-hin-shorthand): never a Lemma of its own, always
 * the Shorthand of one of them.
 */
export const rShortenings: Readonly<Record<string, readonly string[]>> = {
	rein: ["herein", "hinein"],
	raus: ["heraus", "hinaus"],
	rüber: ["herüber", "hinüber"],
	runter: ["herunter", "hinunter"],
	rauf: ["herauf", "hinauf"],
	ran: ["heran"],
	rum: ["herum"],
};

/**
 * The da(r)- word a colloquial dr- adverb shortens (Rule
 * de/dr-adverb-is-da-shorthand), always its Shorthand.
 */
const drShortenings: Readonly<Record<string, readonly string[]>> = {
	dran: ["daran"],
	drauf: ["darauf"],
	drin: ["darin"],
	drüber: ["darüber"],
	drum: ["darum"],
};

/**
 * The table's spelling of the member at Segment `index`, if it settles
 * one. On a route an r- or dr- adverb serves (a VERB's particle, an ADV),
 * such an adverb is Shorthand for the words it may shorten.
 */
export function tableSpelling(
	segments: readonly Segment[],
	members: readonly number[],
	index: number,
	adverbShorthand = false,
): TableSpelling | undefined {
	const found = piecesAt(segments, index);
	if (found) {
		const { piece } = found;
		const indices = fusedWordIndices(segments, index);
		const whole =
			fusedWordAt(germanFusionTable, segments, indices[0] ?? -1) !==
				undefined &&
			indices.every((position) => members.includes(position));
		return {
			orthography: "Fused",
			piece,
			surfaces: piece.pieces[piece.component]?.surfaces ?? [],
			written: whole
				? segments[index]?.text.toLocaleLowerCase("de")
				: found.table
					? undefined
					: segments[index]?.text,
			split: !found.table,
		};
	}
	const segment = segments[index];
	if (segment?.kind !== "ResolvableText") return undefined;
	const word = segment.text.toLocaleLowerCase("de");
	const surfaces =
		shorthandSurfaces(germanFusionTable, segment.text) ??
		(adverbShorthand
			? (rShortenings[word] ?? drShortenings[word])
			: undefined);
	return surfaces && { orthography: "Shorthand", surfaces };
}

/**
 * The word each piece of the fused words a unit touches stands for, keyed
 * by Segment index, once the Sentence has chosen it: 's in geht's is es on
 * the verb's Attestation and on the pronoun's alike (ADR 0035).
 */
export type PieceReadings = ReadonlyMap<number, string>;

/**
 * The pieces of the fused words the unit's members belong to whose table
 * entry names several words ('s: es or das), keyed by Segment index: the
 * candidates, the fused word, and the first member it is written onto.
 */
export function ambiguousPieces(
	segments: readonly Segment[],
	members: readonly number[],
): ReadonlyMap<
	number,
	{
		readonly surfaces: readonly string[];
		readonly spelling: string;
		readonly member: number;
	}
> {
	const ambiguous = new Map<
		number,
		{ surfaces: readonly string[]; spelling: string; member: number }
	>();
	for (const [member, index] of members.entries()) {
		const piece = fusedPieceAt(germanFusionTable, segments, index);
		if (!piece) continue;
		const spelling = piece.pieces.map((part) => part.span).join("");
		for (const [position, part] of piece.pieces.entries()) {
			const segment = index - piece.component + position;
			if (part.surfaces.length > 1 && !ambiguous.has(segment))
				ambiguous.set(segment, {
					surfaces: part.surfaces,
					spelling,
					member,
				});
		}
	}
	return ambiguous;
}

/**
 * The Attestation member a Segment realizes. A Fused member carries its
 * Fusion, and every piece shows the word it stands for: the reading the
 * Sentence chose when the table names several, the one it names otherwise,
 * and a host its own letters.
 */
export function attestedMember(
	segments: readonly Segment[],
	index: number,
	orthography: MemberOrthography,
	readings: PieceReadings,
): Member {
	const attested = segments[index]?.text;
	if (attested === undefined) throw Error(`No member Segment ${index}`);
	if (orthography !== "Fused") return { attested, orthography };
	const piece = piecesAt(segments, index)?.piece;
	if (!piece) throw Error("A Fused member is a piece of a fused word");
	const [first, second, ...rest] = piece.pieces.map((part, position) => {
		const reading = readings.get(index - piece.component + position);
		if (reading === undefined && part.surfaces.length > 1)
			throw Error(
				`The Sentence chose no reading for the piece ${part.span}`,
			);
		return {
			span: part.span,
			surface: reading ?? part.surfaces[0] ?? part.span,
		};
	});
	if (!first || !second) throw Error("A fused word has two pieces");
	return {
		attested,
		orthography,
		fusion: {
			spelling: piece.pieces.map((part) => part.span).join(""),
			components: [first, second, ...rest],
		},
		component: piece.component,
	};
}
