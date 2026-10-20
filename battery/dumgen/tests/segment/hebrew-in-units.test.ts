import { expect, test } from "bun:test";
import type { Question } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import { ProviderFailure } from "../../src/errors.js";
import { createDumgen } from "../../src/create-dumgen.js";
import type { LunaAsk } from "../../src/luna.js";
import { segmentHebrewSentence } from "../../src/segment/he/segments.js";
import { segmentHebrewUnits } from "../../src/segment/he/units.js";
import type { JevAsk } from "../../src/segment/jev.js";

const noLuna: LunaAsk = async () => {
	throw Error("segmentation asked Luna");
};

const segmentChoice: Readonly<Record<string, string>> = {
	והממשלה: "Prefixes2",
	ולבית: "Prefixes2",
	מבית: "Prefixes1",
	הבית: "Prefixes1",
	הים: "Prefixes1",
	התיכון: "Prefixes1",
	הספר: "Prefixes1",
	ודנה: "Prefixes1",
	שבית: "AsWritten",
	וְהַמֶּמְשָׁלָה: "Prefixes2",
	"בית־ספר": "CompoundParts",
};

const membershipChoice: Readonly<Record<string, string>> = {
	"0:ו|1:ה": "Separate",
	"1:ה|2:ממשלה": "Join",
	"0:ו|1:ל": "Separate",
	"1:ל|2:בית": "Join",
	"0:מ|1:בית": "Join",
	"0:ה|1:בית": "Join",
	"0:ו|1:דנה": "Separate",
	"0:וְ|1:הַ": "Separate",
	"1:הַ|2:מֶּמְשָׁלָה": "Join",
	"0:בית|2:ספר": "Join",
	"0:בית|3:ספר": "Join",
	"1:ים|4:תיכון": "Join",
	"1:ים|3:ה": "Join",
	"3:ה|4:תיכון": "Join",
	"2:ארצות|4:הברית": "Join",
	"0:בית|2:ה": "Join",
	"2:ה|3:ספר": "Join",
	"0:בית|2:גדול": "Separate",
};

function picked(choice: string, probability = 1) {
	return {
		type: "choice" as const,
		choice,
		confidence: probability,
		probabilities: { [choice]: probability },
	};
}

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

/** A deterministic jev that makes the contextual policy explicit. */
function fakeHebrewJev(lowMembership = false) {
	const stages: string[] = [];
	const ask: JevAsk = async (request, { stage }) => {
		stages.push(stage);
		const written = request.state.written as
			| Readonly<Record<string, string>>
			| undefined;
		const source =
			written === undefined ? undefined : Object.values(written)[0];
		if (stage === "segments" && source === undefined)
			throw Error(
				`No fake answer for ${stage} ${JSON.stringify(source)}`,
			);
		return {
			model: request.model,
			answers: Object.fromEntries(
				Object.entries(request.questions).map(([id, question]) => {
					expect((question as Question).type).toBe("choice");
					const choice =
						stage === "segments"
							? (segmentChoice[
									written?.[
										`w${id.slice("source_".length)}`
									] ?? ""
								] ?? "AsWritten")
							: (membershipChoice[
									(
										request.state.candidates as Readonly<
											Record<string, string>
										>
									)[id] ?? ""
								] ?? "Separate");
					return [
						id,
						picked(
							choice,
							stage === "units" && lowMembership ? 0.69 : 1,
						),
					];
				}),
			),
			usage: { input_tokens: 1, output_tokens: 1 },
		};
	};
	return { ask, stages };
}

async function intake(sentence: string, lowMembership = false) {
	const jev = fakeHebrewJev(lowMembership);
	const text = await Effect.runPromise(
		createDumgen({ jev: jev.ask, luna: noLuna }).segment.inUnits({
			language: "he",
			paragraphs: [{ sentences: [sentence] }],
		}),
	);
	return { sentence: text.paragraphs[0]?.sentences[0], stages: jev.stages };
}

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

