import { codecBuilder4 } from "codec-builder-library/v4";
import { schemasFor } from "dumling/schema";
import { z } from "zod";

import { asObjectSchema } from "../../../../../../schema/as-object-schema";
import {
	normalizedMembersSchema,
	type PromptInputSchema,
	type PromptOutputSchema,
} from "../../../../../assembly";

const canonicalLemmaSchema = asObjectSchema(
	schemasFor.de.entity.Lemma.Lexeme.SYM(),
);
const canonicalCitationSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Citation.Lexeme.SYM(),
);
const canonicalInflectionSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Inflection.Lexeme.SYM(),
);

export const deSymbolLemmaCodec = codecBuilder4.buildFixedFieldsCodec(
	canonicalLemmaSchema,
	{ language: "de", family: "Lexeme", kind: "SYM" },
);

export const deSymbolModelLemmaSchema = deSymbolLemmaCodec.in;

type DeSymbolLemma = z.output<typeof deSymbolLemmaCodec>;

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

const symbolCaseSchema = z.enum(["Acc", "Dat", "Gen", "Nom"]);
const symbolGenderSchema = z.enum(["Fem", "Masc", "Neut"]);
const symbolNumberSchema = z.enum(["Plur", "Sing"]);

// The canonical codec requires at least one non-null feature. A structural
// union preserves that invariant in provider-facing JSON Schema.
export const deSymbolModelInflectionalFeaturesSchema = z.union([
	z.strictObject({
		case: symbolCaseSchema,
		gender: symbolGenderSchema.nullable(),
		number: symbolNumberSchema.nullable(),
	}),
	z.strictObject({
		case: symbolCaseSchema.nullable(),
		gender: symbolGenderSchema,
		number: symbolNumberSchema.nullable(),
	}),
	z.strictObject({
		case: symbolCaseSchema.nullable(),
		gender: symbolGenderSchema.nullable(),
		number: symbolNumberSchema,
	}),
]);

export function buildDeSymbolCitationSurfaceCodec(lemma: DeSymbolLemma) {
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

export function buildDeSymbolInflectionSurfaceCodec(lemma: DeSymbolLemma) {
	const canonicalCodec = codecBuilder4.buildFixedFieldsCodec(
		canonicalInflectionSurfaceSchema,
		{ language: "de", lemma },
	);
	const modelSchema = canonicalCodec.in.extend({
		surfaceFeatures: modelSurfaceFeaturesSchema,
		inflectionalFeatures: deSymbolModelInflectionalFeaturesSchema,
	});
	return z.codec(modelSchema, canonicalCodec.out, {
		decode: (model) =>
			canonicalCodec.decode(normalizeModelSurfaceFeatures(model)),
		encode: (canonical) =>
			modelSchema.parse(canonicalCodec.encode(canonical)),
	});
}

const schemaProjectionLemma = deSymbolLemmaCodec.decode({
	canonicalForm: "%",
	coreFeatures: { foreign: null, numType: null },
});

export const deSymbolModelCitationSurfaceSchema =
	buildDeSymbolCitationSurfaceCodec(schemaProjectionLemma).in.omit({
		normalizedSurface: true,
		surfaceKind: true,
	});

export const deSymbolModelInflectionSurfaceSchema =
	buildDeSymbolInflectionSurfaceCodec(schemaProjectionLemma).in.omit({
		normalizedSurface: true,
	});

export const inputSchema = z
	.strictObject({
		markedContext: z.string().min(1),
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
		deSymbolModelCitationSurfaceSchema,
		deSymbolModelInflectionSurfaceSchema,
	]),
	lemma: deSymbolModelLemmaSchema,
}) satisfies PromptOutputSchema;
