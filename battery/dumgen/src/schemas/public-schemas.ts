import { schemasFor } from "dumling/schema";
import type { Attestation } from "dumling/types";
import { type ZodType, z } from "zod";
import { DE_GRAMMATICAL_RESOLUTION_ROUTE_KINDS } from "../schema/de-grammatical-resolution-inventory";
import {
	enabledSegmentationLanguageValues,
	grammaticalResolutionLanguageValues,
	segmentKindValues,
} from "../vocabulary";

export const enabledSegmentationLanguageSchema = z.enum(
	enabledSegmentationLanguageValues,
);

export const grammaticalResolutionLanguageSchema = z.literal(
	grammaticalResolutionLanguageValues[0],
);

export const segmentedSentenceIdSchema = z
	.string()
	.min(1)
	.brand<"SegmentedSentenceId">();

export const segmentKindSchema = z.enum(segmentKindValues);

export const segmentSchema = z
	.strictObject({
		text: z.string().min(1),
		kind: segmentKindSchema,
	})
	.superRefine((segment, context) => {
		if (segment.kind === "Whitespace" && segment.text !== " ") {
			context.addIssue({
				code: "custom",
				message:
					"Whitespace Segments must contain exactly one ASCII space.",
				path: ["text"],
			});
		}
	})
	.readonly();

const segmentArraySchema = z.array(segmentSchema).min(1).readonly();

const germanSegmentedSentenceSchema = segmentedSentenceSchemaFor("de");
const hebrewSegmentedSentenceSchema = segmentedSentenceSchemaFor("he");

export const segmentedSentenceSchema = z.union([
	germanSegmentedSentenceSchema,
	hebrewSegmentedSentenceSchema,
]);

const acceptedGermanSegmentationDecisionSchema = z
	.strictObject({
		decision: z.literal("Accepted"),
		language: z.literal("de"),
		sentence: germanSegmentedSentenceSchema,
	})
	.readonly();

const acceptedHebrewSegmentationDecisionSchema = z
	.strictObject({
		decision: z.literal("Accepted"),
		language: z.literal("he"),
		sentence: hebrewSegmentedSentenceSchema,
	})
	.readonly();

const unsupportedLanguageDecisionSchema = z
	.strictObject({ decision: z.literal("UnsupportedLanguage") })
	.readonly();

const unintelligibleDecisionSchema = z
	.strictObject({ decision: z.literal("Unintelligible") })
	.readonly();

export const segmentationDecisionSchema = z.union([
	acceptedGermanSegmentationDecisionSchema,
	acceptedHebrewSegmentationDecisionSchema,
	unsupportedLanguageDecisionSchema,
	unintelligibleDecisionSchema,
]);

const dumgenErrorCodeSchema = z.enum([
	"refusal",
	"max-output-tokens",
	"content-filter",
	"provider-error",
	"invalid-input",
	"invalid-output",
]);

export const section1ErrorSchema = z.union([
	z
		.strictObject({
			code: z.literal("InvalidInput"),
			message: z.string(),
			itemIndex: z.number().int().nonnegative().optional(),
		})
		.readonly(),
	z
		.strictObject({
			code: z.literal("IntakeFailure"),
			reason: dumgenErrorCodeSchema,
			message: z.string(),
		})
		.readonly(),
]);

export const segmentationResultSchema = z.union([
	z
		.strictObject({
			ok: z.literal(true),
			value: z.array(segmentationDecisionSchema).min(1).readonly(),
		})
		.readonly(),
	z
		.strictObject({
			ok: z.literal(false),
			error: section1ErrorSchema,
		})
		.readonly(),
]);

const segmentIndexSchema = z.number().int().nonnegative();

