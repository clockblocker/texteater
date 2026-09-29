import { z } from "zod";

const indexSchema = z.number().int().nonnegative();
const textSchema = z.string().min(1);

const adrIdPattern = /^(?:[a-z][a-z0-9-]*\/)?ADR-\d{4}$/u;
const ruleHashPattern = /^[0-9a-f]{16}$/u;
const reviewStatusSchema = z.enum(["Draft", "Reviewed"]);

/**
 * A case imported from Dumgen as it was, until it is reshaped into typed
 * fields. `memberSegmentIndices` places its marked words in the record.
 */
const legacyCaseSchema = z.strictObject({
	source: textSchema,
	caseId: textSchema,
	memberSegmentIndices: z.array(indexSchema).min(1).optional(),
	case: z.unknown(),
});

/**
 * The ADRs and Rules a record's annotation rests on, and outside references.
 * A Reviewed record cites at least one Rule.
 */
const sourcesSchema = z.strictObject({
	adrs: z.array(z.string().regex(adrIdPattern)),
	rules: z.array(
		z.strictObject({
			rule: textSchema,
			hash: z.string().regex(ruleHashPattern),
		}),
	),
	references: z.array(
		z.strictObject({
			title: textSchema,
			url: z.url(),
			supports: textSchema,
		}),
	),
});

/**
 * The Reading a target attests, named by its Emoji Description (ADR 0031),
 * and the Reading Knowledge it owns. Its Lemma is the target's; the loader
 * checks the Reading with Dumling's `parseUnit` and the Knowledge with
 * dumrel's `parseReadingKnowledge`.
 */
function readingSchema<K extends z.ZodType>(knowledge: K) {
	return z.strictObject({
		emojiDescription: textSchema.describe(
			"One to four emoji: the Reading's identity, as Dumling normalizes it",
		),
		knowledge: knowledge.optional(),
	});
}

const segmentsSchema = z
	.array(
		z.strictObject({
			kind: z.enum([
				"ResolvableText",
				"OpaqueText",
				"Whitespace",
				"Punctuation",
			]),
			text: textSchema,
			surface: textSchema.optional(),
		}),
	)
	.min(1);

/**
 * What a target holds that another package types: its Attestation (Dumling)
 * and its Reading Knowledge (dumrel). The loader passes `z.unknown()` and
 * checks both itself; the JSON Schema emitter passes the owners' schemas.
 */
export interface TargetSchemas<A extends z.ZodType, K extends z.ZodType> {
	attestation: A;
	knowledge: K;
}

/** One target: an Attestation, its members' Segments and its Reading. */
function targetSchema<A extends z.ZodType, K extends z.ZodType>({
	attestation,
	knowledge,
}: TargetSchemas<A, K>) {
	return z.strictObject({
		memberSegmentIndices: z.array(indexSchema).min(1),
		attestation,
		reading: readingSchema(knowledge).optional(),
		grundform: z.boolean().optional(),
		notes: z
			.strictObject({
				rationale: textSchema.optional(),
				knownMistakes: z.array(textSchema).optional(),
			})
			.optional(),
	});
}

/**
 * The shape of one record file. The loader validates Attestations with
 * Dumling's `parseUnit` and Reading Knowledge with dumrel; the JSON Schema
 * emitter passes Dumling's Attestation schemas and dumrel's Reading Knowledge
 * schema so editors can complete them.
 */
export function recordFileSchema<A extends z.ZodType, K extends z.ZodType>(
	target: TargetSchemas<A, K>,
) {
	return z.strictObject({
		$schema: z.string().optional(),
		sentence: textSchema,
		segments: segmentsSchema,
		coverage: z.enum(["Full", "Partial"]),
		status: reviewStatusSchema,
		provenance: z.discriminatedUnion("kind", [
			z.strictObject({ kind: z.literal("Authored") }),
			z.strictObject({
				kind: z.literal("Quoted"),
				work: textSchema,
				author: textSchema,
				year: z.number().int(),
			}),
		]),
		sources: sourcesSchema,
		targets: z.array(targetSchema(target)),
		noTarget: z.array(
			z.strictObject({ segment: indexSchema, reason: textSchema }),
		),
		legacy: z.array(legacyCaseSchema).optional(),
	});
}

/**
 * The shape of one Breakdown Record file under `records/breakdown/`: the
 * multiword Lemma, its wording as the sentence, and the wording's Lexeme
 * targets. The loader validates the Lemma and Attestations with Dumling's
 * `parseUnit` and Reading Knowledge with dumrel; the JSON Schema emitter
 * passes Dumling's Locution and Saying Lemma schemas, its Lexeme Attestation
 * schemas and dumrel's Reading Knowledge schema.
 */
export function breakdownRecordFileSchema<
	L extends z.ZodType,
	A extends z.ZodType,
	K extends z.ZodType,
>(lemma: L, target: TargetSchemas<A, K>) {
	return z.strictObject({
		$schema: z.string().optional(),
		lemma,
		sentence: textSchema,
		segments: segmentsSchema,
		status: reviewStatusSchema,
		sources: sourcesSchema,
		targets: z.array(targetSchema(target)),
	});
}

/** The shape of one Text Record file under `records/text/`. */
export const textRecordFileSchema = z.strictObject({
	$schema: z.string().optional(),
	sourceText: z.string().min(1),
	status: reviewStatusSchema,
	sources: sourcesSchema.optional(),
	legacy: z.array(legacyCaseSchema).optional(),
});
