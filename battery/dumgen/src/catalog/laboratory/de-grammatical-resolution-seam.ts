import { codecBuilder4 } from "codec-builder-library/v4";
import { schemasFor } from "dumling/schema";
import type { Lemma, Surface } from "dumling/types";
import { type input, type output, z } from "zod";

import { DUMGEN_GENERATION_MODEL } from "../../ai-sdk/model-policy";
import type {
	GermanHighLevelFamily,
	GermanHighLevelKind,
} from "../../schema/german-high-level-routes";
import {
	constructNormalizedSurface,
	extractMarkedContextMembers,
	type MemberOrthography,
} from "../../schema/normalized-surface-projection";
import type {
	GrammaticalResolution,
	GrammaticalResolutionInput,
} from "../../types";
import type { Prompt } from "../prompt-definition";

type ObjectSchema = z.ZodObject<z.ZodRawShape>;
type ModelOwnedSurface<Value> = Value extends { readonly lemma: unknown }
	? Omit<Value, "language" | "lemma" | "normalizedSurface">
	: never;

export type GrammarSurfaceProjection = ModelOwnedSurface<Surface<"de">>;

export type NormalizedSurfaceProjector = (args: {
	readonly input: GrammaticalResolutionInput;
	readonly memberOrthographies: readonly MemberOrthography[];
	readonly normalizedMembers: readonly string[];
	readonly lemma: Lemma<"de">;
	readonly surface: GrammarSurfaceProjection;
}) => string;

type AuthoredGrammarPromptOptions<
	ModelInputSchema extends z.ZodType,
	OutputSchema extends z.ZodType,
	Family extends GermanHighLevelFamily,
> = {
	readonly family: Family;
	readonly kind: GermanHighLevelKind<Family>;
	readonly systemPrompt: string;
	readonly inputSchema: ModelInputSchema;
	readonly outputSchema: OutputSchema;
	readonly normalizedSurfaceProjector?: NormalizedSurfaceProjector;
	readonly fixedLemmaCoreFeatures?: Readonly<Record<string, unknown>>;
};

type AuthoredGrammarPrompt<
	ModelInputSchema extends z.ZodType,
	OutputSchema extends z.ZodType,
> = Prompt<
	typeof grammaticalResolutionInputSchema,
	OutputSchema,
	GrammaticalResolution,
	ModelInputSchema
> & {
	readonly projectOutput: (
		input: GrammaticalResolutionInput,
		generated: output<OutputSchema>,
	) => GrammaticalResolution;
};

type ModelSurface = Readonly<Record<string, unknown>> & {
	readonly surfaceKind?: "Citation" | "Inflection";
};

type ModelGrammarResolution = {
	readonly memberOrthographies: readonly ("Standard" | "Typo")[];
	readonly normalizedMembers: readonly string[];
	readonly realizationCoverage?: "Full" | "Partial";
	readonly lemma: Readonly<Record<string, unknown>>;
	readonly surface: ModelSurface;
};

export const grammaticalResolutionInputSchema = z
	.strictObject({
		markedContext: z.string().min(1),
		members: z.array(z.string().min(1)).min(1),
	})
	.superRefine((value, context) => {
		let markedMembers: readonly string[];
		try {
			markedMembers = extractMarkedContextMembers(value.markedContext);
		} catch (cause) {
			context.addIssue({
				code: "custom",
				path: ["markedContext"],
				message:
					cause instanceof Error
						? cause.message
						: "markedContext is invalid.",
			});
			return;
		}
		if (
			markedMembers.length !== value.members.length ||
			markedMembers.some(
				(member, position) => member !== value.members[position],
			)
		) {
			context.addIssue({
				code: "custom",
				path: ["members"],
				message:
					"members must exactly match TARGET contents in source order.",
			});
		}
	});

/**
 * The one German Grammatical Resolution projection. Its application-facing
 * input is canonical and every model output is a flat, total route DTO.
 */
export function createDeGrammaticalResolutionPrompt<
	ModelInputSchema extends z.ZodType,
	OutputSchema extends z.ZodType,
	const Family extends GermanHighLevelFamily,
