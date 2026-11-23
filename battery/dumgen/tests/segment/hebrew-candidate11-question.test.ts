import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { segmentHebrewSentence } from "../../src/segment/he/segments.js";
import { stitchedText } from "../../src/segment/stitched-text.js";

// Exact complete candidate10 inputs and saved menus; stub-only, not model-choice evidence.
const contexts = [
	{
		sentence:
			'נבחרו נשים המוגדרות כ"סיכון נמוך": מטופלות מעל גיל 60 שנה, עם שאת צינורית מסתננת בשלב המוקדם (שאת < 2 ס"מ) וללא חשד קליני או חשד בסקירת על שמע (US) למעורבות קשריות לימפה בבית השחי.',
		target: "שאת",
		contrast:
			"In 'עם שאת צינורית מסתננת' and '(שאת < 2 ס\"מ)', both occurrences of שאת are the medical noun 'neoplasm' and stay whole, not ש + את.",
		slots: [
			{
				id: "source_25",
				criteria: {
					Prefixes1:
						"ש + את — independently clickable grammatical prefix(es) and remainder",
					AsWritten:
						"שאת — no separable syntactic-word prefix in context; lexical or inflected form stays whole, including infinitival ל with its verb",
				},
			},
			{
				id: "source_36",
				criteria: {
					Prefixes1:
						"ש + את — independently clickable grammatical prefix(es) and remainder",
					AsWritten:
						"שאת — no separable syntactic-word prefix in context; lexical or inflected form stays whole, including infinitival ל with its verb",
				},
			},
		],
	},
	{
		sentence:
			"עקוב אחר ההוראות למטה כדי ללמוד כיצד לגשת בקלות למשאב הנהדר הזה.",
		target: "בקלות",
		contrast:
			"In 'לגשת בקלות למשאב', בקלות = ב + קלות ('with ease'): preposition plus noun.",
		slots: [
			{
				id: "source_16",
				criteria: {
					Prefixes1:
						"ב + קלות — independently clickable grammatical prefix(es) and remainder",
					AsWritten:
						"בקלות — no separable syntactic-word prefix in context; lexical or inflected form stays whole, including infinitival ל with its verb",
				},
			},
		],
	},
	{
		sentence:
			'לא ידוע לי על מפעיל כלשהו מבין המצביעים האלה ששויך אי פעם ל"קבוצת הטיה" כזו או אחרת, ואני לא חושב שאפשר לחשוד באי מי ממפעילים אלה שהוא פועל ממניעים פוליטיים.',
		target: "הטיה",
		contrast:
			"In 'קבוצת הטיה', הטיה is the whole noun 'bias'; its initial ה belongs to the stem, not an article, so do not split ה + טיה.",
		slots: [
			{
				id: "source_26",
				criteria: {
					Prefixes1:
						"ה + טיה — independently clickable grammatical prefix(es) and remainder",
					AsWritten:
						"הטיה — no separable syntactic-word prefix in context; lexical or inflected form stays whole, including infinitival ל with its verb",
				},
			},
		],
	},
] as const;

for (const fixture of contexts) {
	test(`Hebrew candidate11 preserves observed context and menus for ${fixture.target}`, async () => {
		const inspected = new Set<string>();
		const result = await Effect.runPromise(
			segmentHebrewSentence(fixture.sentence, ({ questions, state }) => {
				expect(state.sentence).toBe(stitchedText(fixture.sentence));
				const written = state.written as Readonly<
					Record<string, string>
				>;
				for (const slot of fixture.slots) {
					const question = questions[slot.id];
					if (!question) continue;
					expect(written[`w${slot.id.slice("source_".length)}`]).toBe(
						fixture.target,
					);
					if (question.type !== "choice")
						throw Error("Expected Choice");
					expect(question.criteria).toEqual(slot.criteria);
					expect(String(question.instructions)).toContain(
						fixture.contrast,
					);
					inspected.add(slot.id);
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
		expect([...inspected].sort()).toEqual(
			fixture.slots.map(({ id }) => id).sort(),
		);
		expect(result.segments.map(({ text }) => text).join("")).toBe(
			stitchedText(fixture.sentence),
		);
	});
}
