import { expect, test } from "bun:test";
import type { Question } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import { segmentHebrewSentence } from "../../src/segment/he/segments.js";
import { picked } from "./hebrew-choices.js";

test("Hebrew preserves internal quote-like marks in one scanner run", async () => {
	const cases = [
		'ד"ר',
		'ס"מ',
		"תכל'ס",
		"ג'ון",
		"רמב״ם",
		"תכל׳ס",
		"ג׳ון",
		"תַּכְל׳ס",
	] as const;
	for (const target of cases) {
		const segmented = await Effect.runPromise(
			segmentHebrewSentence(`"${target}"`, ({ questions }) =>
				Effect.succeed(
					Object.fromEntries(
						Object.keys(questions).map((id) => [
							id,
							picked("AsWritten"),
						]),
					),
				),
			),
		);
		expect(segmented.segments.map(({ text }) => text)).toEqual([
			'"',
			target,
			'"',
		]);
	}
});

test("Hebrew offers lossless whole and terminal-geresh punctuation plans for מס׳ 2", async () => {
	const sentence = "מס׳ 2";
	let question: Question | undefined;
	const wholeResult = await Effect.runPromise(
		segmentHebrewSentence(sentence, ({ questions }) => {
			question = questions.source_0;
			return Effect.succeed({ source_0: picked("AsWritten") });
		}),
	);
	expect(question?.type).toBe("choice");
	if (question?.type === "choice") {
		expect(Object.keys(question.criteria ?? {})).toEqual([
			"AsWritten",
			"TerminalGereshPunctuation",
		]);
		expect(String(question.instructions)).toContain("terminal geresh");
	}
	expect(wholeResult.segments).toEqual([
		{ kind: "ResolvableText", text: "מס׳" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "2" },
	]);

	const punctuationResult = await Effect.runPromise(
		segmentHebrewSentence(sentence, ({ questions }) =>
			Effect.succeed({
				source_0: picked("TerminalGereshPunctuation"),
				...Object.fromEntries(
					Object.keys(questions)
						.filter((id) => id !== "source_0")
						.map((id) => [id, picked("AsWritten")]),
				),
			}),
		),
	);
	expect(punctuationResult.segments).toEqual([
		{ kind: "ResolvableText", text: "מס" },
		{ kind: "Punctuation", text: "׳" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "2" },
	]);
	expect(punctuationResult.segments.map(({ text }) => text).join("")).toBe(
		sentence,
	);
});

test("Hebrew offers terminal-geresh punctuation where it closes a Hebrew quote", async () => {
	const sentence = "הוא אמר ׳מס׳.";
	let question: Question | undefined;
	const result = await Effect.runPromise(
		segmentHebrewSentence(sentence, ({ questions, state }) => {
			const written = state.written as Readonly<Record<string, string>>;
			const id = Object.keys(questions).find(
				(key) => written[`w${key.slice("source_".length)}`] === "מס׳",
			);
			if (id !== undefined) question = questions[id];
			return Effect.succeed(
				Object.fromEntries(
					Object.keys(questions).map((key) => [
						key,
						picked(
							key === id
								? "TerminalGereshPunctuation"
								: "AsWritten",
						),
					]),
				),
			);
		}),
	);
	expect(question?.type).toBe("choice");
	if (question?.type === "choice") {
		expect(Object.keys(question.criteria ?? {})).toEqual([
			"AsWritten",
			"TerminalGereshPunctuation",
		]);
		expect(String(question.instructions)).toContain(
			"הוא אמר ׳מס׳. = ׳ + מס + ׳ + .",
		);
		expect(String(question.instructions)).toContain(
			"מס׳ 2: keep מס׳ whole as an abbreviation",
		);
	}
	expect(result.segments).toEqual([
		{ kind: "ResolvableText", text: "הוא" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "אמר" },
		{ kind: "Whitespace", text: " " },
		{ kind: "Punctuation", text: "׳" },
		{ kind: "ResolvableText", text: "מס" },
		{ kind: "Punctuation", text: "׳" },
		{ kind: "Punctuation", text: "." },
	]);
	expect(result.segments.map(({ text }) => text).join("")).toBe(sentence);
});

