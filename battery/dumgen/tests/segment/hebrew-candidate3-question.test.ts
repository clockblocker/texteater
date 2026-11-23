import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { segmentHebrewSentence } from "../../src/segment/he/segments.js";
import { stitchedText } from "../../src/segment/stitched-text.js";

// Exact complete observed inputs. This freezes wording and menus, not Jev answers.
const cases = [
	{
		sentence: "אופים כשעה ו-20 דקות.",
		target: "כשעה",
		plans: {
			Prefixes1: "כ + שעה",
			Prefixes2: "כ + ש + עה",
			TemporalKshe: "כש + עה",
		},
		contrast:
			"In 'אופים כשעה ו-20 דקות', כשעה = כ + שעה ('about an hour'): שעה remains the whole noun, not ש + עה, and כ is approximation, not temporal כש ('when').",
	},
	{
		sentence: "בחרו בהגדרות ואז בחרו בכל ההגדרות.",
		target: "ואז",
		plans: { Prefixes1: "ו + אז" },
		contrast:
			"In 'בחרו בהגדרות ואז בחרו בכל ההגדרות', ואז = ו + אז ('and then'); the adverb אז does not absorb the conjunction.",
	},
	{
		sentence:
			"שועל שעבר בסביבה הבחין בקרב בין הדוב והאריה ובהיותו ערמומי וחכם, תפס את הטרף ונמלט.",
		target: "ובהיותו",
		plans: { Prefixes1: "ו + בהיותו", Prefixes2: "ו + ב + היותו" },
		contrast:
			"In 'והאריה ובהיותו ערמומי וחכם', separate the outer conjunction ו in ובהיותו; uncertainty about boundaries inside בהיותו does not make the entire ובהיותו AsWritten. This outer-boundary example does not prescribe the host's internal segmentation.",
	},
	{
		sentence:
			"רצוי שההנקה הראשונית תיעשה בשעתיים הראשונות לאחר הלידה, כל עוד התינוק ערני ומוכן ליניקה.",
		target: "שההנקה",
		plans: { Prefixes1: "ש + ההנקה", Prefixes2: "ש + ה + הנקה" },
		contrast:
			"In 'רצוי שההנקה הראשונית תיעשה', שההנקה = ש + ה + הנקה: relative/complementizer ש and the true article ה separate, while the next ה belongs to the noun הנקה ('breastfeeding') and remains in that stem.",
	},
	{
		sentence:
			'העותר קובל על כך שהוועדה לא מצאה לזמן את ד"ר קמיר לשימוע ולברר את הדברים שהציגה, וסבור כי הדבר מטיל צל על התנהלותה.',
		target: "לשימוע",
		plans: { Prefixes1: "ל + שימוע" },
		contrast:
			"In 'לזמן את ד\"ר קמיר לשימוע ולברר', לשימוע = ל + שימוע ('to a hearing'), a preposition before a noun; contrast לשמוע ('to hear'), a whole infinitive. לזמן and לברר remain whole verb forms after any outer conjunction.",
	},
	{
		sentence:
			"שיטת הבישול של ׳להכניס הכל לסיר׳ הייתה נפוצה בתקופת הצנע והציעה פתרון קל ויעיל להאכיל מספר רב של פיות.",
		target: "והציעה",
		plans: { Prefixes1: "ו + הציעה", Prefixes2: "ו + ה + ציעה" },
		contrast:
			"In 'בתקופת הצנע והציעה פתרון קל ויעיל', והציעה = ו + הציעה ('and offered'): ו separates but ה is part of the finite verb הציעה, not an article before ציעה.",
	},
	{
		sentence:
			"עקוב אחר ההוראות למטה כדי ללמוד כיצד לגשת בקלות למשאב הנהדר הזה.",
		target: "למשאב",
		plans: { Prefixes1: "ל + משאב" },
		contrast:
			"In 'כדי ללמוד כיצד לגשת בקלות למשאב הנהדר הזה', למשאב = ל + משאב ('to the resource'), a preposition before the noun משאב; ללמוד and לגשת remain whole infinitives in the very same sentence.",
	},
] as const;

for (const fixture of cases) {
	test(`Hebrew candidate3 question preserves contextual boundary contrast for ${fixture.target}`, async () => {
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
					const expected = Object.fromEntries(
						Object.entries(fixture.plans).map(([key, parts]) => [
							key,
							`${parts} — ${key === "TemporalKshe" ? "temporal כש meaning when is one clickable connector" : "independently clickable grammatical prefix(es) and remainder"}`,
						]),
					);
					expect(question.criteria).toEqual({
						...expected,
						AsWritten: `${fixture.target} — no separable syntactic-word prefix in context; lexical or inflected form stays whole, including infinitival ל with its verb`,
					});
					expect(String(question.instructions)).toContain(
						fixture.contrast,
					);
				}
				// Stub fallback checks source reconstruction only, not target correctness.
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
