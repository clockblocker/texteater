import type { z } from "zod";
import {
	AbstractLanguageTag,
	ConstructionKind,
	MorphemeKind,
	PhrasemeKind,
	Pos,
} from "../../types/core/enums.js";
import type {
	AbstractLemma,
	AbstractSelection,
	AbstractSurface,
} from "../../types/public-types.js";
import {
	buildCitationSurfaceSchema,
	buildInflectionSurfaceSchema,
	buildLemmaSchema,
	buildSelectionSchema,
	buildUnionSchema,
} from "../shared/builders.js";
import {
	abstractCoreFeaturesSchema,
	abstractInflectionalFeaturesSchema,
} from "./feature-schemas.js";

type AbstractLeafBundle = {
	citationSurfaceSchema: z.ZodType<AbstractSurface<string, "Citation">>;
	inflectionSurfaceSchema: z.ZodType<AbstractSurface<string, "Inflection">>;
	lemmaSchema: z.ZodType<AbstractLemma<string>>;
	selectionSchemas: readonly [
		z.ZodType<AbstractSelection<string, "Citation">>,
		z.ZodType<AbstractSelection<string, "Inflection">>,
	];
};

function buildAbstractLeafBundle(
	family: "Lexeme" | "Morpheme" | "Phraseme" | "Construction",
	kind: string,
): AbstractLeafBundle {
	const lemmaSchema = buildLemmaSchema({
		languageSchema: AbstractLanguageTag,
		family,
		kind,
		coreFeaturesSchema: abstractCoreFeaturesSchema,
	}) as z.ZodType<AbstractLemma<string>>;
	const citationSurfaceSchema = buildCitationSurfaceSchema({
		languageSchema: AbstractLanguageTag,
		lemmaSchema,
	}) as z.ZodType<AbstractSurface<string, "Citation">>;
	const inflectionSurfaceSchema = buildInflectionSurfaceSchema({
		languageSchema: AbstractLanguageTag,
		lemmaSchema,
		inflectionalFeaturesSchema: abstractInflectionalFeaturesSchema,
	}) as z.ZodType<AbstractSurface<string, "Inflection">>;
	const citationSelectionSchema = buildSelectionSchema({
		surfaceSchema: citationSurfaceSchema,
	}) as z.ZodType<AbstractSelection<string, "Citation">>;
	const inflectionSelectionSchema = buildSelectionSchema({
		surfaceSchema: inflectionSurfaceSchema,
	}) as z.ZodType<AbstractSelection<string, "Inflection">>;

	return {
		lemmaSchema,
		citationSurfaceSchema,
		inflectionSurfaceSchema,
		selectionSchemas: [citationSelectionSchema, inflectionSelectionSchema],
	};
}

const abstractLemmaSchemas: z.ZodType[] = [];
const abstractSurfaceSchemas: z.ZodType[] = [];
const abstractSelectionSchemas: z.ZodType[] = [];

for (const [family, subKinds] of [
	["Lexeme", Pos.options],
	["Morpheme", MorphemeKind.options],
	["Phraseme", PhrasemeKind.options],
	["Construction", ConstructionKind.options],
] as const) {
	for (const kind of subKinds) {
		const bundle = buildAbstractLeafBundle(family, kind);

		abstractLemmaSchemas.push(bundle.lemmaSchema);
		abstractSurfaceSchemas.push(
			bundle.citationSurfaceSchema,
			bundle.inflectionSurfaceSchema,
		);
		abstractSelectionSchemas.push(...bundle.selectionSchemas);
	}
}

export const abstractRuntimeSchemas = {
	lemma: buildUnionSchema(
		abstractLemmaSchemas as [z.ZodType, z.ZodType, ...z.ZodType[]],
	) as z.ZodType<AbstractLemma<string>>,
	surface: buildUnionSchema(
		abstractSurfaceSchemas as [z.ZodType, z.ZodType, ...z.ZodType[]],
	) as z.ZodType<AbstractSurface<string>>,
	selection: buildUnionSchema(
		abstractSelectionSchemas as [z.ZodType, z.ZodType, ...z.ZodType[]],
	) as z.ZodType<AbstractSelection<string>>,
} as const;
