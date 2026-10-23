import { readingKnowledgeSchema } from "dumrel/schema";

declare const input: unknown;
const definition = readingKnowledgeSchema
	.pick({ definition: true })
	.parse(input);
export type DefinitionModel = typeof definition;
const breakdown = readingKnowledgeSchema.shape.breakdown.unwrap().parse(input);
type Target = NonNullable<
	NonNullable<typeof breakdown.morphemes>[number]["target"]
>;
export type EndingFamily = Extract<Target, { kind: "Ending" }>["family"];
