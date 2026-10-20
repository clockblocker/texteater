import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { segmentHebrewSentence } from "../../src/segment/he/segments.js";

// Stub-only criterion rollback check, not evidence of contextual model choices.
test("Hebrew candidate6 restores the exact original generic prefix criterion", async () => {
	let inspected = 0;
	await Effect.runPromise(
		segmentHebrewSentence("ובהיותו ערמומי", ({ questions }) => {
			for (const question of Object.values(questions)) {
				if (question.type !== "choice") throw Error("Expected Choice");
				for (const [key, criterion] of Object.entries(
					question.criteria ?? {},
				)) {
					if (!key.startsWith("Prefixes")) continue;
					inspected++;
					expect(String(criterion).split(" — ")[1]).toBe(
						"independently clickable grammatical prefix(es) and remainder",
					);
				}
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
	expect(inspected).toBeGreaterThan(0);
});