test("Hebrew intake keeps source pieces while articles share their Heads", async () => {
	const government = await intake("והממשלה");
	expect(government.sentence).toMatchObject({
		text: "והממשלה",
		segments: [
			{ kind: "ResolvableText", text: "ו" },
			{ kind: "ResolvableText", text: "ה" },
			{ kind: "ResolvableText", text: "ממשלה" },
		],
		units: [
			{ segments: [0], route: "Unresolved" },
			{ segments: [1, 2], route: "Unresolved" },
		],
	});
	expect(government.sentence?.segments.map(({ text }) => text).join("")).toBe(
		"והממשלה",
	);
	expect(government.stages).toEqual(["segments", "units"]);

	const house = await intake("הבית");
	expect(house.sentence?.segments.map(({ text }) => text)).toEqual([
		"ה",
		"בית",
	]);
	expect(house.sentence?.units).toEqual([
		{ segments: [0, 1], route: "Unresolved" },
	]);

	const dana = await intake("ודנה");
	expect(dana.sentence?.segments.map(({ text }) => text)).toEqual([
		"ו",
		"דנה",
	]);
	expect(dana.sentence?.units).toEqual([
		{ segments: [0], route: "Unresolved" },
		{ segments: [1], route: "Unresolved" },
	]);

	const toHouse = await intake("ולבית");
	expect(toHouse.sentence?.segments.map(({ text }) => text)).toEqual([
		"ו",
		"ל",
		"בית",
	]);
	expect(toHouse.sentence?.units).toEqual([
		{ segments: [0], route: "Unresolved" },
		{ segments: [1, 2], route: "Unresolved" },
	]);

	const fromHouse = await intake("מבית");
	expect(fromHouse.sentence?.segments.map(({ text }) => text)).toEqual([
		"מ",
		"בית",
	]);

	const lexicalInitial = await intake("שבית");
	expect(lexicalInitial.sentence?.segments.map(({ text }) => text)).toEqual([
		"שבית",
	]);
});

test("Hebrew intake never splits a niqqud grapheme cluster", async () => {
	const { sentence } = await intake("וְהַמֶּמְשָׁלָה");
	expect(sentence?.segments.map(({ text }) => text)).toEqual([
		"וְ",
		"הַ",
		"מֶּמְשָׁלָה",
	]);
	expect(sentence?.segments.map(({ text }) => text).join("")).toBe("וְהַמֶּמְשָׁלָה");
});

test("Hebrew lets the contextual judge split a maqaf compound", async () => {
	const { sentence } = await intake("בית־ספר");
	expect(sentence?.segments).toEqual([
		{ kind: "ResolvableText", text: "בית" },
		{ kind: "Punctuation", text: "־" },
		{ kind: "ResolvableText", text: "ספר" },
	]);
});

test("Hebrew keeps formatted numbers and internal abbreviation marks clickable", async () => {
	const { sentence } = await intake(
		"ב־1.5.2025 היו 18,696 תלמידים; רמב״ם אמר׃",
	);
	expect(sentence?.segments).toEqual([
		{ kind: "ResolvableText", text: "ב־1.5.2025" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "היו" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "18,696" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "תלמידים" },
		{ kind: "Punctuation", text: ";" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "רמב״ם" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "אמר" },
		{ kind: "Punctuation", text: "׃" },
	]);
	expect(sentence?.segments.map(({ text }) => text).join("")).toBe(
		"ב־1.5.2025 היו 18,696 תלמידים; רמב״ם אמר׃",
	);
});

