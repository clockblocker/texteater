import { z } from "zod";
import {
	morphologicalRelationValues,
	semanticRelationValues,
} from "./relation-vocabulary.js";

export const relationFamilySchema = z.enum(["lexical", "morphological"]);

export const semanticRelationSchema = z.enum(semanticRelationValues);

/** @deprecated Use semanticRelationSchema. */
export const lexicalRelationSchema = semanticRelationSchema;

/** @deprecated New writes use Reading Knowledge Morphological Tree. */
export const morphologicalRelationSchema = z.enum(morphologicalRelationValues);

export const relationSchema = z.union([
	semanticRelationSchema,
	morphologicalRelationSchema,
]);

export function semanticRelationsSchemaFor<T extends z.ZodType>(
	targetSchema: T,
) {
	return z.partialRecord(semanticRelationSchema, z.array(targetSchema));
}

/** @deprecated Use semanticRelationsSchemaFor. */
export const lexicalRelationsSchemaFor = semanticRelationsSchemaFor;

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
		lexical: semanticRelationsSchemaFor(targets.lexical).optional(),
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
			relation: semanticRelationSchema,
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
