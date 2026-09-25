import type * as Dumling from "dumling/types";
import type { Encounter } from "../../../types.js";
import {
	type FusedPiece,
	fusedPieceAt,
	fusedWordAt,
	shorthandSurfaces,
} from "../../../universal/fusion-table.js";
import { germanFusionTable } from "../fusion-entries.js";

type Member = Dumling.Attestation["members"][number];
export type MemberOrthography = Member["orthography"];

/**
 * A Segment whose spelling the fusion table settles (ADR 0035): a piece of a
 * fused word is Fused, a free clitic or an abbreviation is Shorthand. The
 * surfaces are what the Segment's letters stand for (m is dem, z.B. is zum
 * Beispiel); none means it keeps its own letters, as a clitic's host does.
 * `written` is set when every piece of a table fusion is a member of the
 * target (zur in zur Verfügung stellen): the unit shows the fused word as
 * written, so the piece normalizes to its authored letters.
 */
export type TableSpelling =
	| {
			readonly orthography: "Fused";
			readonly piece: FusedPiece;
			readonly surfaces: readonly string[];
			readonly written: string | undefined;
	  }
	| {
			readonly orthography: "Shorthand";
			readonly surfaces: readonly string[];
	  };

/** The Segment indices of the fused word a Segment is a piece of. */
function fusedWordIndices(encounter: Encounter, index: number) {
	const piece = fusedPieceAt(
		germanFusionTable,
		encounter.sentence.segments,
		index,
	);
	return piece
		? piece.pieces.map((_, position) => index - piece.component + position)
		: [];
}

export function tableSpelling(
	encounter: Encounter,
	index: number,
): TableSpelling | undefined {
	const { segments } = encounter.sentence;
	const piece = fusedPieceAt(germanFusionTable, segments, index);
	if (piece) {
		const indices = fusedWordIndices(encounter, index);
		const whole =
			fusedWordAt(germanFusionTable, segments, indices[0] ?? -1) !==
				undefined &&
			indices.every((position) =>
				encounter.target.memberSegmentIndices.includes(position),
			);
		return {
			orthography: "Fused",
			piece,
			surfaces: piece.pieces[piece.component]?.surfaces ?? [],
			written: whole
				? segments[index]?.text.toLocaleLowerCase("de")
				: undefined,
		};
	}
	const segment = segments[index];
	const surfaces =
		segment?.kind === "ResolvableText"
			? shorthandSurfaces(germanFusionTable, segment.text)
			: undefined;
	return surfaces && { orthography: "Shorthand", surfaces };
}

/**
 * The word each piece of the fused words a target touches stands for, keyed
 * by Segment index, once the sentence has chosen it: `'s` in `geht's` is es
 * on the verb's Attestation and on the pronoun's alike (ADR 0035).
 */
export type PieceReadings = ReadonlyMap<number, string>;

/**
 * The pieces of the fused words the target's members belong to whose table
 * entry names several words (`'s`: es or das), keyed by Segment index: the
 * candidates, the fused word, and the first member it is written onto.
 */
export function ambiguousPieces(encounter: Encounter): ReadonlyMap<
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
	for (const [
		member,
		index,
	] of encounter.target.memberSegmentIndices.entries()) {
		const piece = fusedPieceAt(
			germanFusionTable,
			encounter.sentence.segments,
			index,
		);
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
 * sentence chose when the table names several, the one it names otherwise,
 * and a host its own letters.
 */
export function attestedMember(
	encounter: Encounter,
	index: number,
	orthography: MemberOrthography,
	readings: PieceReadings,
): Member {
	const attested = encounter.sentence.segments[index]?.text;
	if (attested === undefined) throw Error(`Missing member Segment ${index}`);
	if (orthography !== "Fused") return { attested, orthography };
	const piece = fusedPieceAt(
		germanFusionTable,
		encounter.sentence.segments,
		index,
	);
	if (!piece) throw Error("A Fused member is a piece of a fused word");
	const [first, second, ...rest] = piece.pieces.map((part, position) => {
		const reading = readings.get(index - piece.component + position);
		if (reading === undefined && part.surfaces.length > 1)
			throw Error(
				`The sentence chose no reading for the piece ${part.span}`,
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
