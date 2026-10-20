import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { segmentHebrewSentence } from "../../src/segment/he/segments.js";
import { stitchedText } from "../../src/segment/stitched-text.js";

// Stub answers inspect actual questions, never predict contextual Jev choices.
const prefixCriterion =
	"independently clickable grammatical prefix(es) and remainder";

test("Hebrew candidate5 prefix criteria describe syntactic boundaries without requiring a bare root", async () => {
	let inspected = false;
	await Effect.runPromise(
		segmentHebrewSentence("ובהיותו ערמומי", ({ questions }) => {
			for (const question of Object.values(questions)) {
				if (question.type !== "choice") throw Error("Expected Choice");
				for (const [key, criterion] of Object.entries(
					question.criteria ?? {},
				)) {
					if (!key.startsWith("Prefixes")) continue;
					inspected = true;
					expect(String(criterion).split(" — ")[1]).toBe(
						prefixCriterion,
					);
				}
				expect(question.criteria?.AsWritten).toBe(
					"ובהיותו — no separable syntactic-word prefix in context; lexical or inflected form stays whole, including infinitival ל with its verb",
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
	expect(inspected).toBe(true);
});

const contexts = [
	{
		sentence:
			"שועל שעבר בסביבה הבחין בקרב בין הדוב והאריה ובהיותו ערמומי וחכם, תפס את הטרף ונמלט.",
		target: "ובהיותו",
		count: 1,
		contrast:
			"In the fable 'והאריה ובהיותו ערמומי וחכם', the outer ו in ובהיותו coordinates a new clause ('and, being cunning and wise'): it is a conjunction before the host בהיותו, not part of that host's lexical or inflected form. Establish that outer syntactic boundary independently of any further analysis inside בהיותו; this example does not prescribe its internal boundaries.",
		plans: { Prefixes1: "ו + בהיותו", Prefixes2: "ו + ב + היותו" },
	},
	{
		sentence:
			"עצב הווגוס מעצבב, בין היתר, את הלב (ופעילותו גורמת להאטת קצב הלב), את כלי הדם (ופעילותו גורמת להרחבתם ולהפחתת לחץ הדם) ואת הריאות (ופעילותו גורמת לכיווץ דרכי הנשימה).",
		target: "הווגוס",
		count: 1,
		contrast:
			"In 'עצב הווגוס מעצבב', הווגוס = ה + ווגוס: ה is a true definite article before the loan noun ווגוס ('vagus'). Retain both written ו letters in ווגוס; neither is an extra conjunction to strip. Contrast stem-initial ה in the whole noun הבדל ('difference').",
		plans: { Prefixes1: "ה + ווגוס" },
	},
	{
		sentence:
			"רציחות, ירי, הנחת מטעני חבלה, זריקת רימונים, דריסות מכוונות - לאחרונה אין יום שבו לא מתרחשים אירועים פליליים חמורים וחריגים ברחבי המדינה, מחולון ועד רהט, נתניה ועד הגליל.",
		target: "ועד",
		count: 2,
		contrast:
			"In the geographical range 'מחולון ועד רהט, נתניה ועד הגליל', each ועד = ו + עד: conjunction ו precedes the preposition עד ('as far as'), in both range phrases. Contrast 'ועד ראשי הרשויות' and 'ועדת הכספים': committee nouns ועד and ועדת stay whole. The spelling ועד alone does not decide between a committee noun and conjunction plus preposition; its syntactic role in this sentence does.",
		plans: { Prefixes1: "ו + עד" },
	},
] as const;

for (const fixture of contexts) {
	test(`Hebrew candidate5 question preserves contextual contrast for ${fixture.target}`, async () => {
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
					expect(Object.keys(question.criteria ?? {})).toEqual([
						...Object.keys(fixture.plans),
						"AsWritten",
					]);
					for (const [key, parts] of Object.entries(fixture.plans)) {
						expect(question.criteria?.[key]).toBe(
							`${parts} — ${prefixCriterion}`,
						);
					}
				}
				// No inner-host gold or real-model prediction is supplied here.
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
		expect(inspected).toBe(fixture.count);
		expect(result.segments.map(({ text }) => text).join("")).toBe(
			stitchedText(fixture.sentence),
		);
	});
}
