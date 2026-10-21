import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { segmentHebrewSentence } from "../../src/segment/he/segments.js";
import { stitchedText } from "../../src/segment/stitched-text.js";

// Exact observed nominal context plus an explicitly synthetic, corpus-based
// infinitive contrast. Stub answers verify wording/menus, not Jev selection.
test("Hebrew candidate4 question contrasts nominal לעניין with its whole infinitive homograph", async () => {
	const contrast =
		"In 'לקשור את חסימתו ... לעניין התלונה', לעניין = ל + עניין: the linking target is the noun עניין ('matter of the complaint'), with no unwritten ה inserted. Contrast the synthetic example 'כדי לעניין צרכנים', where לעניין ('to interest consumers') is a whole infinitive; decide by context, not spelling alone.";
	const sentences = [
		"יחד עם זאת, אני מצטרף לדברי יואב מעליי, ומצר על הניסיון (המלאכותי בעיניי) לקשור את חסימתו המוצדקת וה־long overdue של יעקב לעניין התלונה במטא.",
		"כדי לעניין צרכנים",
	];
	for (const sentence of sentences) {
		let inspected = false;
		const result = await Effect.runPromise(
			segmentHebrewSentence(sentence, ({ questions, state }) => {
				expect(state.sentence).toBe(stitchedText(sentence));
				const written = state.written as Readonly<
					Record<string, string>
				>;
				for (const [id, question] of Object.entries(questions)) {
					if (written[`w${id.slice("source_".length)}`] !== "לעניין")
						continue;
					inspected = true;
					if (question.type !== "choice")
						throw Error("Expected source Choice");
					expect(question.criteria).toEqual({
						Prefixes1:
							"ל + עניין — independently clickable grammatical prefix(es) and remainder",
						AsWritten:
							"לעניין — no separable syntactic-word prefix in context; lexical or inflected form stays whole, including infinitival ל with its verb",
					});
					expect(String(question.instructions)).toContain(contrast);
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
		expect(inspected).toBe(true);
		expect(result.segments.map(({ text }) => text).join("")).toBe(
			stitchedText(sentence),
		);
	}
});
