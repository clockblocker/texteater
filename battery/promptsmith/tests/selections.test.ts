import { expect, test } from "bun:test";
import { defineGoldenCaseCollection, defineGoldenCorpus } from "promptsmith";
import { z } from "zod";
import { assertCaseSelectionsUncontaminated } from "../src/authoring/selection-contamination.js";

const inputSchema = z.strictObject({ stimulus: z.string() });
const outputSchema = z.strictObject({ answer: z.string() });
function makeCorpus(contaminationKeys: Record<string, string[]> = {}) {
	return defineGoldenCorpus({
		route: "selection",
		inputSchema,
		outputSchema,
		collections: {
			examples: defineGoldenCaseCollection({
				cases: Object.fromEntries(
					["a", "b", "c", "d", "e"].map((id) => [
						id,
						{
							input: { stimulus: id },
							idealOutput: { answer: `answer-${id}` },
							...(contaminationKeys[id] === undefined
								? {}
								: { contaminationKeys: contaminationKeys[id] }),
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
	expect(() => toUse.union(makeCorpus().all())).toThrow();
	expect(() => corpus.select(["missing"])).toThrow();
});

test("the contamination check accepts a clean split and rejects a shared case ID or contamination key", () => {
	const corpus = makeCorpus({ a: ["shared"], d: ["shared"] });
	const check = (demonstrations: string[], evaluation: string[]) => () =>
		assertCaseSelectionsUncontaminated({
			route: corpus.route,
			demonstrations: corpus.select(demonstrations),
			evaluation: corpus.select(evaluation),
		});
	expect(check(["a", "b"], ["c", "e"])).not.toThrow();
	expect(check(["a", "b"], ["c", "b"])).toThrow(
		'demonstration case "b" conflicts with evaluation case "b" by case ID',
	);
	expect(check(["a", "b"], ["c", "d"])).toThrow(
		'demonstration case "a" conflicts with evaluation case "d" by contamination key',
	);
});

test("a corpus rejects two cases with the same parsed input, so selections never share one", () => {
	expect(() =>
		defineGoldenCorpus({
			route: "selection",
			inputSchema,
			outputSchema,
			collections: {
				examples: defineGoldenCaseCollection({
					cases: {
						a: {
							input: { stimulus: "x" },
							idealOutput: { answer: "a" },
						},
						b: {
							input: { stimulus: "x" },
							idealOutput: { answer: "b" },
						},
					},
				}),
			},
		}),
	).toThrow("duplicate exact parsed-input fingerprints");
});
