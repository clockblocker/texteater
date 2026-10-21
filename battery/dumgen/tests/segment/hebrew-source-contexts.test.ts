import { expect, test } from "bun:test";
import type { Question } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import { segmentHebrewSentence } from "../../src/segment/he/segments.js";
import { picked } from "./hebrew-choices.js";

test("Hebrew source question freezes the A-only inflected מן suffix after לזמן קצר", async () => {
	const sentence =
		"למשל, לקחת ערך שיש בו שני מופעים של תבנית פירושון ולהסיר לזמן קצר אחת מהן.";
	let question: Question | undefined;
	const result = await Effect.runPromise(
		segmentHebrewSentence(sentence, ({ questions, state }) => {
			const written = state.written as Readonly<Record<string, string>>;
			const id = Object.keys(questions).find(
				(key) => written[`w${key.slice("source_".length)}`] === "מהן",
			);
			if (id !== undefined) question = questions[id];
			return Effect.succeed(
				Object.fromEntries(
					Object.keys(questions).map((key) => [
						key,
						picked(key === id ? "Prefixes1" : "AsWritten"),
					]),
				),
			);
		}),
	);
	expect(result.segments.map(({ text }) => text).join("")).toBe(sentence);
	const texts = result.segments.map(({ text }) => text);
	const start = texts.indexOf("מ");
	expect(texts.slice(start, start + 2)).toEqual(["מ", "הן"]);
	expect(question?.type).toBe("choice");
	if (question?.type === "choice")
		expect(String(question.instructions)).toContain("מהן = מ + הן");
});

test("Hebrew source question freezes the A-only soccer prepositions against an infinitive", async () => {
	const sentence =
		"הרגל שלי כבר התכווננה על הכדור, מוכנה להטיס אותו לשער מעל לידיים המתוחות של אבנר ומעבר לפרצוף הלגלגני של בן.";
	const choices = new Map([
		["להטיס", "AsWritten"],
		["לשער", "Prefixes1"],
		["לידיים", "Prefixes1"],
	]);
	const expected = new Map([
		["להטיס", ["להטיס"]],
		["לשער", ["ל", "שער"]],
		["לידיים", ["ל", "ידיים"]],
	]);
	const questions = new Map<string, Question>();
	const result = await Effect.runPromise(
		segmentHebrewSentence(sentence, ({ questions: offered, state }) => {
			const written = state.written as Readonly<Record<string, string>>;
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
							picked(choices.get(target ?? "") ?? "AsWritten"),
						];
					}),
				),
			);
		}),
	);
	expect(result.segments.map(({ text }) => text).join("")).toBe(sentence);
	let offset = 0;
	const segmentOffsets = result.segments.map(({ text }) => {
		const start = offset;
		offset += text.length;
		return start;
	});
	for (const [target, pieces] of expected) {
		const start = segmentOffsets.indexOf(sentence.indexOf(target));
		expect(
			result.segments
				.slice(start, start + pieces.length)
				.map(({ text }) => text),
		).toEqual(pieces);
		const question = questions.get(target);
		const expectedChoice = choices.get(target);
		expect(question?.type).toBe("choice");
		expect(expectedChoice).toBeDefined();
		if (question?.type === "choice" && expectedChoice !== undefined)
			expect(Object.keys(question.criteria ?? {})).toContain(
				expectedChoice,
			);
	}
	for (const question of questions.values())
		if (question.type === "choice")
			expect(String(question.instructions)).toContain(
				"להטיס remains one infinitive Segment, while לשער = ל + שער and לידיים = ל + ידיים are prepositions",
			);
});

