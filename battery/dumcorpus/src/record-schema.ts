import { dimensionIdValues } from "dumrel";
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
		breakdown: coverageStatusSchema,
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
		source: coverageStatusSchema,
		locutionType: coverageStatusSchema,
		sayingType: coverageStatusSchema,
		formulaRole: coverageStatusSchema,
		paradigm: z
			.strictObject(
				Object.fromEntries(
					dimensionIdValues.map((dimension) => [
						dimension,
						coverageStatusSchema,
					]),
				) as Record<
					(typeof dimensionIdValues)[number],
					typeof coverageStatusSchema
				>,
			)
			.describe(
				"Which Variation Dimensions of the Lemma's Paradigm a person has covered: Authored when `paradigm` holds the dimension, ReviewedEmpty when this Reading takes none.",
			)
			.optional(),
	})
	.describe(
		"Which Knowledge aspects and Variation Dimensions a person has covered: Authored when `knowledge` or `paradigm` holds one, ReviewedEmpty when it has none. Leave an unreviewed one out.",
	);

/**
 * What the Reading licenses in its Lemma's Paradigm (ADR 0048): per
 * Variation Dimension its route's Paradigm Policy names, the forms or the
 * marker its sense takes, each cited as a dictionary cites it (ADR 0038).
 * The loader checks them with dumrel; a Lemma's Paradigm is its Readings'
 * forms pooled.
 */
const readingParadigmSchema = z
	.partialRecord(z.enum(dimensionIdValues), z.array(textSchema).min(1))
	.describe(
		"The forms, or the marker, this Reading licenses per Variation Dimension of its Lemma's Paradigm: plural (Pizzen, or NoPlural), preterite (stand auf), present1, present2, present3, pastParticiple, subjunctivePast.",
	);

/**
 * The Reading a target attests, named by its Emoji Description (ADR 0031),
 * the Reading Knowledge it owns, what it licenses in its Lemma's Paradigm,
 * and which of them a person has covered. A Foreign Reading has no Emoji Description (ADR 0045). Its Lemma
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
		paradigm: readingParadigmSchema.optional(),
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

/** Why an annotation is as it is, and what models get wrong about it. */
const notesSchema = z.strictObject({
	rationale: textSchema.optional(),
	knownMistakes: z.array(textSchema).optional(),
});

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
		notes: notesSchema.optional(),
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
 * What a Breakdown Record holds that another package types: its owning
 * Reading (Dumling) and its Breakdown and Source (dumrel). The loader passes
 * loose schemas and checks both itself; the JSON Schema emitter passes the
 * owners' schemas.
 */
export interface BreakdownSchemas<
	R extends z.ZodType,
	B extends z.ZodType,
	S extends z.ZodType,
> {
	reading: R;
	breakdown: B;
	source: S;
}

/**
 * The shape of one Breakdown Record file under `records/breakdown/` (ADR
 * 0050): the Reading that owns it and that Reading's Breakdown or Source,
 * the Knowledge aspects as dumrel stores them. Its parts carry no Surface and
 * no Reading, so a person reviews it at Segmentation only (ADR 0037).
 */
export function breakdownRecordFileSchema<
	R extends z.ZodType,
	B extends z.ZodType,
	S extends z.ZodType,
>({ reading, breakdown, source }: BreakdownSchemas<R, B, S>) {
	return z.strictObject({
		$schema: z.string().optional(),
		reading: reading.describe(
			"The Reading that owns the Breakdown: its Lemma and Emoji Description, as Dumling normalizes them.",
		),
		definition: z
			.string()
			.min(1)
			.describe(
				"An authored definition of the Reading's sense, one short German paraphrase as Knowledge writes one (mit etwas zusammenhängen), from a dictionary's entry for that sense. segment.inConstituents's case reads it as the definition the host passes; it is an input, never graded.",
			)
			.optional(),
		knowledge: z
			.strictObject({
				breakdown: breakdown
					.describe(
						"The Reading's Constituents, its Morphemic Breakdown, or both: pieces of shown letters, each linked to a Unit Shadow or a Lemma, or unlinked filler.",
					)
					.optional(),
				source: source
					.describe(
						"The immediate base of a formation whose letters can't be cut into pieces: a conversion, participle, acronym or clipping.",
					)
					.optional(),
			})
			.describe(
				"The owning Reading's Breakdown or Source, as dumrel stores them.",
			),
		reviewDepth: z
			.literal("Segmentation")
			.describe(
				"Segmentation once a person has reviewed the pieces and their links. Leave it out for a Draft.",
			)
			.optional(),
		sources: sourcesSchema,
		notes: notesSchema.optional(),
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
