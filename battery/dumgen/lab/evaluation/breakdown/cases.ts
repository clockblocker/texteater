/**
 * The Breakdown segmenters' gold (Dumgen ADR 0007): dumcorpus's Breakdown
 * Records as cases. Every record without a Source is a
 * `segment.inConstituents` case: its Constituents, or none for a bottom
 * word. A Reading with a Source runs neither segmenter, since the host asks
 * Knowledge for the Source first (system ADR 0050), so its record is no
 * case. A record that holds a bottom word's morphemes is also a
 * `segment.inMorphemes` case.
 *
 * The records dumcorpus's held-out batches list (`batches/breakdown-heldout-*.json`)
 * are `segment.inConstituents`'s held-out sets, each batch naming its own
 * (#1241 round 5): `realtext`, targets sampled at random from the sentences
 * tf-demo's Learners read, with gold authored after sampling, the headline;
 * and `adversarial`, hard homographs and edge cases, reported apart. Every
 * other case is `breakdown`, the set prompts are tuned on, and a held-out
 * bottom word is its set's `segment.inMorphemes` case too. A held-out record
 * is never a prompt's example (#693).
 *
 * A gold target is a Lemma or a Unit Shadow and a produced one a Unit
 * Shadow, so both are read as a Shadow: route and Canonical Form.
 */
import { readdirSync, readFileSync } from "node:fs";
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

/**
 * A case's input: the Reading as the record owns it and, for a constituents
 * case, the record's authored definition, which the host would pass from
 * Knowledge. The definition is an input, never graded.
 */
export const breakdownInputSchema = z.strictObject({
	reading: z.custom<Dumcorpus.BreakdownRecord["reading"]>(
		(value) => typeof value === "object" && value !== null,
	),
	definition: z.string().optional(),
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

/** The held-out sets a Breakdown held-out batch may name. */
export const heldOutSetNames = ["realtext", "adversarial"] as const;

export type HeldOutSetName = (typeof heldOutSetNames)[number];

/** A constituents set: the cases prompts are tuned on, or a held-out one. */
export type BreakdownSetName = "breakdown" | HeldOutSetName;

const batchesDirectory = new URL(
	"../../../../dumcorpus/batches/",
	import.meta.url,
);

const heldOutBatchSchema = z.object({
	/** The held-out set the batch's held-out rows belong to. */
	set: z.enum(heldOutSetNames).optional(),
	rows: z.array(z.object({ record: z.string(), split: z.string() })),
});

/**
 * The record ids dumcorpus's Breakdown held-out batches mark held-out, each
 * with the held-out set its batch names. A batch with a held-out row and no
 * set throws.
 */
export function heldOutBreakdownIds(
	directory: URL = batchesDirectory,
): ReadonlyMap<string, HeldOutSetName> {
	const ids = new Map<string, HeldOutSetName>();
	for (const name of readdirSync(directory)) {
		if (!/^breakdown-heldout-.*\.json$/u.test(name)) continue;
		const batch = heldOutBatchSchema.parse(
			JSON.parse(readFileSync(new URL(name, directory), "utf8")),
		);
		for (const { record, split } of batch.rows) {
			if (split !== "held-out") continue;
			if (batch.set === undefined)
				throw Error(
					`${name} holds the held-out row ${record} but names no held-out set`,
				);
			ids.set(record, batch.set);
		}
	}
	return ids;
}

const groupOf = (record: Dumcorpus.BreakdownRecord) => {
	const { family, canonicalForm } = record.reading.lemma;
	return family === "Lexeme" && !/\s/u.test(canonicalForm)
		? "word"
		: "phraseme";
};

/**
 * Every record without a Source in `set` as a `segment.inConstituents`
 * case, sorted by id.
 */
export function constituentsCases(
	set: BreakdownSetName = "breakdown",
	records: readonly Dumcorpus.BreakdownRecord[] = loadBreakdownRecords(),
	heldOut: ReadonlyMap<string, HeldOutSetName> = heldOutBreakdownIds(),
): BreakdownCase<ConstituentsOutput>[] {
	return records.flatMap((record) => {
		if (record.knowledge.source !== undefined) return [];
		if ((heldOut.get(record.id) ?? "breakdown") !== set) return [];
		const constituents = record.knowledge.breakdown?.constituents;
		const goldCase: BreakdownCase<ConstituentsOutput> = {
			id: record.id,
			input: {
				reading: record.reading,
				...(record.definition === undefined
					? {}
					: { definition: record.definition }),
			},
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

/**
 * The records in `set` that hold a bottom word's morphemes, as
 * `segment.inMorphemes` cases: a held-out batch's bottom words are its
 * set's, as its Constituents cases are.
 */
export function morphemesCases(
	set: BreakdownSetName = "breakdown",
	records: readonly Dumcorpus.BreakdownRecord[] = loadBreakdownRecords(),
	heldOut: ReadonlyMap<string, HeldOutSetName> = heldOutBreakdownIds(),
): BreakdownCase<MorphemesOutput>[] {
	return records.flatMap((record) => {
		const morphemes = record.knowledge.breakdown?.morphemes;
		return morphemes === undefined ||
			(heldOut.get(record.id) ?? "breakdown") !== set
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
