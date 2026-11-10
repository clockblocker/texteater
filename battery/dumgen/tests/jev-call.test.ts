import { expect, test } from "bun:test";
import type { Question } from "@typesafe-ai/sdk";
import { InvalidModelOutput } from "../src/errors.js";
import { checkedAnswers } from "../src/jev-call.js";
import {
	chunkQuestions,
	estimatedTokens,
	type JevResponse,
	tokensPerRequest,
} from "../src/segment/jev.js";

const model = "jev-1.13.0";

const chunk: readonly (readonly [string, Question])[] = [
	["n", { type: "noul", instructions: "Kam er?" }],
	[
		"c",
		{
			type: "choice",
			instructions: "Welche Lesart?",
			criteria: { left: null, right: null },
		},
	],
	[
		"s",
		{ type: "score", instructions: "Wie sicher?", criteria: [null, null] },
	],
];

const weighed = { confidence: 0.9, probabilities: { left: 0.9, right: 0.1 } };

const fitting = {
	n: { type: "noul", noul: 0.8 },
	c: { type: "choice", choice: "left", ...weighed },
	s: { type: "score", score: 0.4, ...weighed },
} as const;

const respond = (answers: JevResponse["answers"]): JevResponse => ({
	model,
	answers,
	usage: { input_tokens: 10, output_tokens: 3 },
});

const rejectionOf = (answers: JevResponse["answers"]) => {
	const checked = checkedAnswers("route", model, chunk, respond(answers));
	expect(checked).toBeInstanceOf(InvalidModelOutput);
	return checked instanceof InvalidModelOutput ? checked.message : "";
};

test("answers that fit their questions come back as the chunk's answers", () => {
	expect(
		checkedAnswers(
			"route",
			model,
			chunk,
			respond({ ...fitting, extra: { type: "noul", noul: 1 } }),
		),
	).toEqual(fitting);
});

test("a Noul answer without a finite number is InvalidModelOutput", () => {
	expect(rejectionOf({ ...fitting, n: { type: "noul" } })).toBe(
		"jev answered n with an answer that does not fit its question",
	);
	expect(
		rejectionOf({ ...fitting, n: { type: "noul", noul: "0.8" } }),
	).toContain("jev answered n with an answer");
});

test("a Choice outside the question's criteria is InvalidModelOutput", () => {
	expect(
		rejectionOf({
			...fitting,
			c: { type: "choice", choice: "middle", ...weighed },
		}),
	).toBe("jev answered c with an answer that does not fit its question");
	expect(
		rejectionOf({
			...fitting,
			c: { type: "choice", choice: "toString", ...weighed },
		}),
	).toContain("jev answered c with an answer");
});

test("a Choice or score without its confidence and numeric probabilities is InvalidModelOutput, naming the first three", () => {
	expect(
		rejectionOf({
			n: { type: "noul", noul: Number.NaN },
			c: { type: "choice", choice: "left", confidence: 0.9 },
			s: {
				type: "score",
				score: 0.4,
				confidence: 0.9,
				probabilities: { 0: "most" },
			},
		}),
	).toBe(
		"jev answered n, c, s with an answer that does not fit its question",
	);
});

test("a missing, untyped or mistyped answer keeps its own message", () => {
	expect(rejectionOf({ n: fitting.n, c: fitting.c })).toBe(
		"jev answered without s",
	);
	expect(rejectionOf({ ...fitting, n: 0.8 })).toBe(
		"jev answered n with another type than asked",
	);
	expect(rejectionOf({ ...fitting, s: fitting.n })).toBe(
		"jev answered s with another type than asked",
	);
});

const noulNamed = (words: number): Question => ({
	type: "noul",
	instructions: "Ist das so? ".repeat(words),
});

test("a request is cut in order into chunks whose estimated tokens, the state's included, fit the limit", () => {
	const state = { sentence: "Er kam gestern spät nach Hause." };
	const questions = Object.fromEntries(
		Array.from({ length: 40 }, (_, index) => [`q${index}`, noulNamed(50)]),
	);
	const limit = 3_000;
	const chunks = chunkQuestions(state, questions, { tokens: limit });
	expect(chunks.length).toBeGreaterThan(1);
	expect(chunks.flat().map(([id]) => id)).toEqual(Object.keys(questions));
	for (const chunk of chunks) {
		const size = chunk.reduce(
			(sum, entry) => sum + estimatedTokens(entry),
			estimatedTokens(state),
		);
		expect(size).toBeLessThanOrEqual(limit);
	}
	// Each chunk is as full as the next question allows.
	for (const [index, chunk] of chunks.slice(0, -1).entries()) {
		const next = chunks[index + 1]?.[0];
		if (!next) throw Error("A next chunk expected");
		expect(
			[...chunk, next].reduce(
				(sum, entry) => sum + estimatedTokens(entry),
				estimatedTokens(state),
			),
		).toBeGreaterThan(limit);
	}
});

test("production cuts by tokens only, a question too large alone goes alone, and an empty request is no chunk", () => {
	const state = { sentence: "Ja." };
	const small = Object.fromEntries(
		Array.from({ length: 1_000 }, (_, index) => [
			`q${index}`,
			noulNamed(1),
		]),
	);
	expect(chunkQuestions(state, small)).toHaveLength(1);
	expect(chunkQuestions(state, small, { questions: 300 })).toHaveLength(4);
	const huge = noulNamed(tokensPerRequest);
	expect(
		chunkQuestions(state, {
			a: noulNamed(1),
			b: huge,
			c: noulNamed(1),
		}).map((chunk) => chunk.map(([id]) => id)),
	).toEqual([["a"], ["b"], ["c"]]);
	expect(chunkQuestions(state, {})).toEqual([]);
});

test("the estimate overestimates jev's billing: two bytes of JSON a token, every byte counted", () => {
	// "abc" is five bytes of JSON, "äöü" eight.
	expect(estimatedTokens("abc")).toBe(3);
	expect(estimatedTokens("äöü")).toBe(4);
	expect(estimatedTokens({ a: 1 })).toBe(4);
});
