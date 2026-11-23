import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { segmentHebrewSentence } from "../../src/segment/he/segments.js";
import { stitchedText } from "../../src/segment/stitched-text.js";

// Complete observed inputs; these inspect wording/menus, not Jev predictions.
const medical =
	"עצב הווגוס מעצבב, בין היתר, את הלב (ופעילותו גורמת להאטת קצב הלב), את כלי הדם (ופעילותו גורמת להרחבתם ולהפחתת לחץ הדם) ואת הריאות (ופעילותו גורמת לכיווץ דרכי הנשימה).";
const cases = [
	{
		sentence: "יש לגשת לאחת מתחנות הצילום עם תעודת זהות או דרכון.",
		target: "לאחת",
		expected: ["ל", "אחת"],
	},
	{ sentence: medical, target: "להאטת", expected: ["ל", "האטת"] },
	{ sentence: medical, target: "להרחבתם", expected: ["ל", "הרחבתם"] },
	{
		sentence:
			'"מפקדו של טויבי שמע את אירוע התקיפה", נכתב, "בין היתר מאביו של השוטר שהותקף, אך נמנע מלדווח על האירוע לגורמים הרלוונטיים, כפי שמחויב לעשות".',
		target: "מלדווח",
		expected: ["מ", "לדווח"],
	},
] as const;

const additiveContrast =
	"Keeping infinitival ל with its verb does not absorb a preposition before a non-verb or outside that infinitive. In 'יש לגשת לאחת מתחנות הצילום', לאחת = ל + אחת ('to one of'), not an infinitive; לגשת stays whole. In 'גורמת להאטת קצב הלב', להאטת = ל + האטת: האטת is a construct noun ('slowing of'), unlike the whole infinitive להאט. In 'גורמת להרחבתם ולהפחתת לחץ הדם', להרחבתם = ל + הרחבתם: הרחבתם is a noun with its suffix retained, unlike the whole infinitive להרחיב; ולהפחתת = ו + ל + הפחתת. In 'נמנע מלדווח על האירוע', מלדווח = מ + לדווח: the outer preposition מ separates, while infinitival ל stays inside לדווח, never מ + ל + דווח.";

for (const fixture of cases) {
	test(`Hebrew candidate2 question distinguishes nominal or outer preposition in ${fixture.target}`, async () => {
		let inspected = false;
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
					inspected = true;
					if (question.type !== "choice")
						throw Error("Expected source Choice");
					const criteria = question.criteria ?? {};
					expect(Object.keys(criteria)).toEqual([
						"Prefixes1",
						"AsWritten",
					]);
					expect(String(criteria.Prefixes1)).toBe(
						`${fixture.expected.join(" + ")} — independently clickable grammatical prefix(es) and remainder`,
					);
					expect(String(criteria.AsWritten)).toBe(
						`${fixture.target} — no separable syntactic-word prefix in context; lexical or inflected form stays whole, including infinitival ל with its verb`,
					);
					expect(String(question.instructions)).toContain(
						additiveContrast,
					);
				}
				// Local fallback answers test reconstruction only, not target correctness.
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
			stitchedText(fixture.sentence),
		);
	});
}