test("Hebrew keeps standalone integers and times as clickable numeric Segments", async () => {
	const { sentence } = await intake("בשנת 2026 היו 3 מפגשים ב־08:30.");
	expect(
		sentence?.segments.map(({ kind, text }) => ({ kind, text })),
	).toEqual([
		{ kind: "ResolvableText", text: "בשנת" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "2026" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "היו" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "3" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "מפגשים" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "ב־08" },
		{ kind: "Punctuation", text: ":" },
		{ kind: "ResolvableText", text: "30" },
		{ kind: "Punctuation", text: "." },
	]);
	expect(sentence?.segments.map(({ text }) => text).join("")).toBe(
		"בשנת 2026 היו 3 מפגשים ב־08:30.",
	);
	expect(
		sentence?.units
			.flatMap(({ segments }) => segments)
			.sort((a, b) => a - b),
	).toEqual(
		sentence?.segments.flatMap(({ kind }, index) =>
			kind === "ResolvableText" ? [index] : [],
		),
	);
});

test("Hebrew unit question preserves fixed construct phrases across whitespace", async () => {
	let question: Question | undefined;
	await Effect.runPromise(
		segmentHebrewUnits(
			{
				text: "בית ספר",
				segments: [
					{ kind: "ResolvableText", text: "בית" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "ספר" },
				],
				unresolved: [],
			},
			({ questions }) => {
				question = questions.membership_0;
				return Effect.succeed(
					Object.fromEntries(
						Object.keys(questions).map((id) => [
							id,
							picked("Separate"),
						]),
					),
				);
			},
		),
	);
	expect(question?.type).toBe("choice");
	if (question?.type === "choice") {
		expect(String(question.instructions)).toContain("construct phrase");
		expect(String(question.instructions)).toContain(
			"fixed lexical identity",
		);
		expect(String(question.instructions)).toContain("בקשה ליציאת שותף");
	}
});

test("Hebrew fixed geographic names are distinguished from free noun phrases across whitespace", async () => {
	let question: Question | undefined;
	await Effect.runPromise(
		segmentHebrewUnits(
			{
				text: "הר כרמל, הים התיכון",
				segments: [
					{ kind: "ResolvableText", text: "הר" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "כרמל" },
					{ kind: "Punctuation", text: "," },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "ה" },
					{ kind: "ResolvableText", text: "ים" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "ה" },
					{ kind: "ResolvableText", text: "תיכון" },
				],
				unresolved: [],
			},
			({ questions }) => {
				question = questions.membership_0;
				return Effect.succeed(
					Object.fromEntries(
						Object.keys(questions).map((id) => [
							id,
							picked("Separate"),
						]),
					),
				);
			},
		),
	);
	expect(question?.type).toBe("choice");
	if (question?.type === "choice") {
		expect(String(question.instructions)).toContain("הר כרמל");
		expect(String(question.instructions)).toContain("ים + תיכון");
		expect(String(question.instructions)).toContain(
			"including within a fixed expression",
		);
	}
});

test("Hebrew keeps free של separate while a following fixed name may join across whitespace", async () => {
	let candidates: Readonly<Record<string, string>> = {};
	const units = await Effect.runPromise(
		segmentHebrewUnits(
			{
				text: "של ארצות הברית",
				segments: [
					{ kind: "ResolvableText", text: "של" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "ארצות" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "הברית" },
				],
				unresolved: [],
			},
			({ state, questions }) => {
				candidates = state.candidates as Readonly<
					Record<string, string>
				>;
				return Effect.succeed(
					Object.fromEntries(
						Object.keys(questions).map((id) => [
							id,
							picked("Join"),
						]),
					),
				);
			},
		),
	);
	expect(candidates).toEqual({
		membership_1: "2:ארצות|4:הברית",
	});
	expect(units).toEqual([
		{ segments: [0], route: "Unresolved" },
		{ segments: [2, 4], route: "Unresolved" },
	]);
});

test("Hebrew split article may join its fixed-name Head", async () => {
	let candidates: Readonly<Record<string, string>> = {};
	const units = await Effect.runPromise(
		segmentHebrewUnits(
			{
				text: "ה ארצות הברית",
				segments: [
					{ kind: "ResolvableText", text: "ה" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "ארצות" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "הברית" },
				],
				unresolved: [],
			},
			({ state, questions }) => {
				candidates = state.candidates as Readonly<
					Record<string, string>
				>;
				return Effect.succeed(
					Object.fromEntries(
						Object.keys(questions).map((id) => [
							id,
							picked("Join"),
						]),
					),
				);
			},
		),
	);
	expect(candidates).toEqual({
		membership_0: "0:ה|2:ארצות",
		membership_1: "2:ארצות|4:הברית",
	});
	expect(units).toEqual([{ segments: [0, 2, 4], route: "Unresolved" }]);
});

