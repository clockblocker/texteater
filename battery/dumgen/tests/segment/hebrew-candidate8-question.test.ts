import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { segmentHebrewSentence } from "../../src/segment/he/segments.js";

// Stub-only wording regression; not evidence of contextual model choices.
test("Hebrew candidate8 replaces invented whole שהרי contrast with offered בן contrast", async () => {
	let inspected = 0;
	await Effect.runPromise(
		segmentHebrewSentence("למי שבן משפחתו", ({ questions, state }) => {
			const written = state.written as Readonly<Record<string, string>>;
			for (const [id, question] of Object.entries(questions)) {
				if (written[`w${id.slice("source_".length)}`] !== "שבן")
					continue;
				inspected++;
				if (question.type !== "choice") throw Error("Expected Choice");
				const instructions = String(question.instructions);
				expect(instructions).not.toContain(
					"Contrast lexical שהרי, which stays whole.",
				);
				expect(instructions).toContain(
					"Do not strip the noun בן into ב + ן.",
				);
				expect(question.criteria?.Prefixes1).toStartWith("ש + בן —");
				expect(question.criteria?.Prefixes2).toStartWith("ש + ב + ן —");
			}
			return Effect.succeed(
				Object.fromEntries(
					Object.keys(questions).map((id) => [
						id,
						{
							type: "choice" as const,
							choice: "AsWritten",
							confidence: 1,
							probabilities: { AsWritten: 1 },
						},
					]),
				),
			);
		}),
	);
	expect(inspected).toBe(1);
});
