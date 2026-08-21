import { createHash } from "node:crypto";
import type { LexicalUnitShadow } from "dumrel";
import { lexicalUnitShadowSchema } from "dumrel/schema";
import { type ZodType, z } from "zod";

import { knowledgeGenerationInputSchema } from "../../schemas/public-schemas";
import { requestableRelationSchema } from "../relations";
import type {
	GermanKnowledgeAnalysis,
	GermanKnowledgeGenerationInput,
} from "./runtime-schema";

export type {
	GermanKnowledgeAnalysis,
	GermanKnowledgeGenerationInput,
	GermanKnowledgeGenerationRequest,
} from "./runtime-schema";

const normalizedCandidateSchema = z
	.string()
	.trim()
	.min(1)
	.overwrite((value) => value.normalize("NFC"));

const germanLexicalUnitShadowSchema = lexicalUnitShadowSchema.refine(
	(shadow) => shadow.language === "de",
	{
		path: ["language"],
		message: "German Knowledge relations must target German Unit Shadows.",
	},
) as ZodType<LexicalUnitShadow<"de">>;

type SchemaInternals = ZodType & {
	readonly _zod: {
		readonly def: {
			readonly in?: ZodType;
			readonly out?: SchemaInternals;
			readonly transform?: (value: unknown) => unknown;
			readonly type: string;
		};
	};
};

function stripExactDumrelIdentityBinding<Output>(
	schema: ZodType<Output>,
	binding: Readonly<{
		fingerprint: string;
		name: string;
		version: 1;
	}>,
): ZodType<Output> {
	const definition = (schema as SchemaInternals)._zod.def;
	const transform = definition.out?._zod.def.transform;
	if (
		definition.type !== "pipe" ||
		definition.out?._zod.def.type !== "transform" ||
		definition.in === undefined ||
		transform === undefined ||
		transform.name !== binding.name ||
		binding.version !== 1 ||
		createHash("sha256").update(String(transform)).digest("hex") !==
			binding.fingerprint
	)
		throw new TypeError(
			`Dumrel provider identity binding drifted: ${binding.name}.`,
		);
	return definition.in as ZodType<Output>;
}

const providerLexicalUnitShadowBaseSchema = stripExactDumrelIdentityBinding(
	stripExactDumrelIdentityBinding(lexicalUnitShadowSchema, {
		fingerprint:
			"3e049fe1f7f12c89a24fd88e7b823c3f5068464e358da183dd9d8e8b9050c7f5",
		name: "bindLexicalUnitShadow",
		version: 1,
	}),
	{
		fingerprint:
			"6db10bbb770dfa5af2b3fef9209496c3906d01c53a63db424747f1498643bf37",
		name: "bindSupportedUnitShadow",
		version: 1,
	},
);

const providerLexicalUnitShadowSchema =
	providerLexicalUnitShadowBaseSchema.refine(
		(shadow) => shadow.language === "de",
		{
			path: ["language"],
			message:
				"German Knowledge relations must target German Unit Shadows.",
		},
	);

export const germanKnowledgeGenerationInputSchema =
	knowledgeGenerationInputSchema;

export const germanKnowledgeAnalysisSchema = z.strictObject({
	transcription: normalizedCandidateSchema.nullable().optional(),
	definition: normalizedCandidateSchema.nullable().optional(),
	translations: z
		.strictObject({ en: normalizedCandidateSchema.nullable().optional() })
		.optional(),
	semanticRelations: z
		.partialRecord(
			requestableRelationSchema,
			z.array(germanLexicalUnitShadowSchema).min(1).max(5).nullable(),
		)
		.optional(),
}) as ZodType<GermanKnowledgeAnalysis>;

/**
 * Builds the exact strict Structured Outputs schema for one sparse request.
 * Every selected leaf is required and nullable; no unselected property exists.
 */
export function modelOutputSchemaForGermanKnowledge(
	rawInput: GermanKnowledgeGenerationInput,
): ZodType<GermanKnowledgeAnalysis> {
	const input = germanKnowledgeGenerationInputSchema.parse(rawInput);
	const request = input.request;
	const shape: Record<string, ZodType> = {};

	if ("transcription" in request) {
		shape.transcription = normalizedCandidateSchema.nullable();
	}
	if ("definition" in request) {
		shape.definition = normalizedCandidateSchema.nullable();
	}
	if (request.translations !== undefined) {
		shape.translations = z.strictObject({
			en: normalizedCandidateSchema.nullable(),
		});
	}
	if (request.semanticRelations !== undefined) {
		const relationShape: Record<string, ZodType> = {};
		for (const relation of requestableRelationSchema.options) {
			if (relation in request.semanticRelations) {
				relationShape[relation] = z
					.array(providerLexicalUnitShadowSchema)
					.min(1)
					.max(5)
					.nullable();
			}
		}
		shape.semanticRelations = z.strictObject(relationShape);
	}

	return z.strictObject(shape) as ZodType<GermanKnowledgeAnalysis>;
}

export function assertGermanKnowledgeAnalysisMirrorsRequest(
	rawInput: GermanKnowledgeGenerationInput,
	rawAnalysis: GermanKnowledgeAnalysis,
): void {
	const input = germanKnowledgeGenerationInputSchema.parse(rawInput);
	modelOutputSchemaForGermanKnowledge(input).parse(rawAnalysis);
}

export { isEmptyGermanKnowledgeRequest } from "./runtime-schema";
