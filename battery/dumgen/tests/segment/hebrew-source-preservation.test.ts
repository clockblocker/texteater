import { expect, test } from "bun:test";
import type { Question } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import { segmentHebrewSentence } from "../../src/segment/he/segments.js";
import { picked } from "./hebrew-choices.js";

test("Hebrew source question freezes seven A-only boundary repairs and preservation controls", async () => {
	for (const [sentence, target, choice, expected] of [
		[
			"תמיד אומרים לי שאני צריך להיות פחות רגיש ונעלב.",
			"לי",
			"Prefixes1",
			["ל", "י"],
		],
		["וַהֲיִי לִי אֵם וְאָחוֹת.", "לִי", "Prefixes1", ["לִ", "י"]],
		[
			"תוצאות: במשך תקופת המעקב, נצפתה הישנות של השאת באותו שד בארבע מטופלות.",
			"הישנות",
			"AsWritten",
			["הישנות"],
		],
		[
			"תוצאות: במשך תקופת המעקב, נצפתה הישנות של השאת באותו שד בארבע מטופלות.",
			"השאת",
			"Prefixes1",
			["ה", "שאת"],
		],
		[
			'"מפקדו של טויבי שמע את אירוע התקיפה", נכתב, "בין היתר מאביו של השוטר שהותקף, אך נמנע מלדווח על האירוע לגורמים הרלוונטיים, כפי שמחויב לעשות".',
			"כפי",
			"AsWritten",
			["כפי"],
		],
		[
			'"מפקדו של טויבי שמע את אירוע התקיפה", נכתב, "בין היתר מאביו של השוטר שהותקף, אך נמנע מלדווח על האירוע לגורמים הרלוונטיים, כפי שמחויב לעשות".',
			"לעשות",
			"AsWritten",
			["לעשות"],
		],
		[
			"לאחר  לידה  רגילה האם והתינוק בדרך כלל נשארים יחד.",
			"בדרך",
			"Prefixes1",
			["ב", "דרך"],
		],
		[
			"ההנקה והקרבה מסייעות לכיווץ רחם האם ולהעברת גורמי חיסון מגוף האם לתינוק.",
			"ולהעברת",
			"Prefixes2",
			["ו", "ל", "העברת"],
		],
		[
			'בהמשך עתירתו, מצטט העותר במלואו מכתב ששיגרה ד"ר קמיר לוועדה ביום ,14.1.2018 בו הביעה את התנגדותה למינויו של המשיב 11 לכהונת שופט בית המשפט העליון מטעמים דומים.',
			"במלואו",
			"Prefixes1",
			["ב", "מלואו"],
		],
	] as const) {
		let question: Question | undefined;
		const result = await Effect.runPromise(
			segmentHebrewSentence(sentence, ({ questions, state }) => {
				const written = state.written as Readonly<
					Record<string, string>
				>;
				const id = Object.keys(questions).find(
					(key) =>
						written[`w${key.slice("source_".length)}`] === target,
				);
				if (id !== undefined) question = questions[id];
				return Effect.succeed(
					Object.fromEntries(
						Object.keys(questions).map((key) => [
							key,
							picked(key === id ? choice : "AsWritten"),
						]),
					),
				);
			}),
		);
		const texts = result.segments.map(({ text }) => text);
		const start = texts.indexOf(expected[0]);
		expect(texts.slice(start, start + expected.length)).toEqual([
			...expected,
		]);
		expect(question?.type).toBe("choice");
		if (question?.type === "choice") {
			expect(String(question.instructions)).toContain("לִי = לִ + י");
			expect(String(question.instructions)).toContain(
				"הישנות ('recurrence') remains whole, while השאת = ה + שאת",
			);
			expect(String(question.instructions)).toContain(
				"כפי ('as') remains whole, and לעשות remains one infinitive Segment",
			);
			expect(String(question.instructions)).toContain(
				"בדרך כלל = ב + דרך + כלל",
			);
			expect(String(question.instructions)).toContain(
				"ולהעברת = ו + ל + העברת",
			);
			expect(String(question.instructions)).toContain(
				"במלואו = ב + מלואו",
			);
		}
	}
});

