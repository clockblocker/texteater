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
	schemasFor.de.entity.Lemma.Phraseme.Proverb(),
);
const canonicalCitationSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Citation.Phraseme.Proverb(),
);

const deProverbLemmaCodec = codecBuilder4.buildFixedFieldsCodec(
	canonicalLemmaSchema,
	{ language: "de", family: "Phraseme", kind: "Proverb" },
);

const modelLemmaCodec = codecBuilder4.buildFixedFieldsCodec(
	deProverbLemmaCodec.in,
	{ coreFeatures: {} },
);

const deProverbModelLemmaSchema = modelLemmaCodec.in;

type DeProverbLemma = z.output<typeof deProverbLemmaCodec>;

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

function buildDeProverbCitationSurfaceCodec(lemma: DeProverbLemma) {
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
	canonicalForm: "Morgenstund hat Gold im Mund",
	family: "Phraseme",
	kind: "Proverb",
	coreFeatures: {},
} satisfies DeProverbLemma;

const deProverbModelCitationSurfaceSchema = buildDeProverbCitationSurfaceCodec(
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

const modelOutputSchema = z.strictObject({
	memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(1),
	normalizedMembers: normalizedMembersSchema,
	realizationCoverage: z.enum(["Full", "Partial"]),
	surface: deProverbModelCitationSurfaceSchema,
	lemma: deProverbModelLemmaSchema,
});

const extractModelLemmaCodec = codecBuilder4.buildReshapeCodec(
	modelOutputSchema,
	{
		fieldName: "modelLemma",
		fieldSchema: modelLemmaCodec.in,
		dropFields: ["lemma"],
		construct: (output) => output.lemma,
		reconstruct: (modelLemma) => ({ lemma: modelLemma }),
	},
);
const restoreRuntimeLemmaCodec = codecBuilder4.buildReshapeCodec(
	extractModelLemmaCodec.out,
	{
		fieldName: "lemma",
		fieldSchema: modelLemmaCodec.out,
		dropFields: ["modelLemma"],
		construct: (output) => modelLemmaCodec.decode(output.modelLemma),
		reconstruct: (lemma) => ({
			modelLemma: modelLemmaCodec.encode(lemma),
		}),
	},
);

const proverbResolutionCodec = codecBuilder4.helpers.pipeCodecs(
	extractModelLemmaCodec,
	restoreRuntimeLemmaCodec,
);

export const outputSchema =
	proverbResolutionCodec.in satisfies PromptOutputSchema;
