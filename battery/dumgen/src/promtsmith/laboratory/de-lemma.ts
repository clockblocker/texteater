import { z } from "zod";

import type { Prompt } from "../prompt-definition";
import {
	germanLemmaFamilySchema,
	germanLemmaKindSchema,
	germanLemmaSchema,
	namedFeatureSchema,
	surfaceFeaturesSchema,
} from "./de-classification-shared";

const inputSchema = z.strictObject({
	language: z.literal("de"),
	context: z.strictObject({
		sentenceText: z.string().min(1),
		attestedSurface: z.string().min(1),
	}),
	surface: z.strictObject({
		normalizedSurface: z.string().trim().min(1),
		spelling: z.enum(["Canonical", "Variant"]),
		realizationCoverage: z.enum(["Full", "Partial"]),
		surfaceKind: z.enum(["Citation", "Inflection"]),
		surfaceFeatures: surfaceFeaturesSchema,
		inflectionalFeatures: z.array(namedFeatureSchema),
		lemmaFamily: germanLemmaFamilySchema,
		lemmaKind: germanLemmaKindSchema,
	}),
});

export const deLemmaPrompt: Prompt<
	typeof inputSchema,
	typeof germanLemmaSchema
> = {
	systemPrompt: `You resolve a classified German Surface to its Dumling Lemma
inside a hands-on linguistic laboratory.

Return exactly one existing German Dumling Lemma shape. language is de.
canonicalForm is the normalized citation form for the structural grammatical
identity; it may contain material absent from a Partial Surface, but must not
be copied back into that Surface. family and kind must exactly match the
Surface classification supplied in the input. Emit the complete applicable
coreFeatures object required by that concrete German Dumling schema, including
null for unmarked values.

Lemma is grammatical identity, not semantic identity. Do not split homonyms
that are grammatically indistinguishable, and do not emit a Reading, meaning,
opaque ID, confidence, or explanation.`,
	inputSchema,
	outputSchema: germanLemmaSchema,
	outputPostcondition: {
		assert(input, generated) {
			if (
				generated.family !== input.surface.lemmaFamily ||
				generated.kind !== input.surface.lemmaKind
			) {
				throw new Error(
					"Lemma family and kind must retain the Surface classification.",
				);
			}
		},
	},
	generationParams: {
		model: "gpt-5-nano",
		maxOutputTokens: 768,
	},
};