test("Hebrew source question freezes A-only בו and definite-adjective contrasts", async () => {
	for (const [sentence, target, choice, expected] of [
		[
			"למשל, לקחת ערך שיש בו שני מופעים של תבנית פירושון ולהסיר לזמן קצר אחת מהן.",
			"בו",
			"Prefixes1",
			["ב", "ו"],
		],
		[
			'בהמשך עתירתו, מצטט העותר במלואו מכתב ששיגרה ד"ר קמיר לוועדה ביום ,14.1.2018 בו הביעה את התנגדותה למינויו של המשיב 11 לכהונת שופט בית המשפט העליון מטעמים דומים.',
			"בו",
			"Prefixes1",
			["ב", "ו"],
		],
		[
			"הרגל שלי כבר התכווננה על הכדור, מוכנה להטיס אותו לשער מעל לידיים המתוחות של אבנר ומעבר לפרצוף הלגלגני של בן.",
			"המתוחות",
			"Prefixes1",
			["ה", "מתוחות"],
		],
	] as const) {
		let question: Question | undefined;
		const result = await Effect.runPromise(
			segmentHebrewSentence(sentence, ({ questions, state }) => {
				const written = state.written as Readonly<
					Record<string, string>
				>;
				const id = Object.keys(questions).find(
					(key) =>
						written[`w${key.slice("source_".length)}`] === target,
				);
				if (id !== undefined) question = questions[id];
				return Effect.succeed(
					Object.fromEntries(
						Object.keys(questions).map((key) => [
							key,
							picked(key === id ? choice : "AsWritten"),
						]),
					),
				);
			}),
		);
		const texts = result.segments.map(({ text }) => text);
		const start = texts.indexOf(expected[0]);
		expect(texts.slice(start, start + expected.length)).toEqual([
			...expected,
		]);
		expect(question?.type).toBe("choice");
		if (question?.type === "choice") {
			expect(String(question.instructions)).toContain("בו = ב + ו");
			expect(String(question.instructions)).toContain(
				"המתוחות = ה + מתוחות",
			);
		}
	}
});

test("Hebrew source question freezes the real A judicial התנהלותה false-article split against true articles", async () => {
	const judicialS01 =
		'בהמשך עתירתו, מצטט העותר במלואו מכתב ששיגרה ד"ר קמיר לוועדה ביום ,14.1.2018 בו הביעה את התנגדותה למינויו של המשיב 11 לכהונת שופט בית המשפט העליון מטעמים דומים.';
	const judicialS02 =
		'העותר קובל על כך שהוועדה לא מצאה לזמן את ד"ר קמיר לשימוע ולברר את הדברים שהציגה, וסבור כי הדבר מטיל צל על התנהלותה.';
	const expected = [
		[judicialS01, "הביעה", "AsWritten", ["הביעה"]],
		[judicialS01, "התנגדותה", "AsWritten", ["התנגדותה"]],
		[judicialS01, "המשיב", "Prefixes1", ["ה", "משיב"]],
		[judicialS02, "שהוועדה", "Prefixes2", ["ש", "ה", "וועדה"]],
		[judicialS02, "הדברים", "Prefixes1", ["ה", "דברים"]],
		[judicialS02, "התנהלותה", "AsWritten", ["התנהלותה"]],
	] as const;

	for (const [sentence, target, choice, pieces] of expected) {
		let question: Question | undefined;
		const result = await Effect.runPromise(
			segmentHebrewSentence(sentence, ({ questions, state }) => {
				const written = state.written as Readonly<
					Record<string, string>
				>;
				const id = Object.keys(questions).find(
					(key) =>
						written[`w${key.slice("source_".length)}`] === target,
				);
				if (id !== undefined) question = questions[id];
				return Effect.succeed(
					Object.fromEntries(
						Object.keys(questions).map((key) => [
							key,
							picked(key === id ? choice : "AsWritten"),
						]),
					),
				);
			}),
		);
		const texts = result.segments.map(({ text }) => text);
		const start = texts.indexOf(pieces[0]);
		expect(texts.slice(start, start + pieces.length)).toEqual([...pieces]);
		expect(question?.type).toBe("choice");
		if (question?.type === "choice") {
			expect(String(question.instructions)).toContain(
				"בו הביעה את התנגדותה למינויו של המשיב",
			);
			expect(String(question.instructions)).toContain(
				"הביעה (a verb) and התנגדותה (a noun with possessive suffix) remain whole",
			);
			expect(String(question.instructions)).toContain(
				"הוועדה = ה + ועדה, הדברים = ה + דברים, and המשיב = ה + משיב",
			);
			expect(String(question.instructions)).toContain(
				"הדבר = ה + דבר, but התנהלותה = התנהלותה (the noun 'her conduct' with a possessive suffix), not ה + תנהלותה",
			);
			expect(String(question.instructions)).toContain(
				"הישנות ('recurrence') remains whole, while השאת = ה + שאת",
			);
			expect(String(question.instructions)).toContain(
				"השפעתו ('its impact') has a pronominal suffix",
			);
			expect(String(question.instructions)).toContain(
				"התמודדות is a whole noun",
			);
			expect(String(question.instructions)).toContain(
				"המתוחות = ה + מתוחות",
			);
		}
	}
});

