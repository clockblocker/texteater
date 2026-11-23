import { expect, test } from "bun:test";
import type { Question } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import { segmentHebrewSentence } from "../../src/segment/he/segments.js";
import { picked } from "./hebrew-choices.js";

test("Hebrew source question freezes reviewer-identified B conjunction, relative, and suffix contrasts", async () => {
	const cases = [
		[
			"שועל שעבר בסביבה הבחין בקרב בין הדוב והאריה ובהיותו ערמומי וחכם, תפס את הטרף ונמלט.",
			new Map([
				["והאריה", "Prefixes2"],
				["ובהיותו", "Prefixes1"],
			]),
			new Map([
				["והאריה", ["ו", "ה", "אריה"]],
				["ובהיותו", ["ו", "בהיותו"]],
			]),
		],
		[
			'מצנן אוויר חשמלי, שמלבד הרוח שמוציא פעמים שהוא גם מעיף מתוכו חלקיקים דקים מאוד של מים כדי לצנן את האויר, האם מותר להוסיף לו מים בשבת, או שהדבר אסור משום איסור "זורה"?',
			new Map([
				["שהוא", "Prefixes1"],
				["לו", "Prefixes1"],
			]),
			new Map([
				["שהוא", ["ש", "הוא"]],
				["לו", ["ל", "ו"]],
			]),
		],
		[
			"המקומות הקדושים יהיו שמורים מפני חילול וכל פגיעה אחרת ומפני כל דבר העלול לפגוע בחופש הגישה של בני הדתות אל המקומות המקודשים להם או ברגשותיהם כלפי אותם המקומות.",
			new Map([
				["להם", "Prefixes1"],
				["ברגשותיהם", "Prefixes1"],
			]),
			new Map([
				["להם", ["ל", "הם"]],
				["ברגשותיהם", ["ב", "רגשותיהם"]],
			]),
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
		const texts = result.segments.map(({ text }) => text);
		let offset = 0;
		const starts = result.segments.map(({ text }) => {
			const start = offset;
			offset += text.length;
			return start;
		});
		for (const [target, pieces] of expected) {
			const start = starts.indexOf(sentence.indexOf(target));
			expect(texts.slice(start, start + pieces.length)).toEqual(pieces);
			const question = questions.get(target);
			expect(question?.type).toBe("choice");
			if (question?.type === "choice") {
				expect(String(question.instructions)).toContain(
					"והאריה = ו + ה + אריה",
				);
				expect(String(question.instructions)).toContain(
					"שהוא = ש + הוא",
				);
				expect(String(question.instructions)).toContain("לו = ל + ו");
				expect(String(question.instructions)).toContain(
					"ברגשותיהם = ב + רגשותיהם",
				);
			}
		}
	}
});

test("Hebrew B/C source question distinguishes lexical initial letters from productive prefixes", async () => {
	const sentences = [
		"שועל שעבר בסביבה הבחין בקרב בין הדוב והאריה ובהיותו ערמומי וחכם, תפס את הטרף ונמלט.",
		"התעלפות נגרמת בשל ירידה בזרימת הדם למוח שבעקבותיה נפסק תפקודה של מערכת העצבים האוטונומית שמפקחת על הדופק ועל לחץ הדם.",
		"שינויים סרטניים בתאי בלוטת הערמונית הינם ממצא שכיח בבני 50 ומעלה.",
		"מגישי הבקשה יקבלו הודעה המזמינה להירשם למבחן העיוני (תיאוריה), אם אינם כשירים, או שעדיין לא התקבלה החלטה לגבי בקשתם, תתקבל הודעה המפרטת את סטטוס הבקשה.",
	];
	for (const sentence of sentences) {
		let instructions = "";
		await Effect.runPromise(
			segmentHebrewSentence(sentence, ({ questions }) => {
				instructions = String(
					Object.values(questions)[0]?.instructions ?? "",
				);
				return Effect.succeed(
					Object.fromEntries(
						Object.keys(questions).map((key) => [
							key,
							picked("AsWritten"),
						]),
					),
				);
			}),
		);
		for (const contrast of [
			"הבחין stays whole",
			"שבהם = ש + ב + הם",
			"Lexical stems stay whole in בלוטת, הודעה, החלטה",
			"והתפריטים = ו + ה + תפריטים",
			"ולגרסת = ו + ל + גרסת",
			"שבביצוע = ש + ב + ביצוע",
			"הֲתַסְכִּימִי = הֲ + תַסְכִּימִי",
			"והקרבה = ו + ה + קרבה",
			"למעמד = ל + מעמד",
			"הללו stays whole",
			"וללא = ו + ללא",
			"הכספים = ה + כספים",
			"השחי = ה + שחי",
			"לבתי = ל + בתי",
			"בקוד = ב + קוד",
			"ולפיכך = ו + לפיכך",
			"משום איסור stays whole",
			"שלפני = ש + לפני",
			"להכיר stays whole",
			"לצמצם stays whole",
			"לעמוד stays whole",
			"לשבת stays whole",
			"ולשפר = ו + לשפר",
			"לגבי stays whole",
			"לכם = ל + כם",
			"לך = ל + ך",
			"מכות stays whole",
			"הפסקת stays whole",
			"כאן stays whole",
			"לבן stays whole",
			"הגדרות = ה + גדרות",
			"כלפי stays whole",
			"והטיפול = ו + ה + טיפול",
			"הפרדה stays whole",
			"הבאתי stays whole",
			"שברצונך = ש + ב + רצונך",
			"מהימים = מ + ה + ימים",
			"ברצונך = ב + רצונך",
			"בכיתי stays whole",
			"העמדה stays whole",
			"בלבד stays whole",
			"infinitives להציל and לקיים stay whole",
			"מתעלפים stays whole",
			"מכוסים stays whole",
			"ובעזרת = ו + ב + עזרת",
			"והפקת = ו + הפקת",
			"מוזן stays whole",
			"שבדק = ש + בדק",
			"והרגל = ו + ה + רגל",
			"שֶגַם = שֶ + גַם",
			"הלידה = ה + לידה",
			"בעיקר stays whole",
			"לסיר׳ = לסיר + ׳",
		]) {
			expect(instructions).toContain(contrast);
		}
	}
});
