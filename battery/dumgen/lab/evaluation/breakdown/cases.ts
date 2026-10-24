/**
 * The Breakdown segmenters' gold (Dumgen ADR 0007): dumcorpus's Breakdown
 * Records as cases. Every record without a Source is a
 * `segment.inConstituents` case: its Constituents, or none for a bottom
 * word. A Reading with a Source runs neither segmenter, since the host asks
 * Knowledge for the Source first (system ADR 0050), so its record is no
 * case. A record that holds a bottom word's morphemes is also a
 * `segment.inMorphemes` case.
 *
 * A gold target is a Lemma or a Unit Shadow and a produced one a Unit
 * Shadow, so both are read as a Shadow: route and Canonical Form.
 */
import { loadBreakdownRecords } from "dumcorpus";
import type * as Dumcorpus from "dumcorpus/types";
import type * as Dumrel from "dumrel/types";
import { z } from "zod";

const shadowSchema = z.strictObject({
	language: z.string(),
	family: z.string(),
	kind: z.string(),
	canonicalForm: z.string(),
});

const pieceSchema = z.strictObject({
	letters: z.string(),
	target: shadowSchema.optional(),
});

export type BreakdownPiece = z.infer<typeof pieceSchema>;

/** A case's input: the Reading as the record owns it. */
export const breakdownInputSchema = z.strictObject({
	reading: z.custom<Dumcorpus.BreakdownRecord["reading"]>(
		(value) => typeof value === "object" && value !== null,
	),
});

export const constituentsOutputSchema = z.discriminatedUnion("kind", [
	z.strictObject({
		kind: z.literal("Constituents"),
		pieces: z.array(pieceSchema),
	}),
	z.strictObject({ kind: z.literal("NoConstituents") }),
]);

export const morphemesOutputSchema = z.strictObject({
	pieces: z.array(pieceSchema),
});

export type ConstituentsOutput = z.infer<typeof constituentsOutputSchema>;
export type MorphemesOutput = z.infer<typeof morphemesOutputSchema>;

/** A piece as the evaluation compares it: its target read as a Shadow. */
export const comparablePiece = (piece: {
	readonly letters: string;
	readonly target?: Dumrel.LinkTarget | Dumrel.UnitShadow;
}): BreakdownPiece =>
	piece.target === undefined
		? { letters: piece.letters }
		: {
				letters: piece.letters,
				target: {
					language: piece.target.language,
					family: piece.target.family,
					kind: piece.target.kind,
					canonicalForm: piece.target.canonicalForm,
				},
			};

export type BreakdownCase<O> = {
	readonly id: string;
	readonly input: z.input<typeof breakdownInputSchema>;
	readonly idealOutput: O;
	/** `phraseme` or `word`, for the rates by kind. */
	readonly group: "phraseme" | "word";
};

const groupOf = (record: Dumcorpus.BreakdownRecord) => {
	const { family, canonicalForm } = record.reading.lemma;
	return family === "Lexeme" && !/\s/u.test(canonicalForm)
		? "word"
		: "phraseme";
};

/** Every record without a Source as a `segment.inConstituents` case, sorted by id. */
export function constituentsCases(
	records: readonly Dumcorpus.BreakdownRecord[] = loadBreakdownRecords(),
): BreakdownCase<ConstituentsOutput>[] {
	return records.flatMap((record) => {
		if (record.knowledge.source !== undefined) return [];
		const constituents = record.knowledge.breakdown?.constituents;
		const goldCase: BreakdownCase<ConstituentsOutput> = {
			id: record.id,
			input: { reading: record.reading },
			idealOutput:
				constituents === undefined
					? { kind: "NoConstituents" }
					: {
							kind: "Constituents",
							pieces: constituents.map(comparablePiece),
						},
			group: groupOf(record),
		};
		return [goldCase];
	});
}

/** The records that hold a bottom word's morphemes, as `segment.inMorphemes` cases. */
export function morphemesCases(
	records: readonly Dumcorpus.BreakdownRecord[] = loadBreakdownRecords(),
): BreakdownCase<MorphemesOutput>[] {
	return records.flatMap((record) => {
		const morphemes = record.knowledge.breakdown?.morphemes;
		return morphemes === undefined
			? []
			: [
					{
						id: record.id,
						input: { reading: record.reading },
						idealOutput: { pieces: morphemes.map(comparablePiece) },
						group: groupOf(record),
					},
				];
	});
}
