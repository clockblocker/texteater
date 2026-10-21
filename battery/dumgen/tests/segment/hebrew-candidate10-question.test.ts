import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { segmentHebrewSentence } from "../../src/segment/he/segments.js";
import { stitchedText } from "../../src/segment/stitched-text.js";

// Saved actual candidate9 menu; stub-only checks, not model-choice evidence.
const contexts = [
	{
		sentence:
			"בגדול הבעיה היתה שהיה תנאי שבדק אם יש - כדי לא להציג כלום אלא שהוא לא טיפל במצב שיש ערך אחר.מה שגרם לכך שאו שהיה - ואז לא הוצג כלום או שהוצג מויקינתונים.",
		target: "הוצג",
		contrast:
			"In 'לא הוצג כלום', הוצג stays whole: it is a finite passive Hufal verb; ה belongs to the verb stem, not an article, so do not split ה + וצג.",
		criteria: {
			Prefixes1:
				"ה + וצג — independently clickable grammatical prefix(es) and remainder",
			AsWritten:
				"הוצג — no separable syntactic-word prefix in context; lexical or inflected form stays whole, including infinitival ל with its verb",
		},
	},
] as const;

for (const fixture of contexts) {
	test(`Hebrew candidate10 preserves observed context and menu for ${fixture.target}`, async () => {
		let inspected = 0;
		const result = await Effect.runPromise(
			segmentHebrewSentence(fixture.sentence, ({ questions, state }) => {
				expect(state.sentence).toBe(stitchedText(fixture.sentence));
				const written = state.written as Readonly<
					Record<string, string>
				>;
				for (const [id, question] of Object.entries(questions)) {
					if (
						written[`w${id.slice("source_".length)}`] !==
						fixture.target
					)
						continue;
					inspected++;
					if (question.type !== "choice")
						throw Error("Expected Choice");
					expect(question.criteria).toEqual(fixture.criteria);
					expect(String(question.instructions)).toContain(
						fixture.contrast,
					);
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
		expect(result.segments.map(({ text }) => text).join("")).toBe(
			stitchedText(fixture.sentence),
		);
	});
}
