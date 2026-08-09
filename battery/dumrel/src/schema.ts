import { z } from "zod";

export const relationFamilySchema = z.enum(["lexical", "morphological"]);

export const lexicalRelationSchema = z.enum([
	"synonym",
	"nearSynonym",
	"antonym",
	"hypernym",
	"hyponym",
	"meronym",
	"holonym",
]);

export const morphologicalRelationSchema = z.enum([
	"consistsOf",
	"usedIn",
	"derivedFrom",
	"sourceFor",
]);

export const relationSchema = z.union([
	lexicalRelationSchema,
	morphologicalRelationSchema,
]);

export function lexicalRelationsSchemaFor<T extends z.ZodType>(
	targetSchema: T,
) {
	return z.partialRecord(lexicalRelationSchema, z.array(targetSchema));
}

export function morphologicalRelationsSchemaFor<T extends z.ZodType>(
	targetSchema: T,
) {
	return z.partialRecord(morphologicalRelationSchema, z.array(targetSchema));
}

export function relationNotesSchemaFor<
	LexicalTarget extends z.ZodType,
	MorphologicalTarget extends z.ZodType,
>(targets: { lexical: LexicalTarget; morphological: MorphologicalTarget }) {
	return z.object({
		lexical: lexicalRelationsSchemaFor(targets.lexical).optional(),
		morphological: morphologicalRelationsSchemaFor(
			targets.morphological,
		).optional(),
	});
}

export function proposedRelationSchemaFor<
	ReadingSchema extends z.ZodType,
	LemmaSchema extends z.ZodType,
	PendingRefSchema extends z.ZodType,
>(targets: {
	reading: ReadingSchema;
	lemma: LemmaSchema;
	pendingRef: PendingRefSchema;
}) {
	return z.discriminatedUnion("relationFamily", [
		z.object({
			relationFamily: z.literal("lexical"),
			relation: lexicalRelationSchema,
			target: z.discriminatedUnion("kind", [
				z.object({
					kind: z.literal("existing"),
					reading: targets.reading,
				}),
				z.object({
					kind: z.literal("pending"),
					ref: targets.pendingRef,
				}),
			]),
		}),
		z.object({
			relationFamily: z.literal("morphological"),
			relation: morphologicalRelationSchema,
			target: z.discriminatedUnion("kind", [
				z.object({ kind: z.literal("existing"), lemma: targets.lemma }),
				z.object({
					kind: z.literal("pending"),
					ref: targets.pendingRef,
				}),
			]),
		}),
	]);
}
