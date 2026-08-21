import { codecBuilder4 } from "codec-builder-library/v4";
import { dangerouslyHeavySchemasForAbout100MiBRss as schemasFor } from "dumling/dangerously-heavy-schema-tree";
import { z } from "zod";

import { asObjectSchema } from "../../../../../../schema/as-object-schema";
import {
	grammaticalResolutionMarkedContextSchema,
	normalizedMembersSchema,
	type PromptInputSchema,
	type PromptOutputSchema,
} from "../../../../../assembly";

const canonicalLemmaSchema = asObjectSchema(
	schemasFor.de.entity.Lemma.Lexeme.NUM(),
);
const canonicalCitationSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Citation.Lexeme.NUM(),
);
const canonicalInflectionSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Inflection.Lexeme.NUM(),
);

const deNumeralLemmaCodec = codecBuilder4.buildFixedFieldsCodec(
	canonicalLemmaSchema,
	{
		language: "de",
		family: "Lexeme",
		kind: "NUM",
	},
);

const modelLemmaSchema = deNumeralLemmaCodec.in;

type DeNumeralLemma = z.output<typeof deNumeralLemmaCodec>;

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

const numeralCaseSchema = z.enum(["Acc", "Dat", "Gen", "Nom"]);
const numeralGenderSchema = z.enum(["Fem", "Masc", "Neut"]);
const numeralNumberSchema = z.enum(["Plur", "Sing"]);

// The canonical codec requires at least one non-null feature. A structural
// union preserves that invariant in provider-facing JSON Schema.
export const modelInflectionalFeaturesSchema = z.union([
	z.strictObject({
		case: numeralCaseSchema,
		gender: numeralGenderSchema.nullable(),
		number: numeralNumberSchema.nullable(),
	}),
	z.strictObject({
		case: numeralCaseSchema.nullable(),
		gender: numeralGenderSchema,
		number: numeralNumberSchema.nullable(),
	}),
	z.strictObject({
		case: numeralCaseSchema.nullable(),
		gender: numeralGenderSchema.nullable(),
		number: numeralNumberSchema,
	}),
]);

function buildDeNumeralCitationSurfaceCodec(lemma: DeNumeralLemma) {
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

function buildDeNumeralInflectionSurfaceCodec(lemma: DeNumeralLemma) {
	const canonicalCodec = codecBuilder4.buildFixedFieldsCodec(
		canonicalInflectionSurfaceSchema,
		{ language: "de", lemma },
	);
	const modelSchema = canonicalCodec.in.extend({
		surfaceFeatures: modelSurfaceFeaturesSchema,
		inflectionalFeatures: modelInflectionalFeaturesSchema,
	});
	return z.codec(modelSchema, canonicalCodec.out, {
		decode: (model) =>
			canonicalCodec.decode(normalizeModelSurfaceFeatures(model)),
		encode: (canonical) =>
			modelSchema.parse(canonicalCodec.encode(canonical)),
	});
}

const schemaProjectionLemma = deNumeralLemmaCodec.decode({
	canonicalForm: "zwei",
	coreFeatures: { abbr: null, foreign: null, numType: "Card" },
});

const modelCitationSurfaceSchema = buildDeNumeralCitationSurfaceCodec(
	schemaProjectionLemma,
).in.omit({
	normalizedSurface: true,
});

const modelInflectionSurfaceSchema = buildDeNumeralInflectionSurfaceCodec(
	schemaProjectionLemma,
).in.omit({
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
		modelCitationSurfaceSchema,
		modelInflectionSurfaceSchema,
	]),
	lemma: modelLemmaSchema,
}) satisfies PromptOutputSchema;
