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
	schemasFor.de.entity.Lemma.Construction.PairedFrame(),
);
const canonicalCitationSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Citation.Construction.PairedFrame(),
);

const dePairedFrameLemmaCodec = codecBuilder4.buildFixedFieldsCodec(
	canonicalLemmaSchema,
	{ language: "de", family: "Construction", kind: "PairedFrame" },
);

const modelLemmaCodec = codecBuilder4.buildFixedFieldsCodec(
	dePairedFrameLemmaCodec.in,
	{ coreFeatures: {} },
);

const dePairedFrameModelLemmaSchema = modelLemmaCodec.in;

type DePairedFrameLemma = z.output<typeof dePairedFrameLemmaCodec>;

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

function buildDePairedFrameCitationSurfaceCodec(lemma: DePairedFrameLemma) {
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
	canonicalForm: "entweder … oder",
	family: "Construction",
	kind: "PairedFrame",
	coreFeatures: {},
} satisfies DePairedFrameLemma;

const dePairedFrameModelCitationSurfaceSchema =
	buildDePairedFrameCitationSurfaceCodec(schemaProjectionLemma).in.omit({
		normalizedSurface: true,
		surfaceKind: true,
	});

export const inputSchema = z
	.strictObject({
		markedContext: grammaticalResolutionMarkedContextSchema,
		members: z.array(z.string().min(1)).min(2),
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
	memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(2),
	normalizedMembers: normalizedMembersSchema,
	surface: dePairedFrameModelCitationSurfaceSchema,
	lemma: dePairedFrameModelLemmaSchema,
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

const pairedFrameResolutionCodec = codecBuilder4.helpers.pipeCodecs(
	extractModelLemmaCodec,
	restoreRuntimeLemmaCodec,
);

export const outputSchema =
	pairedFrameResolutionCodec.in satisfies PromptOutputSchema;
