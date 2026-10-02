import { expect, test } from "bun:test";
import { createDumgen } from "dumgen";
import * as Effect from "effect/Effect";
import { projectSentenceView } from "../convex/modules/text/sentenceView";
import { persistSubmittedText } from "../convex/modules/text/submission";
import {
	createIntake,
	GERMAN_ONLY_MESSAGE,
	type SubmittedText,
	unsupportedLanguageMessage,
} from "../server/intake";
import { createIntakeRunRecorder } from "../server/intakeRun";
import { createTestConvex } from "./support/convex";
import { asksAbout, fakeJev, germanAnswers } from "./support/jev";

const SOURCE = "Er gibt auf. Er wohnt im Haus.\n\nJa!";

const VERB = { language: "de", family: "Lexeme", kind: "VERB" } as const;
const PRON = { language: "de", family: "Lexeme", kind: "PRON" } as const;

/** Intake with a fake jev and a persistence port that keeps what it was handed. */
function intakeWith(jev: ReturnType<typeof fakeJev>) {
	const stored: SubmittedText[] = [];
	const run = createIntakeRunRecorder(3);
	const intake = createIntake({
		segment: createDumgen({ jev: jev.ask, onOperation: run.operation })
			.segment,
		persistence: {
			persistSubmittedText: async (input) => {
				stored.push(input);
				return { textId: "text-1" };
			},
		},
	});
	const submit = (sourceText = SOURCE, language: "de" | "en" = "de") =>
		Effect.runPromise(
			intake.submitText({ submissionKey: "key", sourceText, language }),
		);
	return { stored, run, submit };
}

test("intake splits a Text into paragraphs and Sentences in code and hands each on with its Segments and units", async () => {
	const jev = fakeJev({ answers: germanAnswers });
	const { stored, submit } = intakeWith(jev);
	await submit();

	const [submission] = stored;
	expect(submission?.sourceText).toBe(SOURCE);
	expect(
		submission?.sentences.map(
			({ segmentedSentenceId, position, paragraph, stitchedText }) => ({
				segmentedSentenceId,
				position,
				paragraph,
				stitchedText,
			}),
		),
	).toEqual([
		{
			segmentedSentenceId: "key#0",
			position: 0,
			paragraph: 0,
			stitchedText: "Er gibt auf.",
		},
		{
			segmentedSentenceId: "key#1",
			position: 1,
			paragraph: 0,
			stitchedText: "Er wohnt im Haus.",
		},
		{
			segmentedSentenceId: "key#2",
			position: 2,
			paragraph: 1,
			stitchedText: "Ja!",
		},
	]);
	const [gibtAuf, wohnt] = submission?.sentences ?? [];
	// A separable verb is one unit over discontinuous Segments, by index.
	expect(gibtAuf?.units).toEqual([
		{ segments: [0], route: PRON },
		{ segments: [2, 4], route: VERB },
	]);
	// A fused word arrives as its pieces, each with the word it stands for.
	expect(wohnt?.segments.slice(4, 6)).toEqual([
		{ kind: "ResolvableText", text: "i", surface: "in" },
		{ kind: "ResolvableText", text: "m", surface: "dem" },
	]);
	expect(wohnt?.segments.map(({ text }) => text).join("")).toBe(
		"Er wohnt im Haus.",
	);
});

test("stored units index into their Sentence's Segments, and the reader view gives every member its whole unit", async () => {
	const { stored, submit } = intakeWith(fakeJev({ answers: germanAnswers }));
	await submit();
	const submission = stored[0];
	if (!submission) throw new Error("Expected a submission.");
	const t = createTestConvex();
	const { sentenceIds } = await t.run((ctx) =>
		persistSubmittedText(ctx, submission),
	);
	const view = await t.run(async (ctx) => {
		const sentence = await ctx.db.get(sentenceIds[0] ?? ("" as never));
		if (!sentence) throw new Error("Expected the first Sentence.");
		return {
			units: sentence.units,
			view: await projectSentenceView(ctx, sentence, "visitor-1"),
		};
	});
	expect(view.units).toEqual([
		{ segments: [0], route: PRON },
		{ segments: [2, 4], route: VERB },
	]);
	expect(
		view.view.segments.map(({ index, text, unit }) => ({
			index,
			text,
			unit,
		})),
	).toEqual([
		{ index: 0, text: "Er", unit: { segments: [0], route: PRON } },
		{ index: 1, text: " ", unit: undefined },
		{ index: 2, text: "gibt", unit: { segments: [2, 4], route: VERB } },
		{ index: 3, text: " ", unit: undefined },
		{ index: 4, text: "auf", unit: { segments: [2, 4], route: VERB } },
		{ index: 5, text: ".", unit: undefined },
	]);

	// A retry finds the same Segments and keeps the first units it stored.
	const retried = await t.run((ctx) =>
		persistSubmittedText(ctx, {
			...submission,
			sentences: submission.sentences.map((sentence) => ({
				...sentence,
				units: sentence.segments.flatMap((segment, index) =>
					segment.kind === "ResolvableText"
						? [{ segments: [index], route: "Unresolved" as const }]
						: [],
				),
			})),
		}),
	);
	expect(retried).toMatchObject({ deduplicated: true, sentenceIds });
	const units = await t.run(
		async (ctx) =>
			(await ctx.db.get(sentenceIds[0] ?? ("" as never)))?.units,
	);
	expect(units).toEqual(view.units);
});

