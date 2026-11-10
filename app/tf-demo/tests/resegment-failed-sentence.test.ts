import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import type { FunctionArgs } from "convex/server";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { createTestConvex, submitText } from "./support/convex";
import { startSession } from "./support/occurrences";

const verb = { language: "de", family: "Lexeme", kind: "VERB" } as const;
const noun = { language: "de", family: "Lexeme", kind: "NOUN" } as const;
const pron = { language: "de", family: "Lexeme", kind: "PRON" } as const;
const adp = { language: "de", family: "Lexeme", kind: "ADP" } as const;

// Selecting the Segment schedules its Resolution Session run; fake timers keep
// it from firing after the test into another file's fake jev (#1061).
beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

type TestConvex = ReturnType<typeof createTestConvex>;

/** `Er geht zum Arzt.` stored with `zum` whole. */
async function storedSentence() {
	const t = createTestConvex();
	const { sentenceIds } = await submitText(t, [
		["Er", " ", "geht", " ", "zum", " ", "Arzt", "."],
	]);
	const sentenceId = sentenceIds[0] as Id<"sentences">;
	const click = (
		requestId: string,
		clickedSegmentIndex: number,
		visitorId = "visitor-1",
	) => ({ requestId, visitorId, sentenceId, clickedSegmentIndex });
	const markFailed = () =>
		t.run((ctx) =>
			ctx.db.patch(sentenceId, { units: [], segmentationFailed: true }),
		);
	return { t, sentenceId, click, markFailed };
}

/** The stored Sentence, then marked as failed, and a click on `zum`. */
async function failedSentence() {
	const { t, sentenceId, click, markFailed } = await storedSentence();
	const selection = click("request-1", 4);
	const sessionGuard = await startSession(t, selection);
	await markFailed();
	return { t, sentenceId, selection, sessionGuard };
}

/**
 * The failed Sentence with an earlier click on `Arzt`, by `arztVisitorId`,
 * which `endArzt` ends in a PermanentFailure, and a click on `zum`.
 */
async function failedSentenceWithArztClick(arztVisitorId = "visitor-1") {
	const { t, sentenceId, click, markFailed } = await storedSentence();
	await markFailed();
	const arztGuard = await startSession(
		t,
		click("request-arzt", 6, arztVisitorId),
	);
	const endArzt = () =>
		t.mutation(internal.resolutionSessions.recordRunFailure, {
			guard: arztGuard,
			failure: {
				kind: "Internal",
				phase: "Grammar",
				diagnosticId: "diagnostic-1",
				errorName: "Error",
				errorFingerprint: "fnv1a-1",
			},
		});
	const selection = click("request-zum", 4);
	const sessionGuard = await startSession(t, selection);
	return { t, sentenceId, arztGuard, endArzt, selection, sessionGuard };
}

/** The Sentence segmented again, with `zum` split into `zu` and `m`. */
const zumSplit: Pick<
	FunctionArgs<typeof internal.persistence.storeResegmentedSentence>,
	"segments" | "units"
> = {
	segments: [
		{ kind: "ResolvableText", text: "Er" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "geht" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "zu", surface: "zu" },
		{ kind: "ResolvableText", text: "m", surface: "dem" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "Arzt" },
		{ kind: "Punctuation", text: "." },
	],
	units: [
		{ segments: [0], route: pron },
		{ segments: [2], route: verb },
		{ segments: [4], route: adp },
		{ segments: [5, 7], route: noun },
	],
};
const zumSplitTexts = zumSplit.segments.map(({ text }) => text);

const storeZumSplit = (
	t: TestConvex,
	click: Awaited<ReturnType<typeof failedSentence>>,
) =>
	t.mutation(internal.persistence.storeResegmentedSentence, {
		...click.selection,
		sessionGuard: click.sessionGuard,
		...zumSplit,
	});

const stored = (t: TestConvex, sentenceId: Id<"sentences">) =>
	t.run((ctx) =>
		ctx.db
			.query("segments")
			.withIndex("by_sentence_id_and_index", (q) =>
				q.eq("sentenceId", sentenceId),
			)
			.collect(),
	);

const rows = async (t: TestConvex, sentenceId: Id<"sentences">) =>
	(await stored(t, sentenceId)).map(({ _id, index, text, surface }) => ({
		_id,
		index,
		text,
		surface,
	}));

/** Each stored Segment's text with the kind of its Resolution State. */
const states = async (t: TestConvex, sentenceId: Id<"sentences">) =>
	(await stored(t, sentenceId)).map(
		({ text, resolutionState }) =>
			[text, resolutionState?.kind ?? null] as const,
	);

const sessionOf = (t: TestConvex, requestId: string) =>
	t.run((ctx) =>
		ctx.db
			.query("resolutionSessions")
			.withIndex("by_request_id", (q) => q.eq("requestId", requestId))
			.unique(),
	);

