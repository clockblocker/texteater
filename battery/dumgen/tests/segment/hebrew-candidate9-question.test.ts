import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { segmentHebrewSentence } from "../../src/segment/he/segments.js";
import { stitchedText } from "../../src/segment/stitched-text.js";

// Saved actual candidate8 menus; stub-only checks, not model-choice evidence.
const contexts = [
	{
		sentence:
			"צבי תמים שחלף ביניהם נפל להם קורבן, אבל אף אחד מהם לא רצה לחלק את הטרף בצורה הוגנת ושניהם בחרו באלימות כדי להכריע האחד את השני.",
		target: "ושניהם",
		contrast:
			"In 'ושניהם בחרו באלימות', ושניהם = ו + שניהם: conjunction ו coordinates the clause; retain שניהם intact, not ש + ניהם.",
		criteria: {
			Prefixes1:
				"ו + שניהם — independently clickable grammatical prefix(es) and remainder",
			Prefixes2:
				"ו + ש + ניהם — independently clickable grammatical prefix(es) and remainder",
			AsWritten:
				"ושניהם — no separable syntactic-word prefix in context; lexical or inflected form stays whole, including infinitival ל with its verb",
		},
	},
	{
		sentence: "מהן הסיבות האפשריות להתעלפות?",
		target: "להתעלפות",
		contrast:
			"In 'הסיבות האפשריות להתעלפות', להתעלפות = ל + התעלפות: ל precedes the event noun התעלפות, not an infinitive; retain the noun intact.",
		criteria: {
			Prefixes1:
				"ל + התעלפות — independently clickable grammatical prefix(es) and remainder",
			AsWritten:
				"להתעלפות — no separable syntactic-word prefix in context; lexical or inflected form stays whole, including infinitival ל with its verb",
		},
	},
	{
		sentence:
			"לירושלים יינתנו עדיפויות מיוחדות בפעילויות של רשויות המדינה לפיתוחה של ירושלים בנושאי משק וכלכלה ובנושאים אחרים.",
		target: "וכלכלה",
		contrast:
			"In 'בנושאי משק וכלכלה', וכלכלה = ו + כלכלה: conjunction ו coordinates the nouns; retain כלכלה intact, not כ + לכלה.",
		criteria: {
			Prefixes1:
				"ו + כלכלה — independently clickable grammatical prefix(es) and remainder",
			Prefixes2:
				"ו + כ + לכלה — independently clickable grammatical prefix(es) and remainder",
			AsWritten:
				"וכלכלה — no separable syntactic-word prefix in context; lexical or inflected form stays whole, including infinitival ל with its verb",
		},
	},
	{
		sentence:
			"אנו מדווחים על תוצאות 100 הנשים הראשונות, עם מעקב של יותר משלוש שנים לאחר הניתוח ומעקב חציוני של 63 חודשים.",
		target: "משלוש",
		contrast:
			"In 'יותר משלוש שנים', משלוש = מ + שלוש: comparative מ precedes the numeral שלוש; retain the numeral intact, not ש + לוש.",
		criteria: {
			Prefixes1:
				"מ + שלוש — independently clickable grammatical prefix(es) and remainder",
			Prefixes2:
				"מ + ש + לוש — independently clickable grammatical prefix(es) and remainder",
			TemporalMishe:
				"מש + לוש — temporal מש meaning once or since is one clickable connector",
			AsWritten:
				"משלוש — no separable syntactic-word prefix in context; lexical or inflected form stays whole, including infinitival ל with its verb",
		},
	},
	{
		sentence:
			"ההנקה והקרבה מסייעות לכיווץ רחם האם ולהעברת גורמי חיסון מגוף האם לתינוק.",
		target: "לכיווץ",
		contrast:
			"In 'מסייעות לכיווץ רחם האם', לכיווץ = ל + כיווץ: ל precedes the event noun כיווץ, not an infinitive; retain the noun intact, not כ + יווץ.",
		criteria: {
			Prefixes1:
				"ל + כיווץ — independently clickable grammatical prefix(es) and remainder",
			AsWritten:
				"לכיווץ — no separable syntactic-word prefix in context; lexical or inflected form stays whole, including infinitival ל with its verb",
		},
	},
	{
		sentence:
			"בדיקת הראיה תתבצע אצל אופטומטריסט מורשה מטעם רשות הרישוי לצורך בחינת כשירות הראייה לנהיגה ברכב ובהתאם לדרגת הרישיון המבוקש.",
		target: "בחינת",
		contrast:
			"In 'לצורך בחינת כשירות', בחינת stays whole: it is the construct noun of בחינה, not preposition ב + חינת.",
		criteria: {
			Prefixes1:
				"ב + חינת — independently clickable grammatical prefix(es) and remainder",
			AsWritten:
				"בחינת — no separable syntactic-word prefix in context; lexical or inflected form stays whole, including infinitival ל with its verb",
		},
	},
	{
		sentence:
			"לעומת זאת, קיימים סיבוכים הנובעים מעצם הבירור והטיפול, כגון כאב, דימום, זיהום, הפרעה בתפקוד מיני ובשליטה על השתן.",
		target: "הנובעים",
		contrast:
			"In 'סיבוכים הנובעים מעצם הבירור', הנובעים = ה + נובעים: grammatical ה introduces the modifying participle; keep a separate source Segment ה and retain נובעים intact.",
		criteria: {
			Prefixes1:
				"ה + נובעים — independently clickable grammatical prefix(es) and remainder",
			AsWritten:
				"הנובעים — no separable syntactic-word prefix in context; lexical or inflected form stays whole, including infinitival ל with its verb",
		},
	},
] as const;

for (const fixture of contexts) {
	test(`Hebrew candidate9 preserves observed context and menu for ${fixture.target}`, async () => {
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
