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
 * The Reading a target attests, named by its Emoji Description (ADR 0031).
 * Its Lemma is the target's; the loader checks the Reading with Dumling's
 * `parseUnit`.
 */
const readingSchema = z.strictObject({
	emojiDescription: textSchema.describe(
		"One to four emoji: the Reading's identity, as Dumling normalizes it",
	),
});

/**
 * The shape of one record file. The loader validates Attestations with
 * Dumling's `parseUnit`; the JSON Schema emitter passes Dumling's Attestation
 * schemas so editors can complete them.
 */
export function recordFileSchema<A extends z.ZodType>(attestation: A) {
	return z.strictObject({
		$schema: z.string().optional(),
		sentence: textSchema,
		segments: z
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
			.min(1),
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
		sources: z.strictObject({
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
		}),
		targets: z.array(
			z.strictObject({
				memberSegmentIndices: z.array(indexSchema).min(1),
				attestation,
				reading: readingSchema.optional(),
				grundform: z.boolean().optional(),
				notes: z
					.strictObject({
						rationale: textSchema.optional(),
						knownMistakes: z.array(textSchema).optional(),
					})
					.optional(),
			}),
		),
		noTarget: z.array(
			z.strictObject({ segment: indexSchema, reason: textSchema }),
		),
		legacy: z.array(legacyCaseSchema).optional(),
	});
}

/** The shape of one Text Record file under `records/text/`. */
export const textRecordFileSchema = z.strictObject({
	$schema: z.string().optional(),
	sourceText: z.string().min(1),
	status: reviewStatusSchema,
	legacy: z.array(legacyCaseSchema).optional(),
});
