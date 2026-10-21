import { expect, test } from "bun:test";
import type { Question } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import { picked } from "./hebrew-choices.js";
import { segmentHebrewMembership } from "./hebrew-route-fixture.js";

test("Hebrew unit question preserves fixed construct phrases across whitespace", async () => {
	let question: Question | undefined;
	await Effect.runPromise(
		segmentHebrewMembership(
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
		segmentHebrewMembership(
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
		segmentHebrewMembership(
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
		segmentHebrewMembership(
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
			segmentHebrewMembership(
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
		segmentHebrewMembership(segmentation, ({ questions, state }) =>
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
			segmentHebrewMembership(
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
		segmentHebrewMembership(
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
			segmentHebrewMembership(
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
		segmentHebrewMembership(
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
