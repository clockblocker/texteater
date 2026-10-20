import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { segmentHebrewSentence } from "../../src/segment/he/segments.js";
import { segmentHebrewUnits } from "../../src/segment/he/units.js";

const picked = (choice: string) => ({
	type: "choice" as const,
	choice,
	confidence: 1,
	probabilities: { [choice]: 1 },
});

test("Hebrew policy contextual membership admits article-Head but separates pronoun pieces", async () => {
	for (const [source, plan, pieces, expected] of [
		["הבית", "Prefixes1", ["ה", "בית"], [[0, 1]]],
		["מהבית", "Prefixes2", ["מ", "ה", "בית"], [[0], [1, 2]]],
		["הַסֵּפֶר", "Prefixes1", ["הַ", "סֵּפֶר"], [[0, 1]]],
		["לי", "Prefixes1", ["ל", "י"], [[0], [1]]],
		["בהם", "Prefixes1", ["ב", "הם"], [[0], [1]]],
		["לָה", "Prefixes1", ["לָ", "ה"], [[0], [1]]],
		["בין", "AsWritten", ["בין"], [[0]]],
		["לברר", "AsWritten", ["לברר"], [[0]]],
	] as const) {
		const segmentation = await Effect.runPromise(
			segmentHebrewSentence(source, ({ questions }) =>
				Effect.succeed(
					Object.fromEntries(
						Object.keys(questions).map((id) => [id, picked(plan)]),
					),
				),
			),
		);
		expect(segmentation.segments.map(({ text }) => text)).toEqual([
			...pieces,
		]);
		expect(segmentation.segments.map(({ text }) => text).join("")).toBe(
			source,
		);
		for (const joinArticle of [true, false]) {
			const units = await Effect.runPromise(
				segmentHebrewUnits(segmentation, ({ questions, state }) => {
					const candidates = state.candidates as Readonly<
						Record<string, string>
					>;
					return Effect.succeed(
						Object.fromEntries(
							Object.entries(questions).map(([id, question]) => {
								if (question.type === "choice") {
									expect(
										String(question.instructions),
									).toContain(
										"An article ה belongs to its noun or adjective Head",
									);
									expect(
										String(question.instructions),
									).toContain(
										"לָ + ה is ADP + PRON, not an article",
									);
									expect(
										String(question.instructions),
									).toContain(
										"ל + י and ב + הם stay separate",
									);
								}
								const article =
									candidates[id]?.includes(":ה|") ||
									candidates[id]?.includes(":הַ|");
								return [
									id,
									picked(
										joinArticle && article
											? "Join"
											: "Separate",
									),
								];
							}),
						),
					);
				}),
			);
			expect(units.map(({ segments }) => segments)).toEqual(
				joinArticle
					? expected.map((indices) => [...indices])
					: pieces.map((_, i) => [i]),
			);
			expect(units.every(({ route }) => route === "Unresolved")).toBe(
				true,
			);
		}
	}
});

// These local answers exercise offered plans and wording, not Jev's choices.
test("Hebrew policy source question teaches exact preposition-pronoun pieces", async () => {
	for (const [source, plan, pieces] of [
		["לי", "Prefixes1", ["ל", "י"]],
		["לִי", "Prefixes1", ["לִ", "י"]],
		["בהם", "Prefixes1", ["ב", "הם"]],
		["שבהם", "Prefixes2", ["ש", "ב", "הם"]],
		["בו", "Prefixes1", ["ב", "ו"]],
		["להם", "Prefixes1", ["ל", "הם"]],
		["בי", "Prefixes1", ["ב", "י"]],
		["לו", "Prefixes1", ["ל", "ו"]],
		["לכם", "Prefixes1", ["ל", "כם"]],
		["לך", "Prefixes1", ["ל", "ך"]],
		["לָה", "Prefixes1", ["לָ", "ה"]],
		["לָכֶם", "Prefixes1", ["לָ", "כֶם"]],
		["מהן", "Prefixes1", ["מ", "הן"]],
	] as const) {
		const result = await Effect.runPromise(
			segmentHebrewSentence(source, ({ questions }) => {
				const question = questions.source_0;
				expect(question?.type).toBe("choice");
				if (question?.type === "choice") {
					expect(question.criteria).toHaveProperty(plan);
					expect(String(question.instructions)).toContain(
						`${source} = ${pieces.join(" + ")}`,
					);
					expect(String(question.instructions)).toContain(
						"never expand a source piece into a pronoun Lemma",
					);
					for (const obsolete of [
						"keep inflected בהם whole",
						"stay whole, not לִ + י",
						"לָה ('to her') is one Segment",
						"לכם stays whole",
						"לך stays whole",
						"לָכֶם stays whole",
						"בי is one inflected preposition",
						"להם ('to them') remains one Segment",
						"לו ('to him') remains one Segment",
					])
						expect(String(question.instructions)).not.toContain(
							obsolete,
						);
				}
				return Effect.succeed(
					Object.fromEntries(
						Object.keys(questions).map((id) => [id, picked(plan)]),
					),
				);
			}),
		);
		expect(result.segments.map(({ text }) => text)).toEqual([...pieces]);
		expect(result.segments.map(({ text }) => text).join("")).toBe(source);
	}
});
