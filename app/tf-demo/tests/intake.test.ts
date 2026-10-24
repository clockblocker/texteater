import { expect, test } from "bun:test";
import { extractPastedText, operations, parseScroll, TraceSink } from "dumgen";
import * as Effect from "effect/Effect";
import { projectSentenceView } from "../convex/modules/scroll/sentenceView";
import {
	findStoredExtractedText,
	persistSubmittedScroll,
} from "../convex/modules/scroll/submission";
import {
	createIntake,
	GERMAN_ONLY_MESSAGE,
	type SubmittedScroll,
	unsupportedLanguageMessage,
} from "../server/intake";
import { createIntakeRunRecorder } from "../server/intakeRun";
import { createTestConvex } from "./support/convex";
import {
	asksAbout,
	fakeJev,
	germanAnswers,
	isLanguageRequest,
} from "./support/jev";
import { intakeDumgen } from "./support/providers";

const SOURCE = "Er gibt auf. Er wohnt im Haus.\n\nJa!";

const VERB = { language: "de", family: "Lexeme", kind: "VERB" } as const;
const PRON = { language: "de", family: "Lexeme", kind: "PRON" } as const;

/**
 * The submission as the `persistSubmittedScroll` mutation takes it: intake hands
 * readonly arrays, Convex's validator types want mutable ones, so copy them as
 * `convex/orchestration.ts` does on the way in.
 */
function persistable(submission: SubmittedScroll) {
	return {
		...submission,
		sentences: submission.sentences.map((sentence) => ({
			...sentence,
			segments: [...sentence.segments],
			units: [...sentence.units],
		})),
	};
}

/** Intake with a fake jev and a persistence port that keeps what it was handed. */
function intakeWith(jev: ReturnType<typeof fakeJev>, sentenceCount = 3) {
	const stored: SubmittedScroll[] = [];
	const run = createIntakeRunRecorder(sentenceCount);
	const intake = createIntake({
		dumgen: operations,
		onSegmenting: run.segmenting,
		persistence: {
			persistSubmittedScroll: async (input) => {
				stored.push(input);
				return { scrollId: "scroll-1" };
			},
		},
	});
	const submit = (
		sourceText = SOURCE,
		language: "de" | "en" = "de",
		extractedText = extractPastedText(sourceText),
	) =>
		Effect.runPromise(
			intake
				.submitText({
					submissionKey: "key",
					sourceText,
					extractedText,
					language,
				})
				.pipe(
					Effect.provideService(TraceSink, run.operation),
					Effect.provide(intakeDumgen(jev)),
				),
		);
	return { stored, run, submit };
}

/** Segmentation's requests, leaving out `language.detect`'s. */
const segmentationRequests = (jev: ReturnType<typeof fakeJev>) =>
	jev.sent.filter((request) => !isLanguageRequest(request));