test("Hebrew source question freezes the compressed A-only בין and stacked-prefix regressions", async () => {
	for (const [sentence, target, choice, expected] of [
		[
			'"מפקדו של טויבי שמע את אירוע התקיפה", נכתב, "בין היתר מאביו של השוטר שהותקף, אך נמנע מלדווח על האירוע לגורמים הרלוונטיים, כפי שמחויב לעשות".',
			"בין",
			"AsWritten",
			["בין"],
		],
		[
			'אבל ה"יא מיואש!" הזה הוציא אותי מריכוז, והרגל שלי שבאה מהזווית הנכונה רעדה לרגע, מהכעס או מהעלבון, ונגעה בכדור מין נגיעה עלובה כזאת, יותר נשיקה מבעיטה.',
			"לרגע",
			"Prefixes1",
			["ל", "רגע"],
		],
		[
			'אבל ה"יא מיואש!" הזה הוציא אותי מריכוז, והרגל שלי שבאה מהזווית הנכונה רעדה לרגע, מהכעס או מהעלבון, ונגעה בכדור מין נגיעה עלובה כזאת, יותר נשיקה מבעיטה.',
			"מהעלבון",
			"Prefixes2",
			["מ", "ה", "עלבון"],
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
		if (question?.type === "choice") {
			expect(String(question.instructions)).toContain(
				"בין ('among/between') stay whole, not ש + ה + רי or ב + ין",
			);
			expect(String(question.instructions)).toContain("לרגע = ל + רגע");
			expect(String(question.instructions)).toContain(
				"מהעלבון = מ + ה + עלבון",
			);
		}
	}
});

test("Hebrew source question distinguishes lexical שהרי from relative ש plus article", async () => {
	let question: Question | undefined;
	const result = await Effect.runPromise(
		segmentHebrewSentence("שהרי הדבר ברור.", ({ questions }) => {
			question = questions.source_0;
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
	expect(result.segments.map(({ text }) => text)).toEqual([
		"שהרי",
		" ",
		"הדבר",
		" ",
		"ברור",
		".",
	]);
	expect(question?.type).toBe("choice");
	if (question?.type === "choice")
		expect(String(question.instructions)).toContain("שהרי");
});

test("Hebrew source question keeps pointed lexical של and כמו whole in A-only source contexts", async () => {
	for (const [sentence, target] of [
		["פַּעַם יָשְׁבָה לָה בַּת-עוֹרֵב עַל עָנָף שֶל עֵץ וּבִמְקוֹרָה חָרִיץ גְבִינָה.", "שֶל"],
		["אֳנִי יוֹדֵעַ שֶגַם קוֹלֵךְ, כְּמוֹ מַרְאֵךְ, נִפְלָא מַמָשׁ.", "כְּמוֹ"],
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
							picked("AsWritten"),
						]),
					),
				);
			}),
		);
		expect(result.segments.map(({ text }) => text).join("")).toBe(sentence);
		expect(question?.type).toBe("choice");
		if (question?.type === "choice") {
			expect(String(question.instructions)).toContain(
				"שֶל ('of') is not שֶ + ל",
			);
			expect(String(question.instructions)).toContain(
				"כְּמוֹ ('like/as') is not כְּ + מוֹ",
			);
			expect(String(question.criteria?.AsWritten)).toContain(target);
		}
	}
});

test("Hebrew source question freezes the A-only pointed stacked conjunction and preposition", async () => {
	const sentence = "פַּעַם יָשְׁבָה לָה בַּת-עוֹרֵב עַל עָנָף שֶל עֵץ וּבִמְקוֹרָה חָרִיץ גְבִינָה.";
	let question: Question | undefined;
	const result = await Effect.runPromise(
		segmentHebrewSentence(sentence, ({ questions, state }) => {
			const written = state.written as Readonly<Record<string, string>>;
			const id = Object.keys(questions).find(
				(key) =>
					written[`w${key.slice("source_".length)}`] === "וּבִמְקוֹרָה",
			);
			if (id !== undefined) question = questions[id];
			return Effect.succeed(
				Object.fromEntries(
					Object.keys(questions).map((key) => [
						key,
						picked(key === id ? "Prefixes2" : "AsWritten"),
					]),
				),
			);
		}),
	);
	expect(result.segments.map(({ text }) => text).join("")).toBe(sentence);
	expect(question?.type).toBe("choice");
	if (question?.type === "choice") {
		expect(String(question.instructions)).toContain(
			"וּבִמְקוֹרָה = וּ + בִ + מְקוֹרָה",
		);
		expect(String(question.criteria?.Prefixes2)).toContain("וּ + בִ + מְקוֹרָה");
	}
});

