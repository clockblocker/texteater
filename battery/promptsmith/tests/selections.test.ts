import { expect, test } from "bun:test";
import {
	assembleSystemPrompt,
	defineExperiment,
	defineGoldenCaseCollection,
	defineGoldenCorpus,
	definePromptSource,
} from "promptsmith";
import { z } from "zod";

const inputSchema = z.strictObject({ stimulus: z.string() });
const outputSchema = z.strictObject({ answer: z.string() });
function makeCorpus() {
	return defineGoldenCorpus({
		route: "selection",
		inputSchema,
		outputSchema,
		collections: {
			examples: defineGoldenCaseCollection(import.meta.url, {
				cases: Object.fromEntries(
					["a", "b", "c", "d", "e"].map((id) => [
						id,
						{
							input: { stimulus: id },
							idealOutput: { answer: `answer-${id}` },
						},
					]),
				),
			}),
		},
	});
}
test("set operations split one corpus into explicit demonstrations and held-out tests", () => {
	const corpus = makeCorpus();
	const toUse = corpus.select(["b"]).union(corpus.select(["a"]));
	const toTest = corpus.all().difference(toUse);
	expect(toUse.ids).toEqual(["b", "a"]);
	expect(toTest.ids).toEqual(["c", "d", "e"]);
	expect(toUse.intersection(toTest).isEmpty).toBe(true);
	expect(toUse.isDisjointFrom(toTest)).toBe(true);
	expect(toUse.union(toTest).ids).toHaveLength(5);
	const source = definePromptSource({
		route: corpus.route,
		inputSchema,
		outputSchema,
		body: "Answer",
		goldenCorpus: corpus,
		demonstrations: toUse,
	});
	const assembled = assembleSystemPrompt(source);
	expect(assembled).toContain("answer-a");
	expect(assembled).not.toContain("answer-c");
	expect(
		defineExperiment({
			promptSource: source,
			evaluation: toTest,
			evaluator: () => true,
		}).evaluation.ids,
	).toEqual(toTest.ids);
	expect(() => toUse.union(makeCorpus().all())).toThrow();
	expect(() => corpus.select(["missing"])).toThrow();
	expect(() =>
		defineExperiment({
			promptSource: source,
			evaluation: corpus.all(),
			evaluator: () => true,
		}),
	).toThrow();
});
