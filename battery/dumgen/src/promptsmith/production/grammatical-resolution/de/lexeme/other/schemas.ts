import { codecBuilder4 } from "codec-builder-library/v4";
import { schemasFor } from "dumling/schema";
import { z } from "zod";

import { asObjectSchema } from "../../../../../../schema/as-object-schema";
import {
	grammaticalResolutionMarkedContextSchema,
	normalizedMembersSchema,
	type PromptInputSchema,
	type PromptOutputSchema,
} from "../../../../../assembly";

const canonicalLemmaSchema = asObjectSchema(
	schemasFor.de.entity.Lemma.Lexeme.X(),
);
const canonicalCitationSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Citation.Lexeme.X(),
);
const canonicalInflectionSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Inflection.Lexeme.X(),
);

export const deOtherLemmaCodec = codecBuilder4.buildFixedFieldsCodec(
	canonicalLemmaSchema,
	{
		language: "de",
		family: "Lexeme",
		kind: "X",
	},
);

export const deOtherModelLemmaSchema = deOtherLemmaCodec.in;

type DeOtherLemma = z.output<typeof deOtherLemmaCodec>;

const modelSurfaceFeaturesSchema = z
	.strictObject({ historicalStatus: z.literal("Archaic").nullable() })
	.nullable();

function normalizeModelSurfaceFeatures<
	Surface extends {
		readonly surfaceFeatures: {
			readonly historicalStatus: "Archaic" | null;
		} | null;
	},
>(surface: Surface): Surface {
	if (
		surface.surfaceFeatures === null ||
		surface.surfaceFeatures.historicalStatus !== null
	) {
		return surface;
	}
	return { ...surface, surfaceFeatures: null };
}

export function buildDeOtherCitationSurfaceCodec(lemma: DeOtherLemma) {
	const canonicalCodec = codecBuilder4.buildFixedFieldsCodec(
		canonicalCitationSurfaceSchema,
		{ language: "de", lemma },
	);
	const modelSchema = canonicalCodec.in.extend({
		surfaceFeatures: modelSurfaceFeaturesSchema,
	});
	return z.codec(modelSchema, canonicalCodec.out, {
		decode: (model) =>
			canonicalCodec.decode(normalizeModelSurfaceFeatures(model)),
		encode: (canonical) => canonicalCodec.encode(canonical),
	});
}

const otherCaseSchema = z.enum(["Acc", "Dat", "Gen", "Nom"]);
const otherGenderSchema = z.enum(["Fem", "Masc", "Neut"]);
const otherMoodSchema = z.enum(["Imp", "Ind", "Sub"]);
const otherNumberSchema = z.enum(["Plur", "Sing"]);
const otherVerbFormSchema = z.enum(["Fin", "Inf", "Part"]);

const nullableOtherInflectionalShape = {
	case: otherCaseSchema.nullable(),
	gender: otherGenderSchema.nullable(),
	mood: otherMoodSchema.nullable(),
	number: otherNumberSchema.nullable(),
	verbForm: otherVerbFormSchema.nullable(),
};

// Dumling's German X codec exposes Inflection and rejects an all-null feature
// bag. Keep that constraint structural so generated JSON Schema is faithful
// even though the current Dumgen route has no reachable positive X output.
export const deOtherModelInflectionalFeaturesSchema = z.union([
	z.strictObject({
		...nullableOtherInflectionalShape,
		case: otherCaseSchema,
	}),
	z.strictObject({
		...nullableOtherInflectionalShape,
		gender: otherGenderSchema,
	}),
	z.strictObject({
		...nullableOtherInflectionalShape,
		mood: otherMoodSchema,
	}),
	z.strictObject({
		...nullableOtherInflectionalShape,
		number: otherNumberSchema,
	}),
	z.strictObject({
		...nullableOtherInflectionalShape,
		verbForm: otherVerbFormSchema,
	}),
]);

export function buildDeOtherInflectionSurfaceCodec(lemma: DeOtherLemma) {
	const canonicalCodec = codecBuilder4.buildFixedFieldsCodec(
		canonicalInflectionSurfaceSchema,
		{ language: "de", lemma },
	);
	const modelSchema = canonicalCodec.in.extend({
		surfaceFeatures: modelSurfaceFeaturesSchema,
		inflectionalFeatures: deOtherModelInflectionalFeaturesSchema,
	});
	return z.codec(modelSchema, canonicalCodec.out, {
		decode: (model) =>
			canonicalCodec.decode(normalizeModelSurfaceFeatures(model)),
		encode: (canonical) =>
			modelSchema.parse(canonicalCodec.encode(canonical)),
	});
}

const schemaProjectionLemma = {
	language: "de",
	canonicalForm: "x",
	family: "Lexeme",
	kind: "X",
	coreFeatures: {
		abbr: null,
		foreign: null,
		hyph: null,
		numType: null,
	},
} satisfies DeOtherLemma;

export const deOtherModelCitationSurfaceSchema =
	buildDeOtherCitationSurfaceCodec(schemaProjectionLemma).in.omit({
		normalizedSurface: true,
		surfaceKind: true,
	});
export const deOtherModelInflectionSurfaceSchema =
	buildDeOtherInflectionSurfaceCodec(schemaProjectionLemma).in.omit({
		normalizedSurface: true,
	});

export const inputSchema = z
	.strictObject({
		markedContext: grammaticalResolutionMarkedContextSchema,
		members: z.array(z.string().min(1)).min(1),
	})
	.superRefine((input, context) => {
		const markedMembers = [
			...input.markedContext.matchAll(/<TARGET>([^<>]+)<\/TARGET>/gu),
		].map((match) => match[1]);
		if (
			markedMembers.length !== input.members.length ||
			markedMembers.some(
				(member, position) => member !== input.members[position],
			)
		) {
			context.addIssue({
				code: "custom",
				path: ["members"],
				message:
					"members must exactly match TARGET contents in source order.",
			});
		}
	}) satisfies PromptInputSchema;

export const outputSchema = z.strictObject({
	memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(1),
	normalizedMembers: normalizedMembersSchema,
	surface: z.union([
		deOtherModelCitationSurfaceSchema,
		deOtherModelInflectionSurfaceSchema,
	]),
	lemma: deOtherModelLemmaSchema,
}) satisfies PromptOutputSchema;