test("Hebrew keeps A-source ASCII quotes internal without swallowing adjacent punctuation", async () => {
	const sentence =
		'העותר קובל על כך שהוועדה לא מצאה לזמן את ד"ר קמיר לשימוע ולברר את הדברים שהציגה.';
	const segmented = await Effect.runPromise(
		segmentHebrewSentence(sentence, ({ questions }) =>
			Effect.succeed(
				Object.fromEntries(
					Object.keys(questions).map((id) => [
						id,
						picked("AsWritten"),
					]),
				),
			),
		),
	);
	expect(segmented.segments.map(({ text }) => text).join("")).toBe(sentence);
	const texts = segmented.segments.map(({ text }) => text);
	const index = texts.indexOf('ד"ר');
	expect(texts.slice(index - 1, index + 2)).toEqual([" ", 'ד"ר', " "]);
});

test("Hebrew offers quote punctuation without losing the lexical quoted-run plan", async () => {
	const sentence =
		'נבחרו נשים המוגדרות כ"סיכון נמוך": מטופלות מעל גיל 60 שנה, עם שאת צינורית מסתננת בשלב המוקדם (שאת < 2 ס"מ) וללא חשד קליני או חשד בסקירת על שמע (US) למעורבות קשריות לימפה בבית השחי.';
	let question: Question | undefined;
	const segmented = await Effect.runPromise(
		segmentHebrewSentence(sentence, ({ questions, state }) => {
			const written = state.written as Readonly<Record<string, string>>;
			const id = Object.keys(questions).find(
				(key) =>
					written[`w${key.slice("source_".length)}`] === 'כ"סיכון',
			);
			if (id !== undefined) question = questions[id];
			return Effect.succeed(
				Object.fromEntries(
					Object.keys(questions).map((key) => [
						key,
						picked(
							key === id
								? "InternalAsciiQuotePunctuation"
								: "AsWritten",
						),
					]),
				),
			);
		}),
	);
	expect(question?.type).toBe("choice");
	if (question?.type === "choice") {
		expect(Object.keys(question.criteria ?? {})).toEqual([
			"InternalAsciiQuotePunctuation",
			"AsWritten",
		]);
		expect(
			String(question.criteria?.InternalAsciiQuotePunctuation),
		).toContain('כ + " + סיכון');
		expect(String(question.instructions)).toContain(
			"abbreviation, loanword/consonant modifier, or quotation punctuation",
		);
	}
	const texts = segmented.segments.map(({ text }) => text);
	const index = texts.indexOf("כ");
	expect(texts.slice(index, index + 3)).toEqual(["כ", '"', "סיכון"]);
	expect(segmented.segments.map(({ text }) => text).join("")).toBe(sentence);
});

test("Hebrew source choices exclude implausible lexical-prefix cascades", async () => {
	let asked: Record<string, Question> = {};
	const segmented = await Effect.runPromise(
		segmentHebrewSentence("הממשלה בבית והספר", ({ questions }) => {
			asked = questions;
			return Effect.succeed(
				Object.fromEntries(
					Object.keys(questions).map((id) => [
						id,
						picked("AsWritten"),
					]),
				),
			);
		}),
	);
	expect(segmented.segments.map(({ text }) => text).join("")).toBe(
		"הממשלה בבית והספר",
	);
	for (const [id, keys] of [
		["source_0", ["Prefixes1", "AsWritten"]],
		["source_2", ["Prefixes1", "AsWritten"]],
		["source_4", ["Prefixes1", "Prefixes2", "AsWritten"]],
	] as const) {
		const question = asked[id];
		expect(question?.type).toBe("choice");
		if (question?.type === "choice")
			expect(Object.keys(question.criteria ?? {})).toEqual([...keys]);
	}
	const temporal = await Effect.runPromise(
		segmentHebrewSentence("כשאנו אומרים", ({ questions }) => {
			asked = questions;
			return Effect.succeed(
				Object.fromEntries(
					Object.keys(questions).map((id) => [
						id,
						picked("AsWritten"),
					]),
				),
			);
		}),
	);
	expect(temporal.segments.map(({ text }) => text).join("")).toBe(
		"כשאנו אומרים",
	);
	const temporalQuestion = asked.source_0;
	expect(temporalQuestion?.type).toBe("choice");
	if (temporalQuestion?.type === "choice") {
		expect(Object.keys(temporalQuestion.criteria ?? {})).toEqual([
			"Prefixes1",
			"Prefixes2",
			"TemporalKshe",
			"AsWritten",
		]);
		expect(String(temporalQuestion.criteria?.TemporalKshe)).toContain(
			"when",
		);
	}
});

