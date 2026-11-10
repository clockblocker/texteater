import { expect, test } from "bun:test";
import type { JevAsk, LanguagedText, SegmentedText } from "dumgen";
import { operations, TraceSink } from "dumgen";
import * as Effect from "effect/Effect";
import { persistSubmittedScroll } from "../convex/modules/scroll/submission";
import {
	analyzeParagraphs,
	type IntakeDumgen,
	mayBeIn,
} from "../server/intakeAnalysis";
import { createIntakeRunRecorder } from "../server/intakeRun";
import { createTestConvex } from "./support/convex";
import {
	asksAbout,
	fakeJev,
	germanAnswers,
	isLanguageRequest,
} from "./support/jev";
import { intakeDumgen } from "./support/providers";

/*
 * Intake's analysis as two independent results joined per Sentence:
 * `language.detect` beside `segment.inUnits`, neither waiting for the
 * other, a failed detection falling back to the Scroll's language.
 */

const run = <A, E>(program: Effect.Effect<A, E, never>): Promise<A> =>
	Effect.runPromise(program);

function analyze(
	jev: { readonly ask: JevAsk; readonly sent: unknown[] },
	paragraphs: readonly { readonly sentences: readonly string[] }[],
	recorder = createIntakeRunRecorder(
		paragraphs.flatMap(({ sentences }) => sentences).length,
	),
) {
	return run(
		analyzeParagraphs(operations, paragraphs, "de", recorder.observer).pipe(
			Effect.provideService(TraceSink, recorder.operation),
			Effect.provide(intakeDumgen(jev as ReturnType<typeof fakeJev>)),
		),
	).then((analyzed) => ({ analyzed, recorder }));
}

const outcomes = (recorder: ReturnType<typeof createIntakeRunRecorder>) =>
	recorder
		.summary({
			runId: "run-1",
			submissionKey: "key",
			outcome: "Accepted",
			durationMs: 1,
			createdAt: 0,
		})
		.sentences.map(({ segmentation }) => segmentation);

test("segmentation starts before detection answers: detection gates nothing", async () => {
	const jev = fakeJev({ answers: germanAnswers });
	let segmentationAsked: () => void = () => undefined;
	const segmenting = new Promise<void>((resolve) => {
		segmentationAsked = resolve;
	});
	// Detection answers only once segmentation has asked; with detection
	// first, it would wait for ever, so it gives up after a second.
	const ask: JevAsk = async (request, options) => {
		if (!isLanguageRequest(request)) segmentationAsked();
		else
			await Promise.race([
				segmenting,
				new Promise((_, reject) =>
					setTimeout(
						() =>
							reject(Error("segmentation waited for detection")),
						1_000,
					),
				),
			]);
		return jev.ask(request, options);
	};
	const { analyzed } = await analyze({ ask, sent: jev.sent }, [
		{ sentences: ["Er gibt auf."] },
	]);
	expect(analyzed[0]?.[0]).toMatchObject({
		language: "de",
		units: [
			{ segments: [0], route: { kind: "PRON" } },
			{ segments: [2, 4], route: { kind: "VERB" } },
		],
	});
});

test("a failed detection leaves every Sentence code allows in the Scroll's language, and nothing fails", async () => {
	const jev = fakeJev({
		answers: germanAnswers,
		fail: (request) => isLanguageRequest(request),
	});
	const { analyzed, recorder } = await analyze(jev, [
		{ sentences: ["Er gibt auf.", 'ד"ר כהן צחק.'] },
		{ sentences: ["Er wohnt im Haus."] },
	]);
	expect(
		analyzed.map((sentences) =>
			sentences.map(({ language, units, segmentationFailed }) => ({
				language,
				units: units.length,
				segmentationFailed,
			})),
		),
	).toEqual([
		[
			{ language: "de", units: 2, segmentationFailed: undefined },
			// Hebrew script rules German out; with no detection it stays
			// undetermined.
			{ language: undefined, units: 0, segmentationFailed: undefined },
		],
		[{ language: "de", units: 5, segmentationFailed: undefined }],
	]);
	expect(outcomes(recorder)).toEqual(["Segmented", "Plain", "Segmented"]);
	expect(jev.sent.filter(isLanguageRequest)).toHaveLength(1);
});