export const grammaticalRouteSchema = z.union([
	z
		.strictObject({
			family: z.literal("Lexeme"),
			kind: z.enum([
				...DE_GRAMMATICAL_RESOLUTION_ROUTE_KINDS.Lexeme.enabled,
				...DE_GRAMMATICAL_RESOLUTION_ROUTE_KINDS.Lexeme.notImplemented,
			]),
		})
		.readonly(),
	z
		.strictObject({
			family: z.literal("Phraseme"),
			kind: z.enum([
				...DE_GRAMMATICAL_RESOLUTION_ROUTE_KINDS.Phraseme.enabled,
				...DE_GRAMMATICAL_RESOLUTION_ROUTE_KINDS.Phraseme
					.notImplemented,
			]),
		})
		.readonly(),
	z
		.strictObject({
			family: z.literal("Morpheme"),
			kind: z.enum([
				...DE_GRAMMATICAL_RESOLUTION_ROUTE_KINDS.Morpheme.enabled,
				...DE_GRAMMATICAL_RESOLUTION_ROUTE_KINDS.Morpheme
					.notImplemented,
			]),
		})
		.readonly(),
	z
		.strictObject({
			family: z.literal("Construction"),
			kind: z.enum([
				...DE_GRAMMATICAL_RESOLUTION_ROUTE_KINDS.Construction.enabled,
				...DE_GRAMMATICAL_RESOLUTION_ROUTE_KINDS.Construction
					.notImplemented,
			]),
		})
		.readonly(),
]);

export const grammaticalInteractionSchema = z
	.strictObject({
		segmentedSentenceId: segmentedSentenceIdSchema,
		clickedSegmentIndex: segmentIndexSchema,
		memberSegmentIndices: z
			.tuple([segmentIndexSchema], segmentIndexSchema)
			.readonly(),
	})
	.superRefine((interaction, context) => {
		if (
			!interaction.memberSegmentIndices.includes(
				interaction.clickedSegmentIndex,
			)
		) {
			context.addIssue({
				code: "custom",
				message:
					"Interaction membership must include the clicked Segment.",
				path: ["memberSegmentIndices"],
			});
		}
		if (
			interaction.memberSegmentIndices.some(
				(index, position, indices) =>
					position > 0 && index <= (indices[position - 1] ?? -1),
			)
		) {
			context.addIssue({
				code: "custom",
				message:
					"Interaction membership must be ordered and contain no duplicates.",
				path: ["memberSegmentIndices"],
			});
		}
	})
	.readonly();

export const grammaticalInputSchema = z
	.strictObject({
		sentence: germanSegmentedSentenceSchema,
		clickedSegmentIndex: segmentIndexSchema,
	})
	.superRefine((input, context) => {
		if (
			input.sentence.segments[input.clickedSegmentIndex]?.kind !==
			"ResolvableText"
		) {
			context.addIssue({
				code: "custom",
				message:
					"The clicked index must reference a ResolvableText Segment.",
				path: ["clickedSegmentIndex"],
			});
		}
	})
	.readonly();

const germanAttestationSchema = buildGermanAttestationSchema();

export const resolvedGrammaticalResultSchema = z
	.strictObject({
		decision: z.literal("Resolved"),
		language: grammaticalResolutionLanguageSchema,
		markedContext: z.string().min(1),
		attestation: germanAttestationSchema,
		interaction: grammaticalInteractionSchema,
	})
	.readonly();

export const notImplementedGrammaticalResultSchema = z
	.strictObject({
		decision: z.literal("NotImplemented"),
		language: grammaticalResolutionLanguageSchema,
		route: grammaticalRouteSchema,
	})
	.readonly();

export const unresolvedGrammaticalResultSchema = z
	.strictObject({
		decision: z.literal("Unresolved"),
		language: grammaticalResolutionLanguageSchema,
	})
	.readonly();

export const grammaticalResultSchema = z.union([
	resolvedGrammaticalResultSchema,
	notImplementedGrammaticalResultSchema,
	unresolvedGrammaticalResultSchema,
]);

function segmentedSentenceSchemaFor<const L extends "de" | "he">(language: L) {
	return z
		.strictObject({
			id: segmentedSentenceIdSchema,
			language: z.literal(language),
			segments: segmentArraySchema,
		})
		.readonly();
}

function buildGermanAttestationSchema(): ZodType<Attestation<"de">> {
	type AttestationSchemaGetter = () => ZodType<Attestation<"de">>;
	const registry = schemasFor.de.entity.Attestation as unknown as Record<
		string,
		Record<string, Record<string, AttestationSchemaGetter>>
	>;
	const schemas = Object.values(registry).flatMap((families) =>
		Object.values(families).flatMap((kinds) =>
			Object.values(kinds).map((getSchema) => getSchema()),
		),
	);
	const [first, ...rest] = schemas;
	if (!first) {
		throw new Error(
			"Dumling exposes no German Attestation schemas for Grammatical Results.",
		);
	}
	return z.union([first, ...rest]);
}
