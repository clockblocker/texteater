import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { segmentHebrewSentence } from "../../src/segment/he/segments.js";
import { stitchedText } from "../../src/segment/stitched-text.js";

// Stub-only prompt/menu assertions, not evidence of contextual model choices.
const contexts = [
	{
		sentence:
			"למי שבן משפחתו מקרבה ראשונה (אב או אח) סבל מסרטן ערמונית בגיל צעיר או מסרטן אלים של הערמונית, מומלץ לדון עם הרופא/ה על התועלת שבביצוע הבדיקה לעומת הנזק האפשרי.",
		target: "שבן",
		contrast:
			"In 'למי שבן משפחתו', שבן = ש + בן: relative ש precedes the construct noun בן ('family member'); בן does not absorb ש. Do not strip the noun בן into ב + ן.",
		plans: {
			Prefixes1: "ש + בן",
			Prefixes2: "ש + ב + ן",
			AsWritten: "שבן",
		},
	},
	{
		sentence:
			"צבי תמים שחלף ביניהם נפל להם קורבן, אבל אף אחד מהם לא רצה לחלק את הטרף בצורה הוגנת ושניהם בחרו באלימות כדי להכריע האחד את השני.",
		target: "מהם",
		contrast:
			"In 'אף אחד מהם', מהם = מ + הם ('of them'): separate the preposition מ and retain the written plural pronoun הם intact, never מ + ה + ם; ה is not an article here. Contrast מהימים = מ + ה + ימים, with a true article.",
		plans: {
			Prefixes1: "מ + הם",
			Prefixes2: "מ + ה + ם",
			AsWritten: "מהם",
		},
	},
] as const;

for (const fixture of contexts) {
	test(`Hebrew candidate7 question preserves contextual contrast for ${fixture.target}`, async () => {
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
					expect(String(question.instructions)).toContain(
						fixture.contrast,
					);
					expect(Object.keys(question.criteria ?? {})).toEqual(
						Object.keys(fixture.plans),
					);
					for (const [key, parts] of Object.entries(fixture.plans)) {
						expect(question.criteria?.[key]).toBe(
							key === "AsWritten"
								? `${parts} — no separable syntactic-word prefix in context; lexical or inflected form stays whole, including infinitival ל with its verb`
								: `${parts} — independently clickable grammatical prefix(es) and remainder`,
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
		expect(inspected).toBe(1);
		expect(result.segments.map(({ text }) => text).join("")).toBe(
			stitchedText(fixture.sentence),
		);
	});
}
