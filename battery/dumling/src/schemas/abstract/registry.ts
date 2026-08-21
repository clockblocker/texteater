import { type z, z as zod } from "zod";
import {
	constructionKindValues,
	morphemeKindValues,
	phrasemeKindValues,
	posValues,
} from "../../types/core/enums.js";
import type {
	AbstractAttestation,
	AbstractLemma,
	AbstractSurface,
} from "../../types/public-types.js";
import {
	buildAttestationSchema,
	buildCitationSurfaceSchema,
	buildInflectionSurfaceSchema,
	buildLemmaSchema,
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
	attestationSchemas: readonly [
		z.ZodType<AbstractAttestation<string, "Citation">>,
		z.ZodType<AbstractAttestation<string, "Inflection">>,
	];
};

function buildAbstractLeafBundle(
	family: "Lexeme" | "Morpheme" | "Phraseme" | "Construction",
	kind: string,
): AbstractLeafBundle {
	const lemmaSchema = buildLemmaSchema({
		languageSchema: zod.string().min(1),
		family,
		kind,
		coreFeaturesSchema: abstractCoreFeaturesSchema,
	}) as z.ZodType<AbstractLemma<string>>;
	const citationSurfaceSchema = buildCitationSurfaceSchema({
		languageSchema: zod.string().min(1),
		lemmaSchema,
	}) as z.ZodType<AbstractSurface<string, "Citation">>;
	const inflectionSurfaceSchema = buildInflectionSurfaceSchema({
		languageSchema: zod.string().min(1),
		lemmaSchema,
		inflectionalFeaturesSchema: abstractInflectionalFeaturesSchema,
	}) as z.ZodType<AbstractSurface<string, "Inflection">>;
	const citationAttestationSchema = buildAttestationSchema({
		surfaceSchema: citationSurfaceSchema,
	}) as z.ZodType<AbstractAttestation<string, "Citation">>;
	const inflectionAttestationSchema = buildAttestationSchema({
		surfaceSchema: inflectionSurfaceSchema,
	}) as z.ZodType<AbstractAttestation<string, "Inflection">>;

	return {
		lemmaSchema,
		citationSurfaceSchema,
		inflectionSurfaceSchema,
		attestationSchemas: [
			citationAttestationSchema,
			inflectionAttestationSchema,
		],
	};
}

const abstractLemmaSchemas: z.ZodType[] = [];
const abstractSurfaceSchemas: z.ZodType[] = [];
const abstractAttestationSchemas: z.ZodType[] = [];

for (const [family, subKinds] of [
	["Lexeme", posValues],
	["Morpheme", morphemeKindValues],
	["Phraseme", phrasemeKindValues],
	["Construction", constructionKindValues],
] as const) {
	for (const kind of subKinds) {
		const bundle = buildAbstractLeafBundle(family, kind);

		abstractLemmaSchemas.push(bundle.lemmaSchema);
		abstractSurfaceSchemas.push(
			bundle.citationSurfaceSchema,
			bundle.inflectionSurfaceSchema,
		);
		abstractAttestationSchemas.push(...bundle.attestationSchemas);
	}
}

export const abstractRuntimeSchemas = {
	lemma: buildUnionSchema(
		abstractLemmaSchemas as [z.ZodType, z.ZodType, ...z.ZodType[]],
	) as z.ZodType<AbstractLemma<string>>,
	surface: buildUnionSchema(
		abstractSurfaceSchemas as [z.ZodType, z.ZodType, ...z.ZodType[]],
	) as z.ZodType<AbstractSurface<string>>,
	attestation: buildUnionSchema(
		abstractAttestationSchemas as [z.ZodType, z.ZodType, ...z.ZodType[]],
	) as z.ZodType<AbstractAttestation<string>>,
} as const;
