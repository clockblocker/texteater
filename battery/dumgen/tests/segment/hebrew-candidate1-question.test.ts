import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { segmentHebrewSentence } from "../../src/segment/he/segments.js";
import { stitchedText } from "../../src/segment/stitched-text.js";

// Complete observed inputs; assertions cover question text and offered plans only.
// Local AsWritten answers below are not Jev predictions or sentence-level gold.
const cases = [
	{
		id: "REL-HIDABROOT-2024-B-S01",
		sentence:
			'האם מותר לעשות תענית הראב"ד (שמושך ידו מהמאכל באמצע אכילתו כדי לשבור את תאוותו) בשבת?',
		target: "לשבור",
		expected: ["לשבור"],
	},
	{
		id: "REL-HIDABROOT-2024-B-S02",
		sentence: "הרי אסור להתענות בשבת?",
		target: "להתענות",
		expected: ["להתענות"],
	},
	{
		id: "REL-HIDABROOT-2024-B-S03",
		sentence:
			'מותר, שאין זו תענית, רק מיעוט הנאתו כדי לשבור תאוותו (ילקוט יוסף ימים נוראים מהדורת אלקיים עמוד קפ"א בהערה).',
		target: "לשבור",
		expected: ["לשבור"],
	},
	{
		id: "REL-HIDABROOT-2024-B-S04",
		sentence:
			"האם כהן רשאי ליתן רשות לישראל לברך המוציא ולהוציא ידי חובה את כולם במקומו?",
		target: "ליתן",
		expected: ["ליתן"],
	},
	{
		id: "REL-HIDABROOT-2024-B-S06",
		sentence:
			'מצנן אוויר חשמלי, שמלבד הרוח שמוציא פעמים שהוא גם מעיף מתוכו חלקיקים דקים מאוד של מים כדי לצנן את האויר, האם מותר להוסיף לו מים בשבת, או שהדבר אסור משום איסור "זורה"?',
		target: "לצנן",
		expected: ["לצנן"],
	},
	{
		id: "REL-HIDABROOT-2024-B-S06",
		sentence:
			'מצנן אוויר חשמלי, שמלבד הרוח שמוציא פעמים שהוא גם מעיף מתוכו חלקיקים דקים מאוד של מים כדי לצנן את האויר, האם מותר להוסיף לו מים בשבת, או שהדבר אסור משום איסור "זורה"?',
		target: "להוסיף",
		expected: ["להוסיף"],
	},
	{
		id: "NEWS-2025-B-S03",
		sentence:
			"זו הפעם החמישית ברציפות שבה נרשמת ירידה דו-חודשית במחירי הדיור, והם השלימו ירידה של 1.5% מאז פברואר.",
		target: "שבה",
		expected: ["ש", "ב", "ה"],
	},
	{
		id: "INF-MAZNON-B-S03",
		sentence:
			"יעקב  נחסם בקונצנזוס נדיר ויוצא דופן של כמעט פה אחד , בהצבעת מפעילים שבה 11 מתוך 12 המצביעים תמכו בחסימה ללא הגבלת זמן.",
		target: "שבה",
		expected: ["ש", "ב", "ה"],
	},
	{
		id: "INF-MAZNON-B-S05",
		sentence:
			"יתרה מכך, אף אחד מהמפעילים שתמכו בחסימה אינו צד ישיר או עקיף בתלונה במטא, ומבין 11 המפעילים הללו רק אחד (נריה) הגיב במטא",
		target: "ומבין",
		expected: ["ו", "מבין"],
	},
	{
		id: "REL-HIDABROOT-2024-B-S06",
		sentence:
			'מצנן אוויר חשמלי, שמלבד הרוח שמוציא פעמים שהוא גם מעיף מתוכו חלקיקים דקים מאוד של מים כדי לצנן את האויר, האם מותר להוסיף לו מים בשבת, או שהדבר אסור משום איסור "זורה"?',
		target: "שמלבד",
		expected: ["ש", "מלבד"],
	},
	{
		id: "NEWS-2021-A-S03",
		sentence:
			'"מפקדו של טויבי שמע את אירוע התקיפה", נכתב, "בין היתר מאביו של השוטר שהותקף, אך נמנע מלדווח על האירוע לגורמים הרלוונטיים, כפי שמחויב לעשות".',
		target: "שמחויב",
		expected: ["ש", "מחויב"],
	},
	{
		id: "C-RECIPE-APPLE-01-S10",
		sentence:
			"יוצקים את הבלילה בעדינות לתערובת הקמח ומערבבים רק עד שמתקבלת תערובת אחידה.",
		target: "ומערבבים",
		expected: ["ו", "מערבבים"],
	},
	{
		id: "HE-C-HEALTHCARE-PSA-SCREENING-S01",
		sentence:
			"שינויים סרטניים בתאי בלוטת הערמונית הינם ממצא שכיח בבני 50 ומעלה.",
		target: "ומעלה",
		expected: ["ו", "מעלה"],
	},
	{
		id: "HE-C-HEALTHCARE-PSA-SCREENING-S05",
		sentence:
			"מעל גיל 70 - הסיכון לנזק שיגרם מעצם ביצוע הבדיקה ותוצאותיה, עולה על הסיכוי לתועלת, ולפיכך מומלץ שלא לבצעה.",
		target: "שלא",
		expected: ["ש", "לא"],
	},
	{
		id: "HE-C-ECON-CALCALIST-2026-10-14-COCO-S02",
		sentence:
			'בניגוד לאיגרת חוב רגילה, "קוקו" כוללת מנגנון מיוחד המיועד לזמני חירום: אם החברה נקלעת למשבר קיצון שהוגדר מראש, החוב עשוי להימחק באופן מלא או חלקי או להיות מומר למניות, בהתאם לתנאי המכשיר.',
		target: "להימחק",
		expected: ["להימחק"],
	},
	{
		id: "HE-C-CH-KREUTNER-BARKOKHBA-S12",
		sentence:
			"האישה העמידה אותם על הקרקע, נעלה את פתח הבית והביטה מסביב, לבדוק אם מוגפים תריסי החלונות כראוי.",
		target: "לבדוק",
		expected: ["לבדוק"],
	},
	{
		id: "D-NEWS-CRIME-01-S01",
		sentence:
			"רציחות, ירי, הנחת מטעני חבלה, זריקת רימונים, דריסות מכוונות - לאחרונה אין יום שבו לא מתרחשים אירועים פליליים חמורים וחריגים ברחבי המדינה, מחולון ועד רהט, נתניה ועד הגליל.",
		target: "שבו",
		expected: ["ש", "ב", "ו"],
	},
	{
		id: "D-REL-RASHI-01-S02",
		sentence: "ומה טעם פתח בבראשית?",
		target: "ומה",
		expected: ["ו", "מה"],
	},
	{
		id: "D-SONG-BALLAD-HASSON-01-S04",
		sentence: "אין לי מה להפסיד מה הבאתי עליי?",
		target: "להפסיד",
		expected: ["להפסיד"],
	},
] as const;

