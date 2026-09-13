import { readingKnowledgeSchema } from "dumrel/schema";

declare const input: unknown;
const definition = readingKnowledgeSchema
	.pick({ definition: true })
	.parse(input);
export type DefinitionModel = typeof definition;
const tree = readingKnowledgeSchema.shape.morphologicalTree
	.unwrap()
	.parse(input);
type Reading = Extract<
	(typeof tree.root.children)[number],
	{ nodeKind: "morphemeReading" }
>["reading"];
export type ReadingFamily = Reading["lemma"]["family"];
const breakdown = readingKnowledgeSchema.shape.lexicalBreakdown
	.unwrap()
	.parse(input);
export type BreakdownFamily = (typeof breakdown)[number]["family"];