>(
	options: AuthoredGrammarPromptOptions<
		ModelInputSchema,
		OutputSchema,
		Family
	>,
): AuthoredGrammarPrompt<ModelInputSchema, OutputSchema> {
	const { family, kind } = options;
	const lemmaSchema = routeObjectSchema(
		schemasFor.de.entity.Lemma,
		family,
		kind,
	);
	const lemmaCodec = codecBuilder4.buildFixedFieldsCodec(lemmaSchema, {
		language: "de",
		family,
		kind,
	} as const);
	const citationSchema = routeObjectSchema(
		schemasFor.de.entity.Surface.Citation,
		family,
		kind,
	);
	const inflectionGetter = (
		schemasFor.de.entity.Surface.Inflection as unknown as Record<
			string,
			Record<string, (() => z.ZodType) | undefined>
		>
	)[family]?.[kind];
	const inflectionSchema: ObjectSchema | undefined = inflectionGetter
		? (inflectionGetter() as ObjectSchema)
		: undefined;

	function projectOutput(
		input: GrammaticalResolutionInput,
		rawGenerated: output<OutputSchema>,
	): GrammaticalResolution {
		const generated = rawGenerated as ModelGrammarResolution;
		const modelCoreFeatures = generated.lemma.coreFeatures;
		const lemma = lemmaCodec.decode({
			...generated.lemma,
			coreFeatures: {
				...(isRecord(modelCoreFeatures) ? modelCoreFeatures : {}),
				...options.fixedLemmaCoreFeatures,
			},
		} as input<typeof lemmaCodec>) as Lemma<"de">;
		const surfaceKind = inferSurfaceKind(
			generated.surface,
			inflectionSchema !== undefined,
			family,
			kind,
		);
		const surfaceSchema =
			surfaceKind === "Inflection" ? inflectionSchema : citationSchema;
		if (!surfaceSchema) {
			throw new Error(
				`${family}/${kind} does not expose an Inflection Surface.`,
			);
		}
		const surfaceCodec = codecBuilder4.buildFixedFieldsCodec(
			surfaceSchema,
			{ language: "de", lemma },
		);
		const modelSurface = {
			...generated.surface,
			surfaceKind,
		} as GrammarSurfaceProjection;
		const normalizedSurface = options.normalizedSurfaceProjector
			? options.normalizedSurfaceProjector({
					input,
					memberOrthographies: generated.memberOrthographies,
					normalizedMembers: generated.normalizedMembers,
					lemma,
					surface: modelSurface,
				})
			: constructNormalizedSurface({
					attestedMembers: input.members,
					normalizedMembers: generated.normalizedMembers,
					memberOrthographies: generated.memberOrthographies,
				});
		const linkedSurface = surfaceCodec.decode(
			normalizeModelSurfaceFeatures({
				...modelSurface,
				normalizedSurface,
			}) as input<typeof surfaceCodec>,
		);
		const realizationCoverage =
			family === "Phraseme"
				? requirePhrasemeCoverage(generated.realizationCoverage)
				: "Full";

		return {
			memberOrthographies: generated.memberOrthographies,
			normalizedMembers: generated.normalizedMembers,
			realizationCoverage,
			surface: linkedSurface,
		} as GrammaticalResolution;
	}

	return {
		systemPrompt: options.systemPrompt,
		inputSchema: grammaticalResolutionInputSchema,
		modelInputSchema: options.inputSchema,
		outputSchema: options.outputSchema,
		projectInput(input) {
			return input as output<ModelInputSchema>;
		},
		projectOutput(input, rawGenerated) {
			return projectOutput(input, rawGenerated as output<OutputSchema>);
		},
		generationParams: {
			model: DUMGEN_GENERATION_MODEL,
			maxOutputTokens: 1024,
		},
	};
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function inferSurfaceKind(
	surface: ModelSurface,
	hasInflectionSurface: boolean,
	family: string,
	kind: string,
): "Citation" | "Inflection" {
	if (surface.surfaceKind !== undefined) return surface.surfaceKind;
	if (!hasInflectionSurface) return "Citation";
	throw new Error(
		`${family}/${kind} must discriminate Citation and Inflection Surfaces.`,
	);
}

function requirePhrasemeCoverage(
	value: ModelGrammarResolution["realizationCoverage"],
): "Full" | "Partial" {
	if (value === "Full" || value === "Partial") return value;
	throw new Error(
		"Phraseme Grammatical Resolution must return realizationCoverage.",
	);
}

function routeObjectSchema(
	registry: unknown,
	family: string,
	kind: string,
): ObjectSchema {
	const getter = (
		registry as Record<
			string,
			Record<string, (() => z.ZodType) | undefined> | undefined
		>
	)[family]?.[kind];
	if (!getter) {
		throw new Error(`Dumling schema is missing for ${family}/${kind}.`);
	}
	return getter() as ObjectSchema;
}

function normalizeModelSurfaceFeatures(
	surface: ModelSurface,
): Readonly<Record<string, unknown>> {
	const features = surface.surfaceFeatures;
	if (
		typeof features === "object" &&
		features !== null &&
		"historicalStatus" in features &&
		features.historicalStatus === null
	) {
		return { ...surface, surfaceFeatures: null };
	}
	return surface;
}