test("a Sentence cut beside detection but detected in another language is stored Plain, its cut dropped", async () => {
	const jev = fakeJev({
		answers: germanAnswers,
		languages: { "Read the text.": "English" },
	});
	const { analyzed, recorder } = await analyze(jev, [
		{ sentences: ["Er gibt auf.", "Read the text."] },
	]);
	expect(analyzed[0]?.[1]).toEqual({
		language: "en",
		stitchedText: "Read the text.",
		segments: [],
		units: [],
	});
	expect(
		jev.sent.some(
			(request) =>
				!isLanguageRequest(request) &&
				asksAbout(request, "Read the text."),
		),
	).toBe(true);
	// The run counts its jev calls, yet records the Sentence as Plain.
	expect(outcomes(recorder)).toEqual(["Segmented", "Plain"]);
});

test("code leaves German possible only for a Sentence mostly in Latin script, or with no letters", () => {
	expect(mayBeIn("Er gibt auf.", "de")).toBe(true);
	expect(mayBeIn("Read the text.", "de")).toBe(true);
	expect(mayBeIn("1914 – 1918.", "de")).toBe(true);
	expect(mayBeIn('ד"ר כהן צחק.', "de")).toBe(false);
	expect(mayBeIn("Москва — столица России.", "de")).toBe(false);
	// A name in another script does not outweigh the Sentence around it.
	expect(mayBeIn("Er wohnt in תל אביב seit Jahren.", "de")).toBe(true);
	expect(mayBeIn("אני גר ב-Tel Aviv.", "he")).toBe(true);
});

test("a Sentence whose routes stayed Unresolved keeps its grouping and is stored as segmented, not failed", async () => {
	const text = "Er gibt auf.";
	const segmented: SegmentedText = {
		language: "de",
		paragraphs: [
			{
				sentences: [
					{
						text,
						segments: [
							{ kind: "ResolvableText", text: "Er" },
							{ kind: "Whitespace", text: " " },
							{ kind: "ResolvableText", text: "gibt" },
							{ kind: "Whitespace", text: " " },
							{ kind: "ResolvableText", text: "auf" },
							{ kind: "Punctuation", text: "." },
						],
						// A late request failed: the route is Unresolved, the
						// grouping kept.
						units: [
							{
								segments: [0],
								route: {
									language: "de",
									family: "Lexeme",
									kind: "PRON",
								},
							},
							{ segments: [2, 4], route: "Unresolved" },
						],
					},
				],
			},
		],
	} as SegmentedText;
	const detected: LanguagedText = {
		paragraphs: [{ sentences: [{ text, language: "de" }] }],
	};
	const dumgen = {
		language: { detect: () => Effect.succeed(detected) },
		segment: { inUnits: () => Effect.succeed(segmented) },
	} as unknown as IntakeDumgen;
	const [[sentence] = []] = await run(
		analyzeParagraphs(dumgen, [{ sentences: [text] }], "de").pipe(
			Effect.provide(intakeDumgen()),
		),
	);
	expect(sentence).toMatchObject({
		language: "de",
		units: [
			{ segments: [0], route: { kind: "PRON" } },
			{ segments: [2, 4], route: "Unresolved" },
		],
	});
	expect(sentence).not.toHaveProperty("segmentationFailed");

	const t = createTestConvex();
	const { sentenceIds } = await t.run((ctx) =>
		persistSubmittedScroll(ctx, {
			submissionKey: "key",
			sourceText: text,
			sentences: [
				{
					segmentedSentenceId: "key#0",
					position: 0,
					paragraph: 0,
					language: "de",
					stitchedText: text,
					segments: [...(sentence?.segments ?? [])],
					units: (sentence?.units ?? []).map((unit) => ({
						...unit,
						segments: [...unit.segments],
					})),
				},
			],
		}),
	);
	const stored = await t.run((ctx) =>
		ctx.db.get(sentenceIds[0] as (typeof sentenceIds)[number]),
	);
	expect(stored?.segmentationFailed).toBeUndefined();
	expect(stored?.units).toEqual([
		{
			segments: [0],
			route: { language: "de", family: "Lexeme", kind: "PRON" },
		},
		{ segments: [2, 4], route: "Unresolved" },
	]);
});