const additiveContrast =
	"AsWritten means no separable syntactic-word prefix in this context, not no grammatical morphology: infinitival ל stays attached to its verb. In 'כדי לשבור את תאוותו' and 'כדי לשבור תאוותו', לשבור stays whole; in 'אסור להתענות בשבת', להתענות stays whole; in 'רשאי ליתן רשות', ליתן stays whole; in 'כדי לצנן את האויר' and 'מותר להוסיף לו מים', לצנן and להוסיף stay whole; in 'החוב עשוי להימחק', להימחק stays whole; in 'לבדוק אם מוגפים תריסי החלונות', לבדוק stays whole; in 'אין לי מה להפסיד', להפסיד stays whole, but לי = ל + י. These are verb forms, never ל plus a remainder; contrast להם = ל + הם, לרגע = ל + רגע, and לזמן קצר = ל + זמן + קצר. A lexical host does not absorb an outer conjunction ו or relative/complementizer ש: in 'לתערובת הקמח ומערבבים', ומערבבים = ו + מערבבים; in 'בבני 50 ומעלה', ומעלה = ו + מעלה; in 'מומלץ שלא לבצעה', שלא = ש + לא; in 'כפי שמחויב לעשות', שמחויב = ש + מחויב; in 'מצנן אוויר חשמלי, שמלבד הרוח', שמלבד = ש + מלבד; in 'ומה טעם פתח בבראשית', ומה = ו + מה (מה stays whole). In 'ברציפות שבה נרשמת' and 'בהצבעת מפעילים שבה 11', שבה = ש + ב + ה; in 'אין יום שבו לא מתרחשים', שבו = ש + ב + ו: the final ה/ו is a written pronoun piece, not an article/conjunction. In 'ומבין 11 המפעילים', the outer ו must split even if the internal analysis of מבין is uncertain; that uncertainty is not a reason to choose AsWritten for ומבין.";

for (const fixture of cases) {
	test(`Hebrew candidate1 question contrasts separable prefixes in ${fixture.id}/${fixture.target}`, async () => {
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
					const expectedPlan =
						fixture.expected.length === 1
							? "AsWritten"
							: `Prefixes${fixture.expected.length - 1}`;
					expect(String(criteria[expectedPlan])).toStartWith(
						`${fixture.expected.join(" + ")} —`,
					);
					expect(String(criteria.AsWritten)).toBe(
						fixture.target +
							" — no separable syntactic-word prefix in context; lexical or inflected form stays whole, including infinitival ל with its verb",
					);
					expect(String(question.instructions)).toContain(
						additiveContrast,
					);
					// Retain the earlier useful, explicitly qualified outer-boundary example.
					expect(String(question.instructions)).toContain(
						"uncertainty inside מבין does not justify keeping ומבין whole",
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
		expect(result.segments.map(({ text }) => text).join("")).toBe(
			stitchedText(fixture.sentence),
		);
	});
}