test("Hebrew keeps pointed free שֶׁל separate without treating שלו as a preposition", async () => {
	for (const [text, first, expectedCandidates] of [
		["שֶׁל ארצות הברית", "שֶׁל", { membership_1: "2:ארצות|4:הברית" }],
		[
			"שלו ארצות הברית",
			"שלו",
			{
				membership_0: "0:שלו|2:ארצות",
				membership_1: "2:ארצות|4:הברית",
			},
		],
	] as const) {
		let candidates: Readonly<Record<string, string>> = {};
		const units = await Effect.runPromise(
			segmentHebrewUnits(
				{
					text,
					segments: [
						{ kind: "ResolvableText", text: first },
						{ kind: "Whitespace", text: " " },
						{ kind: "ResolvableText", text: "ארצות" },
						{ kind: "Whitespace", text: " " },
						{ kind: "ResolvableText", text: "הברית" },
					],
					unresolved: [],
				},
				({ state, questions }) => {
					candidates = state.candidates as Readonly<
						Record<string, string>
					>;
					return Effect.succeed(
						Object.fromEntries(
							Object.keys(questions).map((id) => [
								id,
								picked("Join"),
							]),
						),
					);
				},
			),
		);
		expect(candidates).toEqual(expectedCandidates);
		expect(units).toEqual(
			first === "שֶׁל"
				? [
						{ segments: [0], route: "Unresolved" },
						{ segments: [2, 4], route: "Unresolved" },
					]
				: [{ segments: [0, 2, 4], route: "Unresolved" }],
		);
	}
});

test("Hebrew articles join their Heads while conjunction and preposition stay separate", async () => {
	const segmentation = {
		text: "והאדם מהעסק",
		segments: [
			{ kind: "ResolvableText" as const, text: "ו" },
			{ kind: "ResolvableText" as const, text: "ה" },
			{ kind: "ResolvableText" as const, text: "אדם" },
			{ kind: "Whitespace" as const, text: " " },
			{ kind: "ResolvableText" as const, text: "מ" },
			{ kind: "ResolvableText" as const, text: "ה" },
			{ kind: "ResolvableText" as const, text: "עסק" },
		],
		unresolved: [],
	};
	const units = await Effect.runPromise(
		segmentHebrewUnits(segmentation, ({ questions, state }) =>
			Effect.succeed(
				Object.fromEntries(
					Object.keys(questions).map((id) => [
						id,
						picked(
							String(
								(state.candidates as Record<string, string>)[
									id
								],
							).includes(":ה|")
								? "Join"
								: "Separate",
						),
					]),
				),
			),
		),
	);
	expect(units).toEqual([
		{ segments: [0], route: "Unresolved" },
		{ segments: [1, 2], route: "Unresolved" },
		{ segments: [4], route: "Unresolved" },
		{ segments: [5, 6], route: "Unresolved" },
	]);
});

test("Hebrew article membership is contextual while מ remains separate", async () => {
	for (const [text, segments] of [
		["מהגברים", ["מ", "ה", "גברים"]],
		["הַסֵּפֶר", ["הַ", "סֵּפֶר"]],
	] as const) {
		const units = await Effect.runPromise(
			segmentHebrewUnits(
				{
					text,
					segments: segments.map((piece) => ({
						kind: "ResolvableText" as const,
						text: piece,
					})),
					unresolved: [],
				},
				({ questions }) =>
					Effect.succeed(
						Object.fromEntries(
							Object.keys(questions).map((id) => [
								id,
								picked("Join"),
							]),
						),
					),
			),
		);
		expect(units).toEqual(
			text === "מהגברים"
				? [
						{ segments: [0], route: "Unresolved" },
						{ segments: [1, 2], route: "Unresolved" },
					]
				: [{ segments: [0, 1], route: "Unresolved" }],
		);
	}
});