test("Hebrew source question freezes fourth-iteration native B lexical-prefix and clitic contrasts", async () => {
	const cases = [
		[
			"המון זמן הם שרטו, נהמו והפחידו איש את רעהו.",
			new Map([
				["המון", "AsWritten"],
				["והפחידו", "Prefixes1"],
			]),
			new Map([
				["המון", ["המון"]],
				["והפחידו", ["ו", "הפחידו"]],
			]),
		],
		[
			"שיטות: מחקר תצפית פרוספקטיבי הכולל את כל החולים המאושפזים במרכז הרפואי מאיר אשר החלו טיפול בוורפרין בפרק זמן של שלושה חודשים במהלך שנת 2008.",
			new Map([["החלו", "AsWritten"]]),
			new Map([["החלו", ["החלו"]]]),
		],
		[
			"תוצאות: במחקר נכללו 57 חולים, הגיל הממוצע היה 71.2±13.1, ההוריות לטיפול היו פרפור פרוזדורים (63.2%), פקקת ורידים (19.3), תסחיף ריאה (10.5%) וסיבות נוספות (7%).",
			new Map([["ורידים", "AsWritten"]]),
			new Map([["ורידים", ["ורידים"]]]),
		],
		[
			"זו הפעם החמישית ברציפות שבה נרשמת ירידה דו-חודשית במחירי הדיור, והם השלימו ירידה של 1.5% מאז פברואר.",
			new Map([["השלימו", "AsWritten"]]),
			new Map([["השלימו", ["השלימו"]]]),
		],
		[
			"במאי-יוני הוזלו הדירות ב-0.5% לעומת אפריל-מאי.",
			new Map([["הוזלו", "AsWritten"]]),
			new Map([["הוזלו", ["הוזלו"]]]),
		],
		[
			"ההתאוששות מהתעלפות היא כמעט תמיד ספונטנית ומהירה.",
			new Map([["מהתעלפות", "Prefixes1"]]),
			new Map([["מהתעלפות", ["מ", "התעלפות"]]]),
		],
		[
			"המקומות הקדושים יהיו שמורים מפני חילול וכל פגיעה אחרת ומפני כל דבר העלול לפגוע בחופש הגישה של בני הדתות אל המקומות המקודשים להם או ברגשותיהם כלפי אותם המקומות.",
			new Map([["הגישה", "Prefixes1"]]),
			new Map([["הגישה", ["ה", "גישה"]]]),
		],
		[
			"הממשלה תשקוד על פיתוחה ושגשוגה של ירושלים ועל רווחת תושביה על־ידי הקצאת משאבים מיוחדים, לרבות מענק שנתי מיוחד לעיריית ירושלים (מענק הבירה) באישור ועדת הכספים של הכנסת.",
			new Map([["ושגשוגה", "Prefixes1"]]),
			new Map([["ושגשוגה", ["ו", "שגשוגה"]]]),
		],
		[
			'בהמשך עתירתו, מצטט העותר במלואו מכתב ששיגרה ד"ר קמיר לוועדה ביום ,14.1.2018 בו הביעה את התנגדותה למינויו של המשיב 11 לכהונת שופט בית המשפט העליון מטעמים דומים.',
			new Map([["מטעמים", "Prefixes1"]]),
			new Map([["מטעמים", ["מ", "טעמים"]]]),
		],
		[
			"כאשר יש לו יסוד סביר להניח כי מדובר בלוחם בלתי חוקי (על פי ההגדרה הקבועה בסעיף 2 לחוק) וכי שחרורו יפגע בביטחון המדינה.",
			new Map([["מדובר", "AsWritten"]]),
			new Map([["מדובר", ["מדובר"]]]),
		],
	] as const;

	for (const [sentence, choices, expected] of cases) {
		const questions = new Map<string, Question>();
		const result = await Effect.runPromise(
			segmentHebrewSentence(sentence, ({ questions: offered, state }) => {
				const written = state.written as Readonly<
					Record<string, string>
				>;
				for (const [id, question] of Object.entries(offered)) {
					const target = written[`w${id.slice("source_".length)}`];
					if (target !== undefined && choices.has(target))
						questions.set(target, question);
				}
				return Effect.succeed(
					Object.fromEntries(
						Object.keys(offered).map((id) => {
							const target =
								written[`w${id.slice("source_".length)}`];
							return [
								id,
								picked(
									choices.get(target ?? "") ?? "AsWritten",
								),
							];
						}),
					),
				);
			}),
		);
		expect(result.segments.map(({ text }) => text).join("")).toBe(sentence);
		let offset = 0;
		const starts = result.segments.map(({ text }) => {
			const start = offset;
			offset += text.length;
			return start;
		});
		for (const [target, pieces] of expected) {
			const start = starts.indexOf(sentence.indexOf(target));
			expect(
				result.segments
					.slice(start, start + pieces.length)
					.map(({ text }) => text),
			).toEqual(pieces);
			const question = questions.get(target);
			expect(question?.type).toBe("choice");
			if (question?.type === "choice") {
				expect(String(question.instructions)).toContain(
					"החלו, השלימו, הוזלו, המון, ורידים, and מדובר remain whole lexical Segments",
				);
				expect(String(question.instructions)).toContain(
					"והפחידו = ו + הפחידו, הגישה = ה + גישה, ושגשוגה = ו + שגשוגה, and מטעמים = מ + טעמים",
				);
				expect(String(question.instructions)).toContain(
					"מהתעלפות = מ + התעלפות",
				);
			}
		}
	}
});

