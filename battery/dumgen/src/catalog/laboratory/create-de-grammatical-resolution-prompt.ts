import { codecBuilder4 } from "codec-builder-library/v4";
import { schemasFor } from "dumling/schema";
import type { z } from "zod";

import { DUMGEN_GENERATION_MODEL } from "../../ai-sdk/model-policy";
import type {
	GermanHighLevelFamily,
	GermanHighLevelKind,
} from "../../schema/german-high-level-routes";
import type { GrammaticalResolution } from "../../types";
import type { Prompt } from "../prompt-definition";

type AuthoredGrammarPromptOptions<
	InputSchema extends z.ZodType,
	OutputSchema extends z.ZodType,
	Family extends GermanHighLevelFamily,
> = {
	readonly family: Family;
	readonly kind: GermanHighLevelKind<Family>;
	readonly systemPrompt: string;
	readonly inputSchema: InputSchema;
	readonly outputSchema: OutputSchema;
};

type ObjectSchema = z.ZodObject<z.ZodRawShape>;

type AuthoredGrammarPrompt<
	InputSchema extends z.ZodType,
	OutputSchema extends z.ZodType,
> = Prompt<InputSchema, OutputSchema, GrammaticalResolution> & {
	readonly projectOutput: (
		input: z.output<InputSchema>,
		generated: z.output<OutputSchema>,
	) => GrammaticalResolution;
};

type ModelSurface = Readonly<Record<string, unknown>> & {
	readonly surfaceKind: "Citation" | "Inflection";
};

type ModelGrammarOutput = {
	readonly decision: "Resolved" | "Unresolved";
	readonly resolution: {
		readonly memberOrthographies: readonly ("Standard" | "Typo")[];
		readonly lemma: Readonly<Record<string, unknown>>;
		readonly surface: ModelSurface;
	} | null;
};

/**
 * Binds one authored German route's exact model schemas and generated prompt to
 * Dumling's canonical linked entities. Language, Family, Kind, and linked
 * Lemma are fixed codec fields and therefore cannot drift in model output.
 */
export function createDeGrammaticalResolutionPrompt<
	InputSchema extends z.ZodType,
	OutputSchema extends z.ZodType,
	const Family extends GermanHighLevelFamily,
>(
	options: AuthoredGrammarPromptOptions<InputSchema, OutputSchema, Family>,
): AuthoredGrammarPrompt<InputSchema, OutputSchema> {
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

	return {
		systemPrompt: options.systemPrompt,
		inputSchema: options.inputSchema,
		outputSchema: options.outputSchema,
		outputPostcondition: {
			assert(rawInput, rawGenerated) {
				const input = rawInput as { readonly markedContext: string };
				const generated = rawGenerated as unknown as ModelGrammarOutput;
				if (generated.decision === "Unresolved") {
					if (generated.resolution !== null) {
						throw new Error(
							"Unresolved Grammatical Resolution must not include a resolution.",
						);
					}
					return;
				}
				if (generated.resolution === null) {
					throw new Error(
						"Resolved Grammatical Resolution requires a resolution.",
					);
				}
				const markerCount =
					input.markedContext.match(/<TARGET>/gu)?.length ?? 0;
				const closingCount =
					input.markedContext.match(/<\/TARGET>/gu)?.length ?? 0;
				if (
					markerCount < 1 ||
					markerCount !== closingCount ||
					generated.resolution.memberOrthographies.length !==
						markerCount
				) {
					throw new Error(
						"Member orthographies must align one-to-one with TARGET markers.",
					);
				}
			},
		},
		projectOutput(_input, rawGenerated): GrammaticalResolution {
			const generated = rawGenerated as unknown as ModelGrammarOutput;
			if (generated.decision === "Unresolved") {
				return { decision: "Unresolved" };
			}
			if (generated.resolution === null) {
				throw new Error(
					"Resolved Grammatical Resolution requires a resolution.",
				);
			}

			const lemma = lemmaCodec.decode(
				generated.resolution.lemma as z.input<typeof lemmaCodec>,
			);
			const surfaceSchema =
				generated.resolution.surface.surfaceKind === "Inflection"
					? inflectionSchema
					: citationSchema;
			if (!surfaceSchema) {
				throw new Error(
					`${family}/${kind} does not expose an Inflection Surface.`,
				);
			}
			const surfaceCodec = codecBuilder4.buildFixedFieldsCodec(
				surfaceSchema,
				{ language: "de", lemma },
			);
			const linkedSurface = surfaceCodec.decode(
				normalizeModelSurfaceFeatures(
					generated.resolution.surface,
				) as z.input<typeof surfaceCodec>,
			);
			const { lemma: _linkedLemma, ...surface } = linkedSurface;

			return {
				decision: "Resolved",
				memberOrthographies: generated.resolution.memberOrthographies,
				surface,
				lemma,
			} as unknown as GrammaticalResolution;
		},
		generationParams: {
			model: DUMGEN_GENERATION_MODEL,
			maxOutputTokens: 1024,
		},
	};
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