test("Hebrew source-split article joins its Head rather than the conjunction", async () => {
	let question: Question | undefined;
	const units = await Effect.runPromise(
		segmentHebrewUnits(
			{
				text: "והאדם.",
				segments: [
					{ kind: "ResolvableText", text: "ו" },
					{ kind: "ResolvableText", text: "ה" },
					{ kind: "ResolvableText", text: "אדם" },
					{ kind: "Punctuation", text: "." },
				],
				unresolved: [],
			},
			({ questions }) => {
				question = questions.membership_0;
				expect(question?.type).toBe("choice");
				return Effect.succeed({
					membership_0: picked("Separate"),
					membership_1: picked("Join"),
				});
			},
		),
	);
	expect(units).toEqual([
		{ segments: [0], route: "Unresolved" },
		{ segments: [1, 2], route: "Unresolved" },
	]);
});

test("Hebrew joins fixed lexical cores with their source-split articles", async () => {
	const definiteConstruct = await intake("בית הספר");
	expect(definiteConstruct.sentence?.units).toEqual([
		{ segments: [0, 2, 3], route: "Unresolved" },
	]);

	const mediterranean = await intake("הים התיכון");
	expect(mediterranean.sentence?.units).toEqual([
		{ segments: [0, 1, 3, 4], route: "Unresolved" },
	]);

	const freePreposition = await intake("של ארצות הברית");
	expect(freePreposition.sentence?.units).toEqual([
		{ segments: [0], route: "Unresolved" },
		{ segments: [2, 4], route: "Unresolved" },
	]);

	const nonFixed = await intake("בית גדול");
	expect(nonFixed.sentence?.units).toEqual([
		{ segments: [0], route: "Unresolved" },
		{ segments: [2], route: "Unresolved" },
	]);
});

test("Hebrew does not bridge unrelated intervening source", async () => {
	for (const segments of [
		[
			{ kind: "ResolvableText" as const, text: "בית" },
			{ kind: "Whitespace" as const, text: " " },
			{ kind: "ResolvableText" as const, text: "מ" },
			{ kind: "Whitespace" as const, text: " " },
			{ kind: "ResolvableText" as const, text: "ספר" },
		],
		[
			{ kind: "ResolvableText" as const, text: "בית" },
			{ kind: "Punctuation" as const, text: "," },
			{ kind: "Whitespace" as const, text: " " },
			{ kind: "ResolvableText" as const, text: "ספר" },
		],
	] as const) {
		const units = await Effect.runPromise(
			segmentHebrewUnits(
				{
					text: segments.map(({ text }) => text).join(""),
					segments,
					unresolved: [],
				},
				() => {
					throw Error(
						"Uncontrolled source unexpectedly asked a judge",
					);
				},
			),
		);
		expect(units).toEqual(
			segments.flatMap(({ kind }, index) =>
				kind === "ResolvableText"
					? [{ segments: [index], route: "Unresolved" }]
					: [],
			),
		);
	}
});

test("Hebrew contextual multiword unit membership falls back below the confidence floor", async () => {
	const { sentence } = await intake("בית ספר", true);
	expect(sentence?.units).toEqual([
		{ segments: [0], route: "Unresolved" },
		{ segments: [2], route: "Unresolved" },
	]);
});

