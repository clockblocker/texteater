import { codecBuilder4 } from "codec-builder-library/v4";
import { dangerouslyHeavySchemasForAbout100MiBRss as schemasFor } from "dumling/dangerously-heavy-schema-tree";
import type { Lemma } from "dumling/types";
import { type input, type output, z } from "zod";

import { DUMGEN_GENERATION_MODEL } from "../../ai-sdk/model-policy";
import {
	type DeGrammaticalResolutionModelOutput,
	projectDeGrammaticalResolution,
} from "../../grammatical-resolution/de/projection";
import type { GermanGrammaticalRoute } from "../../schema/de-grammatical-resolution-inventory";
import type {
	GermanHighLevelFamily,
	GermanHighLevelKind,
} from "../../schema/german-high-level-routes";
import { extractMarkedContextMembers } from "../../schema/normalized-surface-projection";
import type {
	GrammaticalResolution,
	GrammaticalResolutionInput,
} from "../../types";
import type { Prompt, PromptSchemaOutput } from "../prompt-definition";

type ObjectSchema = z.ZodObject<z.ZodRawShape>;

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
		const projection = projectDeGrammaticalResolution({
			input,
			output: rawGenerated as DeGrammaticalResolutionModelOutput,
			route: { family, kind } as GermanGrammaticalRoute,
		});
		const lemmaCodec = codecBuilder4.buildFixedFieldsCodec(
			lemmaSchema,
			projection.route,
		);
		const lemma = lemmaCodec.decode(
			projection.lemma as input<typeof lemmaCodec>,
		) as Lemma<"de">;
		const surfaceKind = projection.surface.surfaceKind;
		const surfaceSchema =
			surfaceKind === "Inflection" ? inflectionSchema : citationSchema;
		if (!surfaceSchema) {
			throw new Error(
				`${family}/${kind} does not expose an Inflection Surface.`,
			);
		}
		const surfaceCodec = codecBuilder4.buildFixedFieldsCodec(
			surfaceSchema,
			{ language: projection.route.language, lemma },
		);
		const linkedSurface = surfaceCodec.decode(
			projection.surface as input<typeof surfaceCodec>,
		);

		return {
			memberOrthographies: projection.memberOrthographies,
			normalizedMembers: projection.normalizedMembers,
			realizationCoverage: projection.realizationCoverage,
			surface: linkedSurface,
		} as GrammaticalResolution;
	}

	return {
		systemPrompt: options.systemPrompt,
		inputSchema: grammaticalResolutionInputSchema,
		modelInputSchema: options.inputSchema,
		outputSchema: options.outputSchema,
		projectInput(input) {
			return input as output<ModelInputSchema> as PromptSchemaOutput<ModelInputSchema>;
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
