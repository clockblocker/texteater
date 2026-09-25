import type * as Dumling from "dumling/types";
import type { Encounter } from "../../../types.js";
import {
	type FusedPiece,
	fusedPieceAt,
	shorthandSurfaces,
} from "../../../universal/fusion-table.js";
import { germanFusionTable } from "../fusion-entries.js";

type Member = Dumling.Attestation["members"][number];
export type MemberOrthography = Member["orthography"];

/**
 * A Segment whose spelling the fusion table settles (ADR 0035): a piece of a
 * fused word is Fused, a free clitic or an abbreviation is Shorthand. The
 * surfaces are what the Segment's letters stand for; none means it keeps its
 * own letters, as a clitic's host or an abbreviation does.
 */
export type TableSpelling =
	| {
			readonly orthography: "Fused";
			readonly piece: FusedPiece;
			readonly surfaces: readonly string[];
	  }
	| {
			readonly orthography: "Shorthand";
			readonly surfaces: readonly string[];
	  };

export function tableSpelling(
	encounter: Encounter,
	index: number,
): TableSpelling | undefined {
	const { segments } = encounter.sentence;
	const piece = fusedPieceAt(germanFusionTable, segments, index);
	if (piece)
		return {
			orthography: "Fused",
			piece,
			surfaces: piece.pieces[piece.component]?.surfaces ?? [],
		};
	const segment = segments[index];
	const surfaces =
		segment?.kind === "ResolvableText"
			? shorthandSurfaces(germanFusionTable, segment.text)
			: undefined;
	return surfaces && { orthography: "Shorthand", surfaces };
}

/**
 * The Attestation member a Segment realizes. A Fused member carries its
 * Fusion: its own piece stands for `surface`, a host for its own letters, and
 * another piece with several authored surfaces shows the first, since the
 * Attestation that owns that piece decides it.
 */
export function attestedMember(
	encounter: Encounter,
	index: number,
	orthography: MemberOrthography,
	surface: string,
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
	const [first, second, ...rest] = piece.pieces.map((part, position) => ({
		span: part.span,
		surface:
			position === piece.component
				? surface
				: (part.surfaces[0] ?? part.span),
	}));
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
