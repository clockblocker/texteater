import { z } from "zod";

const indexSchema = z.number().int().nonnegative();
const textSchema = z.string().min(1);

const adrIdPattern = /^(?:[a-z][a-z0-9-]*\/)?ADR-\d{4}$/u;
const ruleHashPattern = /^[0-9a-f]{16}$/u;
const reviewStatusSchema = z.enum(["Draft", "Reviewed"]);

/**
 * A sentence record's Review Depth: the deepest Annotation Layer a person has
 * reviewed, every layer before it included. A record without one is a Draft.
 */
const reviewDepthSchema = z
	.enum(["Segmentation", "Attestation", "Reading", "Knowledge"])
	.describe(
		"The deepest Annotation Layer a person has reviewed, every layer before it included: Segmentation (members, routes, No Target entries, coverage), Attestation, Reading, Knowledge. Leave it out for a Draft.",
	)
	.optional();

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

const coverageStatusSchema = z
	.enum(["Authored", "ReviewedEmpty"])
	.describe(
		"Authored: the Knowledge holds this aspect. ReviewedEmpty: a person reviewed it and it has none.",
	)
	.optional();

/**
 * Which Knowledge aspects of a Reading a person has covered, one status per
 * aspect, per translation language and per semantic relation, as the
 * Authored Inventory records it. An aspect left out is unreviewed, so an
 * aspect a Knowledge Policy adds later never reads as reviewed and empty.
 */
export const knowledgeCoverageSchema = z
	.strictObject({
		transcription: coverageStatusSchema,
		definition: coverageStatusSchema,
		translations: z
			.strictObject({
				en: coverageStatusSchema,
				ru: coverageStatusSchema,
			})
			.optional(),
		morphologicalTree: coverageStatusSchema,
		semanticRelations: z
			.strictObject({
				synonym: coverageStatusSchema,
				nearSynonym: coverageStatusSchema,
				antonym: coverageStatusSchema,
				nearAntonym: coverageStatusSchema,
				hypernym: coverageStatusSchema,
				holonym: coverageStatusSchema,
				endonym: coverageStatusSchema,
			})
			.optional(),
		valency: coverageStatusSchema,
		participleSource: coverageStatusSchema,
		plural: coverageStatusSchema,
		conjugationClass: coverageStatusSchema,
		locutionType: coverageStatusSchema,
		sayingType: coverageStatusSchema,
		formulaRole: coverageStatusSchema,
	})
	.describe(
		"Which Knowledge aspects a person has covered: Authored when `knowledge` holds the aspect, ReviewedEmpty when it has none. Leave an unreviewed aspect out.",
	);

/**
 * The Reading a target attests, named by its Emoji Description (ADR 0031),
 * the Reading Knowledge it owns and which aspects of it a person has
 * covered. A Foreign Reading has no Emoji Description (ADR 0045). Its Lemma
 * is the target's; the loader checks the Reading with Dumling's `parseUnit`
 * and the Knowledge with dumrel's `parseReadingKnowledge`.
 */
function readingSchema<K extends z.ZodType>(knowledge: K) {
	return z.strictObject({
		emojiDescription: textSchema
			.describe(
				"One to four emoji: the Reading's identity, as Dumling normalizes it. A Foreign Reading has none.",
			)
			.optional(),
		knowledge: knowledge.optional(),
		coverage: knowledgeCoverageSchema.optional(),
	});
}

/**
 * A target's route as the loader reads it: any Family and Kind, which it
 * checks against Dumling's routes for the record's language.
 */
export const looseRouteSchema = z.strictObject({
	family: textSchema,
	kind: textSchema,
});

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
 * What a target holds that another package types: its route (Dumling's
 * Families and Kinds), its Attestation (Dumling) and its Reading Knowledge
 * (dumrel). The loader passes loose schemas and checks all three itself; the
 * JSON Schema emitter passes the owners' schemas.
 */
export interface TargetSchemas<
	R extends z.ZodType,
	A extends z.ZodType,
	K extends z.ZodType,
> {
	route: R;
	attestation: A;
	knowledge: K;
}

/**
 * One target: its members' Segments and route, which are its Segmentation,
 * then its Attestation and its Reading. A target may lack its Attestation
 * while its record is reviewed no deeper than Segmentation.
 */
function targetSchema<
	R extends z.ZodType,
	A extends z.ZodType,
	K extends z.ZodType,
>({ route, attestation, knowledge }: TargetSchemas<R, A, K>) {
	return z.strictObject({
		memberSegmentIndices: z.array(indexSchema).min(1),
		route: route.describe(
			"The target's Family and Kind in the record's language; its Attestation's Lemma has the same.",
		),
		attestation: attestation.optional(),
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
export function recordFileSchema<
	R extends z.ZodType,
	A extends z.ZodType,
	K extends z.ZodType,
>(target: TargetSchemas<R, A, K>) {
	return z.strictObject({
		$schema: z.string().optional(),
		sentence: textSchema,
		segments: segmentsSchema,
		coverage: z.enum(["Full", "Partial"]),
		reviewDepth: reviewDepthSchema,
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
			z.strictObject({
				memberSegmentIndices: z
					.array(indexSchema)
					.min(1)
					.describe(
						"The Segments with no defensible route, in sentence order: one word, or a nonce noun with the article it owns, such as [der, Blarg].",
					),
				reason: textSchema,
			}),
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
	R extends z.ZodType,
	A extends z.ZodType,
	K extends z.ZodType,
>(lemma: L, target: TargetSchemas<R, A, K>) {
	return z.strictObject({
		$schema: z.string().optional(),
		lemma,
		sentence: textSchema,
		segments: segmentsSchema,
		reviewDepth: reviewDepthSchema,
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
