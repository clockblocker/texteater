import { z } from "zod";

import type { Prompt } from "../prompt";

const featureValueSchema = z.union([z.string(), z.number(), z.boolean()]);
const featureSchema = z.strictObject({
	name: z.string().min(1),
	value: featureValueSchema,
});
const segmentSchema = z.strictObject({
	index: z.number().int().nonnegative(),
	kind: z.enum(["ResolvableText", "OpaqueText", "Whitespace", "Punctuation"]),
	text: z.string().min(1),
});

const inputSchema = z.strictObject({
	language: z.literal("de"),
	clickedSegmentIndex: z.number().int().nonnegative(),
	segments: z.array(segmentSchema).min(1),
});

const outputSchema = z.strictObject({
	surfaceSegmentIndices: z.array(z.number().int().nonnegative()).min(1),
	selectedOrthography: z.enum(["Standard", "Typo"]),
	surface: z.strictObject({
		normalizedSurface: z.string().min(1),
		kind: z.enum(["Citation", "Inflection"]),
		inflectionalFeatures: z.array(featureSchema),
		spelling: z.enum(["Canonical", "Variant"]),
		realizationCoverage: z.enum(["Full", "Partial"]),
	}),
	lemma: z.strictObject({
		canonicalForm: z.string().min(1),
		family: z.enum(["Lexeme", "Phraseme", "Morpheme", "Construction"]),
		kind: z.string().min(1),
		coreFeatures: z.array(featureSchema),
	}),
	reading: z.strictObject({
		emojiDescription: z.string().min(1),
	}),
});

export const deClickResolutionPrompt = {
	systemPrompt: `You resolve one clicked German ResolvableText Segment through
Selection -> Surface -> Lemma -> Reading for a hands-on linguistic laboratory.

Selection membership:
- surfaceSegmentIndices are ordered, unique ResolvableText indices and include
  clickedSegmentIndex.
- Include every and only attested Segment that participates in the grammatical
  Surface, including discontinuous particles or multiword expressions.
- selectedOrthography describes only the clicked Segment.

Surface:
- normalizedSurface may correct a typo or casing, but preserves contextual
  inflection and word order. Never lemmatize it or insert unattested lexical
  material.
- spelling is Canonical or Variant. A licensed variant is not a typo.
- realizationCoverage is Partial only when the attestation omits material from
  its Lemma; clicking one part of a complete multi-Segment Surface is Full.
- kind is Citation when the Surface is the citation form and Inflection when it
  is contextually inflected.

Lemma is structural grammatical identity with exactly canonicalForm, family,
kind, and coreFeatures. Lexeme, Phraseme, Morpheme, and Construction are peer
families. Use UD-style kind names for Lexemes (for example NOUN, VERB, DET) and
short camelCase feature names. Do not invent an opaque ID.

Reading is learner-scoped semantic identity. emojiDescription is a compact
emoji plus plain-language gloss for this contextual concept. Do not output
analysis, confidence, IDs, or prose outside the schema.`,
	inputSchema,
	outputSchema,
	outputPostcondition: {
		assert(input, generated) {
			const indices = generated.surfaceSegmentIndices;
			if (!indices.includes(input.clickedSegmentIndex)) {
				throw new Error(
					"Surface membership must include the clicked Segment.",
				);
			}
			for (let position = 0; position < indices.length; position += 1) {
				const index = indices[position];
				if (index === undefined) {
					throw new Error(
						"Surface membership cannot contain a missing index.",
					);
				}
				if (input.segments[index]?.kind !== "ResolvableText") {
					throw new Error(
						"Surface membership must reference ResolvableText.",
					);
				}
				if (position > 0 && (indices[position - 1] ?? index) >= index) {
					throw new Error(
						"Surface membership must be ordered and unique.",
					);
				}
			}

			const normalizedTokenCount = generated.surface.normalizedSurface
				.trim()
				.split(/\s+/u).length;
			if (normalizedTokenCount > indices.length) {
				throw new Error(
					"Normalized Surface cannot contain more lexical tokens than its member Segments.",
				);
			}
		},
	},
	generationParams: {
		model: "gpt-5-nano",
		maxOutputTokens: 1536,
	},
} satisfies Prompt<typeof inputSchema, typeof outputSchema>;