test("Hebrew temporal כש is selectable as one learner-facing connector", async () => {
	const result = await Effect.runPromise(
		segmentHebrewSentence("כשאנו אומרים", ({ questions }) =>
			Effect.succeed(
				Object.fromEntries(
					Object.keys(questions).map((id) => [
						id,
						picked("TemporalKshe"),
					]),
				),
			),
		),
	);
	expect(result.segments.map(({ text }) => text)).toEqual([
		"כש",
		"אנו",
		" ",
		"אומרים",
	]);
});

test("Hebrew keeps lexical מדוע intact even when a judge would split מ", async () => {
	let written: Readonly<Record<string, string>> = {};
	const result = await Effect.runPromise(
		segmentHebrewSentence("מדוע נתגלתה?", ({ questions, state }) => {
			written = state.written as Readonly<Record<string, string>>;
			return Effect.succeed(
				Object.fromEntries(
					Object.keys(questions).map((id) => [
						id,
						picked("Prefixes1"),
					]),
				),
			);
		}),
	);
	expect(Object.values(written)).not.toContain("מדוע");
	expect(result.segments.map(({ text }) => text)).toEqual([
		"מדוע",
		" ",
		"נתגלתה",
		"?",
	]);
});

test("Hebrew source question accepts contextual stacked prefixes as independent Segments", async () => {
	let question: Question | undefined;
	const segmented = await Effect.runPromise(
		segmentHebrewSentence("מהממשלה", ({ questions }) => {
			question = questions.source_0;
			return Effect.succeed({ source_0: picked("Prefixes2") });
		}),
	);
	expect(segmented.segments).toEqual([
		{ kind: "ResolvableText", text: "מ" },
		{ kind: "ResolvableText", text: "ה" },
		{ kind: "ResolvableText", text: "ממשלה" },
	]);
	expect(segmented.segments.map(({ text }) => text).join("")).toBe("מהממשלה");
	expect(question?.type).toBe("choice");
	if (question?.type === "choice") {
		expect(String(question.instructions)).toContain("definite article");
		expect(String(question.instructions)).toContain(
			"independently clickable",
		);
		expect(String(question.instructions)).toContain(
			"מהזווית = מ + ה + זווית",
		);
		expect(String(question.instructions)).toContain(
			"מהממשלה = מ + ה + ממשלה",
		);
		expect(String(question.criteria?.AsWritten)).toContain(
			"no separable syntactic-word prefix in context; lexical or inflected form stays whole, including infinitival ל with its verb",
		);
	}
});

test("Hebrew source question pins the A-baseline missed preposition and article", async () => {
	let question: Question | undefined;
	const segmented = await Effect.runPromise(
		segmentHebrewSentence("מהזווית הנכונה", ({ questions }) => {
			question = questions.source_0;
			return Effect.succeed(
				Object.fromEntries(
					Object.keys(questions).map((id) => [
						id,
						picked(id === "source_0" ? "Prefixes2" : "Prefixes1"),
					]),
				),
			);
		}),
	);
	expect(segmented.segments).toEqual([
		{ kind: "ResolvableText", text: "מ" },
		{ kind: "ResolvableText", text: "ה" },
		{ kind: "ResolvableText", text: "זווית" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "ה" },
		{ kind: "ResolvableText", text: "נכונה" },
	]);
	expect(question?.type).toBe("choice");
	if (question?.type === "choice")
		expect(String(question.instructions)).toContain(
			"מהזווית = מ + ה + זווית",
		);
});

