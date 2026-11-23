import { expect, test } from "bun:test";
import type { Question } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import { segmentHebrewSentence } from "../../src/segment/he/segments.js";
import { picked } from "./hebrew-choices.js";

for (const target of ["לִפְנֵי", "לפני"]) {
	test(`Hebrew lexical preposition ${target} has an explicit whole-source contrast`, async () => {
		const sentence = `נפגשנו ${target} ההרצאה.`;
		let question: Question | undefined;
		const result = await Effect.runPromise(
			segmentHebrewSentence(sentence, ({ questions, state }) => {
				const written = state.written as Readonly<
					Record<string, string>
				>;
				const id = Object.keys(questions).find(
					(key) =>
						written[`w${key.slice("source_".length)}`] === target,
				);
				if (id !== undefined) question = questions[id];
				return Effect.succeed(
					Object.fromEntries(
						Object.keys(questions).map((key) => [
							key,
							picked(key === id ? "AsWritten" : "Prefixes1"),
						]),
					),
				);
			}),
		);
		expect(question?.type).toBe("choice");
		if (question?.type !== "choice")
			throw new Error("Missing source choice");
		expect(Object.keys(question.criteria ?? {}).sort()).toEqual([
			"AsWritten",
			"Prefixes1",
		]);
		const instructions = String(question.instructions);
		expect(instructions).toContain("נפגשנו לִפְנֵי ההרצאה.");
		expect(instructions).toContain(
			"לִפְנֵי is the whole lexical preposition 'before'",
		);
		expect(instructions).toContain("choose AsWritten, not לִ + פְנֵי");
		expect(instructions).toContain(
			"Unpointed לפני likewise stays whole, not ל + פני",
		);
		expect(result.segments.map(({ text }) => text)).toEqual([
			"נפגשנו",
			" ",
			target,
			" ",
			"ה",
			"הרצאה",
			".",
		]);
		expect(result.segments.map(({ text }) => text).join("")).toBe(sentence);
	});
}