test("Hebrew does not join repeated articles without contextual approval", async () => {
	const segments = [
		{ kind: "ResolvableText" as const, text: "בית" },
		{ kind: "Whitespace" as const, text: " " },
		{ kind: "ResolvableText" as const, text: "ה" },
		{ kind: "Whitespace" as const, text: " " },
		{ kind: "ResolvableText" as const, text: "ה" },
		{ kind: "ResolvableText" as const, text: "ספר" },
	];
	const units = await Effect.runPromise(
		segmentHebrewUnits(
			{ text: "בית ה ה ספר", segments, unresolved: [] },
			({ questions }) =>
				Effect.succeed(
					Object.fromEntries(
						Object.keys(questions).map((id) => [
							id,
							picked("Separate"),
						]),
					),
				),
		),
	);
	expect(units).toEqual([
		{ segments: [0], route: "Unresolved" },
		{ segments: [2], route: "Unresolved" },
		{ segments: [4], route: "Unresolved" },
		{ segments: [5], route: "Unresolved" },
	]);
});

test("Hebrew smoke excerpts preserve every grapheme and unit membership", async () => {
	for (const excerpt of [
		"יש להגיש את הבקשה למידע מוקדם באופן מקוון.",
		'כשאנו אומרים את המשפט: "הילדים הלכו לביתם" יש כאן שלוש מילות יסוד.',
		"חיפה היא עיר נמל בצפון ישראל הממוקמת במורדות הר כרמל לחוף הים התיכון.",
	]) {
		const { sentence } = await intake(excerpt);
		expect(sentence?.segments.map(({ text }) => text).join("")).toBe(
			excerpt,
		);
		const assigned =
			sentence?.units.flatMap(({ segments }) => segments) ?? [];
		const resolvable =
			sentence?.segments.flatMap((segment, index) =>
				segment.kind === "ResolvableText" ? [index] : [],
			) ?? [];
		expect(assigned.sort((left, right) => left - right)).toEqual(
			resolvable,
		);
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

test("Hebrew bounds repeated source questions without losing sentence context", async () => {
	const source = Array(25).fill("והבית").join(" ");
	const batches: { keys: string[]; sentence: unknown }[] = [];
	const result = await Effect.runPromise(
		segmentHebrewSentence(source, ({ state, questions }) => {
			batches.push({
				keys: Object.keys(questions),
				sentence: state.sentence,
			});
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
	expect(batches.length).toBe(2);
	expect(
		batches.every(
			({ keys, sentence }) => keys.length <= 22 && sentence === source,
		),
	).toBe(true);
	expect(batches.map(({ keys }) => keys.length)).toEqual([22, 3]);
	const keys = batches.flatMap(({ keys }) => keys);
	expect(keys.length).toBe(25);
	expect(new Set(keys).size).toBe(keys.length);
	expect(result.segments.map(({ text }) => text).join("")).toBe(source);
});

test("Hebrew retries only oversized source requests with smaller batches", async () => {
	const source = Array(24).fill("והבית").join(" ");
	const sizes: number[] = [];
	const result = await Effect.runPromise(
		segmentHebrewSentence(source, ({ questions }) => {
			const keys = Object.keys(questions);
			sizes.push(keys.length);
			if (keys.length > 16)
				return Effect.fail(
					new ProviderFailure({
						stage: "segments",
						message: "TypeSafe refused the request",
						cause: Object.assign(
							Error(
								'TypeSafe answered 400: {"detail":{"error_type":"max_tokens_exceeded"}}',
							),
							{ status: 400 },
						),
					}),
				);
			return Effect.succeed(
				Object.fromEntries(
					keys.map((key) => [key, picked("AsWritten")]),
				),
			);
		}),
	);
	expect(sizes).toEqual([22, 11, 11, 2]);
	expect(result.segments.map(({ text }) => text).join("")).toBe(source);
});

test("Hebrew does not retry other provider refusals as token overflow", async () => {
	const source = Array(20).fill("והבית").join(" ");
	let calls = 0;
	try {
		await Effect.runPromise(
			segmentHebrewSentence(source, () => {
				calls++;
				return Effect.fail(
					new ProviderFailure({
						stage: "segments",
						message: "TypeSafe rate limit",
						cause: Object.assign(Error("TypeSafe answered 429"), {
							status: 429,
						}),
					}),
				);
			}),
		);
	} catch {
		// The original provider failure must propagate without another paid call.
	}
	expect(calls).toBe(1);
});