test("Hebrew source question freezes A-only relative and conjunction article misses", async () => {
	for (const [sentence, target, choice, expected] of [
		[
			'"מפקדו של טויבי שמע את אירוע התקיפה", נכתב, "בין היתר מאביו של השוטר שהותקף, אך נמנע מלדווח על האירוע לגורמים הרלוונטיים, כפי שמחויב לעשות".',
			"שהותקף",
			"Prefixes1",
			["ש", "הותקף"],
		],
		[
			'העותר קובל על כך שהוועדה לא מצאה לזמן את ד"ר קמיר לשימוע ולברר את הדברים שהציגה, וסבור כי הדבר מטיל צל על התנהלותה.',
			"שהוועדה",
			"Prefixes2",
			["ש", "ה", "וועדה"],
		],
		[
			"ישנם מקרים שבהם האם והתינוק נאלצים להיפרד מייד לאחר הלידה, למשל אחרי  ניתוח קיסרי​   בהרדמה מלאה ; אם התינוק נולד קטן; או אם יש צורך בטיפול נוסף לאם או לתינוק.",
			"שבהם",
			"Prefixes2",
			["ש", "ב", "הם"],
		],
		[
			"ישנם מקרים שבהם האם והתינוק נאלצים להיפרד מייד לאחר הלידה, למשל אחרי  ניתוח קיסרי​   בהרדמה מלאה ; אם התינוק נולד קטן; או אם יש צורך בטיפול נוסף לאם או לתינוק.",
			"והתינוק",
			"Prefixes2",
			["ו", "ה", "תינוק"],
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
		expect(question?.type).toBe("choice");
		expect(
			result.segments
				.map(({ text }) => text)
				.slice(
					result.segments.findIndex(
						({ text }) => text === expected[0],
					),
					result.segments.findIndex(
						({ text }) => text === expected.at(-1),
					) + 1,
				),
		).toEqual([...expected]);
		if (question?.type === "choice")
			expect(String(question.instructions)).toContain(
				"שהותקף = ש + הותקף",
			);
		if (question?.type === "choice")
			expect(String(question.instructions)).toContain(
				"שבהם = ש + ב + הם",
			);
	}
});

test("Hebrew source question freezes A-only contextual לזמן and infinitive contrasts", async () => {
	for (const [sentence, target, choice, expected] of [
		[
			'העותר קובל על כך שהוועדה לא מצאה לזמן את ד"ר קמיר לשימוע ולברר את הדברים שהציגה, וסבור כי הדבר מטיל צל על התנהלותה.',
			"ולברר",
			"Prefixes1",
			["ו", "לברר"],
		],
		[
			'העותר קובל על כך שהוועדה לא מצאה לזמן את ד"ר קמיר לשימוע ולברר את הדברים שהציגה, וסבור כי הדבר מטיל צל על התנהלותה.',
			"לזמן",
			"AsWritten",
			["לזמן"],
		],
		[
			"למשל, לקחת ערך שיש בו שני מופעים של תבנית פירושון ולהסיר לזמן קצר אחת מהן.",
			"לזמן",
			"Prefixes1",
			["ל", "זמן"],
		],
		[
			"למשל, לקחת ערך שיש בו שני מופעים של תבנית פירושון ולהסיר לזמן קצר אחת מהן.",
			"לקחת",
			"AsWritten",
			["לקחת"],
		],
		[
			"למשל, לקחת ערך שיש בו שני מופעים של תבנית פירושון ולהסיר לזמן קצר אחת מהן.",
			"ולהסיר",
			"Prefixes1",
			["ו", "להסיר"],
		],
		[
			"ישנם מקרים שבהם האם והתינוק נאלצים להיפרד מייד לאחר הלידה.",
			"להיפרד",
			"AsWritten",
			["להיפרד"],
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
		expect(question?.type).toBe("choice");
		expect(result.segments.map(({ text }) => text).join("")).toBe(sentence);
		const texts = result.segments.map(({ text }) => text);
		const start = texts.indexOf(expected[0]);
		expect(texts.slice(start, start + expected.length)).toEqual([
			...expected,
		]);
		if (question?.type === "choice") {
			expect(String(question.instructions)).toContain(
				"לברר (infinitive of בירר) is one Segment, not ל + ברר",
			);
			expect(String(question.instructions)).toContain("ולברר = ו + לברר");
			expect(String(question.instructions)).toContain(
				'הוועדה לא מצאה לזמן את ד"ר קמיר',
			);
			expect(String(question.instructions)).toContain(
				"לזמן is the infinitive 'to summon' and remains one Segment",
			);
			expect(String(question.instructions)).toContain(
				"ולהסיר לזמן קצר אחת מהן",
			);
			expect(String(question.instructions)).toContain(
				"לזמן means 'for a short time' and must split ל + זמן",
			);
			expect(String(question.instructions)).toContain(
				"ולהסיר = ו + להסיר, while לקחת remains one whole infinitive Segment",
			);
		}
	}
});
