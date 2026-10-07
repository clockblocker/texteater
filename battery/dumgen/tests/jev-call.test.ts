import { expect, test } from "bun:test";
import type { Question } from "@typesafe-ai/sdk";
import { InvalidModelOutput } from "../src/errors.js";
import { checkedAnswers } from "../src/jev-call.js";
import type { JevResponse } from "../src/segment/jev.js";

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

const messageOf = (answers: JevResponse["answers"]) => {
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
	expect(messageOf({ ...fitting, n: { type: "noul" } })).toBe(
		"jev answered n with an answer that does not fit its question",
	);
	expect(
		messageOf({ ...fitting, n: { type: "noul", noul: "0.8" } }),
	).toContain("jev answered n with an answer");
});

test("a Choice outside the question's criteria is InvalidModelOutput", () => {
	expect(
		messageOf({
			...fitting,
			c: { type: "choice", choice: "middle", ...weighed },
		}),
	).toBe("jev answered c with an answer that does not fit its question");
	expect(
		messageOf({
			...fitting,
			c: { type: "choice", choice: "toString", ...weighed },
		}),
	).toContain("jev answered c with an answer");
});

test("a Choice or score without its confidence and numeric probabilities is InvalidModelOutput, naming the first three", () => {
	expect(
		messageOf({
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
	expect(messageOf({ n: fitting.n, c: fitting.c })).toBe(
		"jev answered without s",
	);
	expect(messageOf({ ...fitting, n: 0.8 })).toBe(
		"jev answered n with another type than asked",
	);
	expect(messageOf({ ...fitting, s: fitting.n })).toBe(
		"jev answered s with another type than asked",
	);
});
