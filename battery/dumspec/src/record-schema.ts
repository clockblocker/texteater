import { z } from "zod";

const indexSchema = z.number().int().nonnegative();
const textSchema = z.string().min(1);

const adrIdPattern = /^(?:[a-z][a-z0-9-]*\/)?ADR-\d{4}$/u;
const ruleHashPattern = /^[0-9a-f]{16}$/u;

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
		status: z.enum(["Draft", "Reviewed"]),
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
	});
}