test("Hebrew source question keeps A-only lexical lookalikes whole in their source contexts", async () => {
	for (const [sentence, target] of [
		["אה, ראיתי שיש הבדל בין השאילתה לבין מה שרשום בקוד של הבוט.", "מה"],
		["אנו מכריזים בזאת על הקמת מדינה יהודית.", "הקמת"],
		["על יסוד החלטת עצרת האומות המאוחדות אנו מכריזים בזאת.", "החלטת"],
		[
			"הרגל שלי כבר התכווננה על הכדור, מוכנה להטיס אותו לשער מעל לידיים המתוחות של אבנר ומעבר לפרצוף הלגלגני של בן.",
			"מעל",
		],
		["ישנם מקרים שבהם האם והתינוק נאלצים להיפרד מייד לאחר הלידה.", "לאחר"],
	] as const) {
		let question: Question | undefined;
		await Effect.runPromise(
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
							picked("AsWritten"),
						]),
					),
				);
			}),
		);
		expect(question?.type).toBe("choice");
		if (question?.type === "choice") {
			expect(String(question.instructions)).toContain(
				"what מה, establishment הקמת, decision החלטת, above מעל, and after לאחר each remain one Segment",
			);
			expect(String(question.criteria?.AsWritten)).toContain(target);
		}
	}
});

test("Hebrew source question distinguishes definite articles in literary and formal prose from lexical ה", async () => {
	let question: Question | undefined;
	await Effect.runPromise(
		segmentHebrewSentence("האדם הממוקמת הפרוש", ({ questions }) => {
			question = questions.source_0;
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
	expect(question?.type).toBe("choice");
	if (question?.type === "choice") {
		expect(String(question.instructions)).toContain("האדם = ה + אדם");
		expect(String(question.instructions)).toContain("הממוקמת = ה + ממוקמת");
		expect(String(question.instructions)).toContain("הפרוש = ה + פרוש");
		expect(String(question.instructions)).toContain("התמודדות");
	}
});

test("Hebrew source question rejects invented stems without splitting possessed nouns", async () => {
	for (const [sentence, target] of [
		["המאמר בוחן את השפעתו על התמודדות.", "השפעתו"],
		["המאמר בוחן את השפעתו על התמודדות.", "התמודדות"],
		["המאמר בוחן את השפעתו והתמודדות.", "והתמודדות"],
	] as const) {
		let question: Question | undefined;
		await Effect.runPromise(
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
							picked("AsWritten"),
						]),
					),
				);
			}),
		);
		expect(question?.type).toBe("choice");
		if (question?.type === "choice") {
			expect(String(question.instructions)).toContain("invent a stem");
			expect(String(question.instructions)).toContain(
				"pronominal suffix",
			);
			expect(String(question.criteria?.AsWritten)).toContain(target);
			if (target === "והתמודדות")
				expect(String(question.instructions)).toContain(
					"והתמודדות = ו + התמודדות",
				);
		}
	}
});

test("Hebrew source question freezes the A-only pointed pronoun and quoted-pronoun limitation", async () => {
	for (const [sentence, expected] of [
		["פַּעַם יָשְׁבָה לָה בַּת-עוֹרֵב עַל עָנָף שֶל עֵץ וּבִמְקוֹרָה חָרִיץ גְבִינָה.", ["לָ", "ה"]],
		[
			'אבל ה"יא מיואש!" הזה הוציא אותי מריכוז, והרגל שלי שבאה מהזווית הנכונה רעדה לרגע, מהכעס או מהעלבון, ונגעה בכדור מין נגיעה עלובה כזאת, יותר נשיקה מבעיטה.',
			['ה"יא'],
		],
	] as const) {
		let question: Question | undefined;
		const result = await Effect.runPromise(
			segmentHebrewSentence(sentence, ({ questions, state }) => {
				const written = state.written as Readonly<
					Record<string, string>
				>;
				question = Object.values(questions)[0];
				return Effect.succeed(
					Object.fromEntries(
						Object.keys(questions).map((key) => [
							key,
							picked(
								written[`w${key.slice("source_".length)}`] ===
									"לָה"
									? "Prefixes1"
									: "AsWritten",
							),
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
		if (question?.type === "choice")
			expect(String(question.instructions)).toContain("לָה = לָ + ה");
	}
});
