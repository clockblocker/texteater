import { codecBuilder4 } from "codec-builder-library/v4";
import { z } from "zod";

import { outputSchema as grammaticalOutputSchema } from "./prompt-part/grammatical-resolution/de/lexeme/noun/output-schema";

const resolvedGrammarSchema = grammaticalOutputSchema.options[0];
const modelLemmaSchema = resolvedGrammarSchema.shape.lemma;
const modelSurfaceSchemas = resolvedGrammarSchema.shape.surface.options;

const addLemmaLanguage = codecBuilder4.buildReshapeCodec(modelLemmaSchema, {
	fieldName: "language",
	fieldSchema: z.literal("de"),
	construct: () => "de" as const,
	reconstruct: () => ({}),
});
const addLemmaFamily = codecBuilder4.buildReshapeCodec(addLemmaLanguage.out, {
	fieldName: "family",
	fieldSchema: z.literal("Lexeme"),
	construct: () => "Lexeme" as const,
	reconstruct: () => ({}),
});
const addLemmaKind = codecBuilder4.buildReshapeCodec(addLemmaFamily.out, {
	fieldName: "kind",
	fieldSchema: z.literal("NOUN"),
	construct: () => "NOUN" as const,
	reconstruct: () => ({}),
});

export const deNounLemmaCodec = codecBuilder4.helpers.pipeCodecs(
	codecBuilder4.helpers.pipeCodecs(addLemmaLanguage, addLemmaFamily),
	addLemmaKind,
);

type DeNounLemma = z.output<typeof deNounLemmaCodec.out>;

export function buildDeNounCitationSurfaceCodec(lemma: DeNounLemma) {
	const addLanguage = codecBuilder4.buildReshapeCodec(
		modelSurfaceSchemas[0],
		{
			fieldName: "language",
			fieldSchema: z.literal("de"),
			construct: () => "de" as const,
			reconstruct: () => ({}),
		},
	);
	const addLemma = codecBuilder4.buildReshapeCodec(addLanguage.out, {
		fieldName: "lemma",
		fieldSchema: deNounLemmaCodec.out,
		construct: () => lemma,
		reconstruct: () => ({}),
	});
	return codecBuilder4.helpers.pipeCodecs(addLanguage, addLemma);
}

export function buildDeNounInflectionSurfaceCodec(lemma: DeNounLemma) {
	const addLanguage = codecBuilder4.buildReshapeCodec(
		modelSurfaceSchemas[1],
		{
			fieldName: "language",
			fieldSchema: z.literal("de"),
			construct: () => "de" as const,
			reconstruct: () => ({}),
		},
	);
	const addLemma = codecBuilder4.buildReshapeCodec(addLanguage.out, {
		fieldName: "lemma",
		fieldSchema: deNounLemmaCodec.out,
		construct: () => lemma,
		reconstruct: () => ({}),
	});
	return codecBuilder4.helpers.pipeCodecs(addLanguage, addLemma);
}
