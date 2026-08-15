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
	schemasFor.de.entity.Lemma.Lexeme.INTJ(),
);
const canonicalCitationSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Citation.Lexeme.INTJ(),
);

const deInterjectionLemmaCodec = codecBuilder4.buildFixedFieldsCodec(
	canonicalLemmaSchema,
	{
		language: "de",
		family: "Lexeme",
		kind: "INTJ",
	},
);

const modelLemmaSchema = deInterjectionLemmaCodec.in;

type DeInterjectionLemma = z.output<typeof deInterjectionLemmaCodec>;

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

function buildDeInterjectionCitationSurfaceCodec(lemma: DeInterjectionLemma) {
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

const schemaProjectionLemma = {
	language: "de",
	canonicalForm: "pfui",
	family: "Lexeme",
	kind: "INTJ",
	coreFeatures: { partType: null },
} satisfies DeInterjectionLemma;

const modelCitationSurfaceSchema = buildDeInterjectionCitationSurfaceCodec(
	schemaProjectionLemma,
).in.omit({
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

export const outputSchema = z.strictObject({
	memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(1),
	normalizedMembers: normalizedMembersSchema,
	surface: modelCitationSurfaceSchema,
	lemma: modelLemmaSchema,
}) satisfies PromptOutputSchema;
