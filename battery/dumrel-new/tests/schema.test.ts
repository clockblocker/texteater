import { expect, test } from "bun:test";
import {
	knowledgeChangeSchema,
	pendingSemanticRelationSchema,
	readingKnowledgeSchema,
} from "../src/schemas.js";

test("canonical schemas retain concrete Zod composition surfaces", () => {
	expect(
		readingKnowledgeSchema
			.pick({ definition: true })
			.parse({ definition: " x " }),
	).toEqual({ definition: "x" });
	expect(
		knowledgeChangeSchema.safeParse({
			kind: "Retract",
			aspect: "definition",
		}).success,
	).toBe(true);
	expect(
		pendingSemanticRelationSchema.shape.target.options.every(
			(schema) => schema.shape.family !== undefined,
		),
	).toBe(true);
});

test("canonical schemas reject malformed Dumling relation targets", () => {
	expect(
		readingKnowledgeSchema.safeParse({
			semanticRelations: { synonym: [{}] },
		}).success,
	).toBe(false);
});

test("Knowledge change schemas correlate structured aspects with their values", () => {
	expect(
		knowledgeChangeSchema.safeParse({
			kind: "Contribute",
			aspect: "lexicalBreakdown",
			value: {
				root: {
					nodeKind: "structure",
					children: [{ nodeKind: "morphemeReading", reading: {} }],
				},
			},
		}).success,
	).toBe(false);
});