test("Hebrew source question freezes B-native clitic and lexical-stem contrasts", async () => {
	const cases = [
		[
			"שיטות: מחקר תצפית פרוספקטיבי הכולל את כל החולים המאושפזים במרכז הרפואי מאיר אשר החלו טיפול בוורפרין בפרק זמן של שלושה חודשים במהלך שנת 2008.",
			"החלו",
			"AsWritten",
			["החלו"],
		],
		[
			"המעקב אחר החולים נערך למשך 30 יום מהתחלת הטיפול בוורפרין.",
			"מהתחלת",
			"Prefixes1",
			["מ", "התחלת"],
		],
		[
			"שועל שעבר בסביבה הבחין בקרב בין הדוב והאריה ובהיותו ערמומי וחכם, תפס את הטרף ונמלט.",
			"ובהיותו",
			"Prefixes1",
			["ו", "בהיותו"],
		],
		[
			'מצנן אוויר חשמלי, שמלבד הרוח שמוציא פעמים שהוא גם מעיף מתוכו חלקיקים דקים מאוד של מים כדי לצנן את האויר, האם מותר להוסיף לו מים בשבת, או שהדבר אסור משום איסור "זורה"?',
			"שהדבר",
			"Prefixes2",
			["ש", "ה", "דבר"],
		],
		[
			"המקומות הקדושים יהיו שמורים מפני חילול וכל פגיעה אחרת ומפני כל דבר העלול לפגוע בחופש הגישה של בני הדתות אל המקומות המקודשים להם או ברגשותיהם כלפי אותם המקומות.",
			"להם",
			"Prefixes1",
			["ל", "הם"],
		],
	] as const;

	for (const [sentence, target, choice, expected] of cases) {
		let question: Question | undefined;
		const result = await Effect.runPromise(
			segmentHebrewSentence(sentence, ({ questions, state }) => {
				const written = state.written as Readonly<
					Record<string, string>
				>;
				const id = Object.keys(questions).find(
					(key) =>
						written[`w${key.slice("source_".length)}`] === target,
				);
				if (id !== undefined) question = questions[id];
				return Effect.succeed(
					Object.fromEntries(
						Object.keys(questions).map((key) => [
							key,
							picked(key === id ? choice : "AsWritten"),
						]),
					),
				);
			}),
		);
		const texts = result.segments.map(({ text }) => text);
		const start = texts.indexOf(expected[0]);
		expect(texts.slice(start, start + expected.length)).toEqual([
			...expected,
		]);
		expect(question?.type).toBe("choice");
		if (question?.type === "choice") {
			expect(String(question.instructions)).toContain(
				"החלו, השלימו, הוזלו, המון, ורידים, and מדובר remain whole lexical Segments; contrast החולים = ה + חולים",
			);
			expect(String(question.instructions)).toContain(
				"מהתחלת = מ + התחלת, while מתוזמן stays whole",
			);
			expect(String(question.instructions)).toContain(
				"ובהיותו = ו + בהיותו",
			);
			expect(String(question.instructions)).toContain(
				"שהדבר = ש + ה + דבר",
			);
			expect(String(question.instructions)).toContain("להם = ל + הם");
			expect(String(question.instructions)).toContain(
				"הוגנת ('fair') and ללא ('without') remain whole lexical Segments",
			);
		}
	}
});