test("storage refuses units that do not cover the ResolvableText Segments exactly once", async () => {
	const t = createTestConvex();
	const sentence = {
		segmentedSentenceId: "bad#0",
		position: 0,
		paragraph: 0,
		language: "de" as const,
		stitchedText: "Er geht.",
		segments: [
			{ kind: "ResolvableText" as const, text: "Er" },
			{ kind: "Whitespace" as const, text: " " },
			{ kind: "ResolvableText" as const, text: "geht" },
			{ kind: "Punctuation" as const, text: "." },
		],
	};
	const persist = (units: SubmittedText["sentences"][number]["units"]) =>
		t.run((ctx) =>
			persistSubmittedText(ctx, {
				submissionKey: "bad",
				sourceText: "Er geht.",
				sentences: [{ ...sentence, units: [...units] }],
			}),
		);
	await expect(
		persist([{ segments: [0], route: "Unresolved" }]),
	).rejects.toThrow("Segment 2 belongs to no unit");
	await expect(
		persist([{ segments: [0, 1, 2], route: "Unresolved" }]),
	).rejects.toThrow("Unit member 1 is not a ResolvableText Segment");
	await expect(
		persist([
			{ segments: [0, 2], route: "Unresolved" },
			{ segments: [2], route: "Unresolved" },
		]),
	).rejects.toThrow("Segment 2 belongs to two units");
});

test("a Sentence whose jev request fails is stored marked as not segmented, with its written words and no units", async () => {
	const jev = fakeJev({
		answers: germanAnswers,
		fail: (request) => asksAbout(request, "Ja!"),
	});
	const { stored, submit } = intakeWith(jev);
	await submit();
	const submission = stored[0];
	if (!submission) throw new Error("Expected a submission.");
	const sentences = submission.sentences;
	expect(sentences[2]).toEqual({
		segmentedSentenceId: "key#2",
		position: 2,
		paragraph: 1,
		language: "de",
		stitchedText: "Ja!",
		segments: [
			{ kind: "ResolvableText", text: "Ja" },
			{ kind: "Punctuation", text: "!" },
		],
		units: [],
		segmentationFailed: true,
	});
	// The other Sentences are untouched by it.
	expect(sentences[0]?.units).toEqual([
		{ segments: [0], route: PRON },
		{ segments: [2, 4], route: VERB },
	]);
	expect(sentences[0]).not.toHaveProperty("segmentationFailed");

	// Storage keeps the mark, and the reader view shows the Sentence so.
	const t = createTestConvex();
	const { sentenceIds } = await t.run((ctx) =>
		persistSubmittedText(ctx, submission),
	);
	const view = await t.run(async (ctx) => {
		const sentence = await ctx.db.get(sentenceIds[2] ?? ("" as never));
		if (!sentence) throw new Error("Expected the third Sentence.");
		return projectSentenceView(ctx, sentence, "visitor-1");
	});
	expect(view).toMatchObject({ segmentationFailed: true });
	expect(view.segments.map(({ unit }) => unit)).toEqual([
		undefined,
		undefined,
	]);
});

test("storage refuses units on a Sentence marked as not segmented", async () => {
	const t = createTestConvex();
	await expect(
		t.run((ctx) =>
			persistSubmittedText(ctx, {
				submissionKey: "marked",
				sourceText: "Ja!",
				sentences: [
					{
						segmentedSentenceId: "marked#0",
						position: 0,
						paragraph: 0,
						language: "de",
						stitchedText: "Ja!",
						segments: [
							{ kind: "ResolvableText", text: "Ja" },
							{ kind: "Punctuation", text: "!" },
						],
						units: [{ segments: [0], route: "Unresolved" }],
						segmentationFailed: true,
					},
				],
			}),
		),
	).rejects.toThrow("A Sentence whose segmentation failed stores no units.");
});

test("the intake run sums jev tokens from every call and records how each Sentence ended", async () => {
	const jev = fakeJev({
		answers: germanAnswers,
		fail: (request) => asksAbout(request, "Ja!"),
	});
	const { run, submit } = intakeWith(jev);
	await submit();
	const summary = run.summary({
		runId: "run-1",
		submissionKey: "key",
		outcome: "Accepted",
		durationMs: 1,
		createdAt: 0,
	});
	const questions = jev.sent.map(
		({ questions }) => Object.keys(questions).length,
	);
	const failed = jev.sent.filter((request) =>
		asksAbout(request, "Ja!"),
	).length;
	expect(summary.sentences).toEqual([
		{ segmentation: "Segmented" },
		{ segmentation: "Segmented" },
		{ segmentation: "Failed" },
	]);
	expect(summary.jev).toMatchObject({
		calls: jev.sent.length,
		failed,
		// A failed request used no tokens.
		inputTokens:
			10 * questions.reduce((sum, count) => sum + count, 0) -
			10 *
				jev.sent
					.filter((request) => asksAbout(request, "Ja!"))
					.reduce(
						(sum, { questions }) =>
							sum + Object.keys(questions).length,
						0,
					),
		outputTokens: jev.sent.length - failed,
	});
	expect(failed).toBeGreaterThan(0);
	// The summary keeps no Text, prompt or answer.
	expect(JSON.stringify(summary)).not.toContain("gibt");
});

test("a Text in another language is turned away with a clear message before any jev call", async () => {
	expect(unsupportedLanguageMessage("de")).toBeUndefined();
	expect(unsupportedLanguageMessage("en")).toBe(GERMAN_ONLY_MESSAGE);
	expect(unsupportedLanguageMessage("he")).toBe(GERMAN_ONLY_MESSAGE);
	const jev = fakeJev();
	const { stored, submit } = intakeWith(jev);
	await expect(submit("The way is the goal.", "en")).rejects.toThrow(
		GERMAN_ONLY_MESSAGE,
	);
	expect(jev.sent).toEqual([]);
	expect(stored).toEqual([]);
});
