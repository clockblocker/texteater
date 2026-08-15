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
	schemasFor.de.entity.Lemma.Phraseme.DiscourseFormula(),
);
const canonicalCitationSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Citation.Phraseme.DiscourseFormula(),
);

const deDiscourseFormulaLemmaCodec = codecBuilder4.buildFixedFieldsCodec(
	canonicalLemmaSchema,
	{
		language: "de",
		family: "Phraseme",
		kind: "DiscourseFormula",
	},
);

const deDiscourseFormulaModelLemmaSchema = deDiscourseFormulaLemmaCodec.in;

type DeDiscourseFormulaLemma = z.output<typeof deDiscourseFormulaLemmaCodec>;

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

function buildDeDiscourseFormulaCitationSurfaceCodec(
	lemma: DeDiscourseFormulaLemma,
) {
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

const schemaProjectionLemma = deDiscourseFormulaLemmaCodec.decode({
	canonicalForm: "guten morgen",
	coreFeatures: { discourseFormulaRole: "Greeting" },
});

const deDiscourseFormulaModelCitationSurfaceSchema =
	buildDeDiscourseFormulaCitationSurfaceCodec(schemaProjectionLemma).in.omit({
		normalizedSurface: true,
		surfaceKind: true,
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

const discourseFormulaResolutionCodec = z.codec(
	z.strictObject({
		memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(1),
		normalizedMembers: normalizedMembersSchema,
		realizationCoverage: z.enum(["Full", "Partial"]),
		surface: deDiscourseFormulaModelCitationSurfaceSchema,
		lemma: deDiscourseFormulaModelLemmaSchema,
	}),
	z.strictObject({
		memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(1),
		normalizedMembers: normalizedMembersSchema,
		realizationCoverage: z.enum(["Full", "Partial"]),
		surface: deDiscourseFormulaModelCitationSurfaceSchema,
		lemma: canonicalLemmaSchema,
	}),
	{
		decode: (model) => ({
			...model,
			lemma: deDiscourseFormulaLemmaCodec.decode(model.lemma),
		}),
		encode: (runtime) => ({
			...runtime,
			lemma: deDiscourseFormulaLemmaCodec.encode(runtime.lemma),
		}),
	},
);

export const outputSchema =
	discourseFormulaResolutionCodec.in satisfies PromptOutputSchema;
