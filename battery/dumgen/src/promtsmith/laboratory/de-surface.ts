import { z } from "zod";

import type { Prompt } from "../prompt-definition";
import {
	assertUniqueFeatureNames,
	germanLemmaFamilySchema,
	germanLemmaKindSchema,
	hasGermanLemmaSchema,
	hasGermanSurfaceSchema,
	indexedSegmentSchema,
	namedFeatureSchema,
	surfaceFeaturesSchema,
} from "./de-classification-shared";

const inputSchema = z.strictObject({
	language: z.literal("de"),
	clickedSegmentIndex: z.number().int().nonnegative(),
	segments: z.array(indexedSegmentSchema).min(1),
	selection: z.strictObject({
		surfaceSegmentIndices: z.array(z.number().int().nonnegative()).min(1),
		attestedSurface: z.string().min(1),
		selectedOrthography: z.enum(["Standard", "Typo"]),
	}),
});

const outputSchema = z.strictObject({
	normalizedSurface: z.string().trim().min(1),
	spelling: z.enum(["Canonical", "Variant"]),
	realizationCoverage: z.enum(["Full", "Partial"]),
	surfaceKind: z.enum(["Citation", "Inflection"]),
	surfaceFeatures: surfaceFeaturesSchema,
	inflectionalFeatures: z.array(namedFeatureSchema),
	lemmaFamily: germanLemmaFamilySchema,
	lemmaKind: germanLemmaKindSchema,
});

export const deSurfacePrompt = {
	systemPrompt: `You classify the German Surface for a laboratory Selection.

normalizedSurface repairs a typo or casing when necessary, but preserves the
attested contextual inflection and constituent order. Never lemmatize it,
insert unattested lexical material, or expand an abbreviation. spelling is
Canonical or Variant; licensed variants are not typos. realizationCoverage is
Partial only when this attestation omits material from the eventual Lemma.
Clicking one member of a complete multi-Segment Surface is still Full.

surfaceKind is Citation when the Surface is in citation form and Inflection
when it is contextually inflected. Emit every applicable Dumling
inflectional-feature field as a unique name/value pair, using null for an
unmarked value; Citation must emit an empty array. surfaceFeatures is null
unless historicalStatus is Archaic.

lemmaFamily and lemmaKind select an existing German Dumling grammatical schema
for the next stage. They are structural classification only. Do not emit a
Lemma, Reading, meaning, confidence, or explanation.`,
	inputSchema,
	outputSchema,
	outputPostcondition: {
		assert(input, generated) {
			assertUniqueFeatureNames(
				generated.inflectionalFeatures,
				"inflectionalFeatures",
			);
			if (
				!hasGermanLemmaSchema(
					generated.lemmaFamily,
					generated.lemmaKind,
				) ||
				!hasGermanSurfaceSchema(
					generated.surfaceKind,
					generated.lemmaFamily,
					generated.lemmaKind,
				)
			) {
				throw new Error(
					"Surface classification must select an existing German Dumling schema.",
				);
			}
			if (
				generated.surfaceKind === "Citation" &&
				generated.inflectionalFeatures.length !== 0
			) {
				throw new Error(
					"Citation Surfaces cannot contain inflectional features.",
				);
			}
			const normalizedTokenCount = generated.normalizedSurface
				.trim()
				.split(/\s+/u).length;
			if (
				normalizedTokenCount >
				input.selection.surfaceSegmentIndices.length
			) {
				throw new Error(
					"Normalized Surface cannot contain more lexical tokens than its member Segments.",
				);
			}
		},
	},
	generationParams: {
		model: "gpt-5-nano",
		maxOutputTokens: 768,
	},
} satisfies Prompt<typeof inputSchema, typeof outputSchema>;