test("intake splits a Scroll into paragraphs and Sentences in code and hands each on with its Segments and units", async () => {
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
	const handed = stored[0];
	if (!handed) throw new Error("Expected a submission.");
	const submission = persistable(handed);
	const t = createTestConvex();
	const { sentenceIds } = await t.run((ctx) =>
		persistSubmittedScroll(ctx, submission),
	);
	const firstSentenceId = sentenceIds[0];
	if (!firstSentenceId) throw new Error("Expected a stored first Sentence.");
	const view = await t.run(async (ctx) => {
		const sentence = await ctx.db.get(firstSentenceId);
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
		persistSubmittedScroll(ctx, {
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
		async (ctx) => (await ctx.db.get(firstSentenceId))?.units,
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
	const persist = (units: SubmittedScroll["sentences"][number]["units"]) =>
		t.run((ctx) =>
			persistSubmittedScroll(ctx, {
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
		fail: (request) =>
			!isLanguageRequest(request) && asksAbout(request, "Ja!"),
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
		persistSubmittedScroll(ctx, persistable(submission)),
	);
	const thirdSentenceId = sentenceIds[2];
	if (!thirdSentenceId) throw new Error("Expected a stored third Sentence.");
	const view = await t.run(async (ctx) => {
		const sentence = await ctx.db.get(thirdSentenceId);
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
			persistSubmittedScroll(ctx, {
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
		fail: (request) =>
			!isLanguageRequest(request) && asksAbout(request, "Ja!"),
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
	const failed = segmentationRequests(jev).filter((request) =>
		asksAbout(request, "Ja!"),
	).length;
	expect(jev.sent.filter(isLanguageRequest)).toHaveLength(1);
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
				segmentationRequests(jev)
					.filter((request) => asksAbout(request, "Ja!"))
					.reduce(
						(sum, { questions }) =>
							sum + Object.keys(questions).length,
						0,
					),
		outputTokens: jev.sent.length - failed,
	});
	expect(failed).toBeGreaterThan(0);
	// The summary keeps no text, prompt or answer.
	expect(JSON.stringify(summary)).not.toContain("gibt");
});

test("a Scroll in another language is turned away with a clear message before any jev call", async () => {
	expect(unsupportedLanguageMessage("de")).toBeUndefined();
	expect(unsupportedLanguageMessage("en")).toBe(GERMAN_ONLY_MESSAGE);
	expect(unsupportedLanguageMessage("he")).toBeUndefined();
	const jev = fakeJev();
	const { stored, submit } = intakeWith(jev);
	await expect(submit("The way is the goal.", "en")).rejects.toThrow(
		GERMAN_ONLY_MESSAGE,
	);
	expect(jev.sent).toEqual([]);
	expect(stored).toEqual([]);
});

const MIXED = [
	"Lies den Text. Read the text.",
	'ד"ר כהן צחק. Hm.',
	"Er gibt auf.",
].join("\n\n");

test("a mixed paste keeps its Extracted Text, segments only its German Sentences and stores the rest as Plain Sentences", async () => {
	const jev = fakeJev({
		answers: germanAnswers,
		languages: { "Read the text.": "English", "Hm.": "Unknown" },
	});
	const { stored, run, submit } = intakeWith(jev, 5);
	await submit(MIXED);
	const submission = stored[0];
	if (!submission) throw new Error("Expected a submission.");
	expect(submission.extractedText).toEqual(extractPastedText(MIXED));
	expect(
		submission.sentences.map(
			({ position, paragraph, language, stitchedText, segments }) => ({
				position,
				paragraph,
				language,
				stitchedText,
				segmented: segments.length > 0,
			}),
		),
	).toEqual([
		{
			position: 0,
			paragraph: 0,
			language: "de",
			stitchedText: "Lies den Text.",
			segmented: true,
		},
		{
			position: 1,
			paragraph: 0,
			language: "en",
			stitchedText: "Read the text.",
			segmented: false,
		},
		// Hebrew script settles it in code; Hm. takes it from before.
		{
			position: 2,
			paragraph: 1,
			language: "he",
			stitchedText: 'ד"ר כהן צחק.',
			segmented: false,
		},
		{
			position: 3,
			paragraph: 1,
			language: "he",
			stitchedText: "Hm.",
			segmented: false,
		},
		{
			position: 4,
			paragraph: 2,
			language: "de",
			stitchedText: "Er gibt auf.",
			segmented: true,
		},
	]);
	expect(submission.sentences[4]?.units).toEqual([
		{ segments: [0], route: PRON },
		{ segments: [2, 4], route: VERB },
	]);
	// Segmentation never read a Plain Sentence.
	for (const plain of ["Read the text.", 'ד"ר כהן צחק.', "Hm."])
		expect(
			segmentationRequests(jev).some((request) =>
				asksAbout(request, plain),
			),
		).toBe(false);
	expect(
		run
			.summary({
				runId: "run-1",
				submissionKey: "key",
				outcome: "Accepted",
				durationMs: 1,
				createdAt: 0,
			})
			.sentences.map(({ segmentation }) => segmentation),
	).toEqual(["Segmented", "Plain", "Plain", "Plain", "Segmented"]);

	// Storage keeps the Plain Sentences with no Segments, and the reader
	// view shows them as plain text.
	const t = createTestConvex();
	const { sentenceIds } = await t.run((ctx) =>
		persistSubmittedScroll(ctx, persistable(submission)),
	);
	const views = await t.run(async (ctx) =>
		Promise.all(
			sentenceIds.map(async (id) => {
				const sentence = await ctx.db.get(id);
				if (!sentence) throw new Error("Expected a Sentence.");
				return projectSentenceView(ctx, sentence, "visitor-1");
			}),
		),
	);
	expect(
		views.map(({ plain, language, segments }) => ({
			plain,
			language,
			segments: segments.length,
		})),
	).toEqual([
		{ plain: undefined, language: "de", segments: 6 },
		{ plain: true, language: "en", segments: 0 },
		{ plain: true, language: "he", segments: 0 },
		{ plain: true, language: "he", segments: 0 },
		{ plain: undefined, language: "de", segments: 6 },
	]);
});

test("an undetermined Sentence with no surroundings is stored with no language, as a Plain Sentence", async () => {
	const jev = fakeJev({ languages: { "Hm.": "Unknown" } });
	const { stored, submit } = intakeWith(jev, 1);
	await submit("Hm.");
	expect(stored[0]?.sentences).toEqual([
		{
			segmentedSentenceId: "key#0",
			position: 0,
			paragraph: 0,
			stitchedText: "Hm.",
			segments: [],
			units: [],
		},
	]);
	// With no German Sentence, segmentation is never asked.
	expect(segmentationRequests(jev)).toEqual([]);
});

test("re-running intake from the stored Extracted Text rebuilds the same Scroll", async () => {
	const jev = fakeJev({
		answers: germanAnswers,
		languages: { "Read the text.": "English", "Hm.": "Unknown" },
	});
	const { stored, submit } = intakeWith(jev, 5);
	await submit(MIXED);
	const first = stored[0];
	if (!first) throw new Error("Expected a submission.");
	const t = createTestConvex();
	const persisted = await t.run((ctx) =>
		persistSubmittedScroll(ctx, persistable(first)),
	);
	const kept = await t.run((ctx) =>
		findStoredExtractedText(ctx, {
			submissionKey: "key",
			sourceText: MIXED,
		}),
	);
	await submit(MIXED, "de", parseScroll(kept));
	const second = stored[1];
	if (!second) throw new Error("Expected a second submission.");
	expect(second).toEqual(first);
	// Storage finds the same analysis and keeps the Scroll it has.
	expect(
		await t.run((ctx) => persistSubmittedScroll(ctx, persistable(second))),
	).toEqual({ ...persisted, deduplicated: true });
});