test("a re-segmentation with the stored Segments stores its units and ends the failure mark", async () => {
	const { t, sentenceId, selection, sessionGuard } = await failedSentence();
	const before = await rows(t, sentenceId);
	const units = [
		{ segments: [0], route: pron },
		{ segments: [2], route: verb },
		{ segments: [4], route: adp },
		{ segments: [6], route: noun },
	];
	const result = await t.mutation(
		internal.persistence.storeResegmentedSentence,
		{
			...selection,
			sessionGuard,
			segments: before.map(({ text }) => ({
				kind:
					text.trim() === ""
						? "Whitespace"
						: text === "."
							? "Punctuation"
							: "ResolvableText",
				text,
			})) as never,
			units,
		},
	);
	expect(result).toEqual({ clickedSegmentIndex: 4 });
	expect(await rows(t, sentenceId)).toEqual(before);
	const sentence = await t.run((ctx) => ctx.db.get(sentenceId));
	expect(sentence?.units).toEqual(units);
	expect(sentence?.segmentationFailed).toBeUndefined();
});

test("Segments that came out differently replace the stored ones, and the click's row and session move to the Segment at its place", async () => {
	const click = await failedSentence();
	const { t, sentenceId } = click;
	const clicked = (await rows(t, sentenceId)).find(
		({ index }) => index === 4,
	);
	const result = await storeZumSplit(t, click);
	expect(result).toEqual({ clickedSegmentIndex: 4 });
	const after = await rows(t, sentenceId);
	expect(after.map(({ text }) => text)).toEqual(zumSplitTexts);
	// The clicked row is kept, now the piece zu, so its session holds.
	expect(after.find(({ index }) => index === 4)?._id).toBe(clicked?._id);
	const session = await sessionOf(t, "request-1");
	expect(session?.clickedSegmentIndex).toBe(4);
	expect(session?.segmentId).toBe(clicked?._id);
	expect(
		(await t.run((ctx) => ctx.db.get(sentenceId)))?.segmentationFailed,
	).toBeUndefined();
});

test("a click that ended on another word does not hold the Segments, and none of the new ones carries its Resolution State", async () => {
	const click = await failedSentenceWithArztClick();
	const { t, sentenceId } = click;
	await click.endArzt();
	expect(await states(t, sentenceId)).toContainEqual([
		"Arzt",
		"PermanentFailure",
	]);

	expect(await storeZumSplit(t, click)).toEqual({ clickedSegmentIndex: 4 });

	// Reused in order, Arzt's old row would have become the space before it.
	expect(await states(t, sentenceId)).toEqual(
		zumSplitTexts.map((text) => [text, text === "zu" ? "Active" : null]),
	);
	const sentence = await t.run((ctx) => ctx.db.get(sentenceId));
	expect(sentence?.units).toEqual(zumSplit.units);
	expect(sentence?.segmentationFailed).toBeUndefined();
});

test("a click still running on another word holds the Segments", async () => {
	const click = await failedSentenceWithArztClick("visitor-2");
	const { t, sentenceId } = click;
	const before = await rows(t, sentenceId);

	await expect(storeZumSplit(t, click)).rejects.toThrow(
		"Another click holds this Sentence's Segments; click it again.",
	);

	expect(await rows(t, sentenceId)).toEqual(before);
	expect(
		(await t.run((ctx) => ctx.db.get(sentenceId)))?.segmentationFailed,
	).toBe(true);
	// Once that click has ended, clicking again stores the Segments.
	await click.endArzt();
	expect(await storeZumSplit(t, click)).toEqual({ clickedSegmentIndex: 4 });
});

test("an ended click's Segment is removed with its session and Visitor Encounter, so retrying it starts nothing", async () => {
	const click = await failedSentenceWithArztClick();
	const { t, sentenceId } = click;
	await click.endArzt();
	const arzt = click.arztGuard.segmentId;

	await storeZumSplit(t, click);

	expect(await t.run((ctx) => ctx.db.get(arzt))).toBeNull();
	expect(await sessionOf(t, "request-arzt")).toBeNull();
	expect(
		await t.query(api.resolutionSessions.getResolutionNote, {
			requestId: "request-arzt",
		}),
	).toBeNull();
	// The click on zum keeps its row, and with it its Encounter.
	const encounters = await t.run((ctx) =>
		ctx.db.query("visitorEncounters").collect(),
	);
	expect(encounters.map(({ segmentId }) => segmentId)).toEqual([
		click.sessionGuard.segmentId,
	]);

	expect(
		await t.mutation(api.resolutionSessions.retryResolution, {
			requestId: "request-arzt",
			visitorId: "visitor-1",
		}),
	).toEqual({ retried: false });
	expect(await states(t, sentenceId)).toEqual(
		zumSplitTexts.map((text) => [text, text === "zu" ? "Active" : null]),
	);
});
