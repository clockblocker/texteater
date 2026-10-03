import { expect, test } from "bun:test";
import { internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { createTestConvex, submitText } from "./support/convex";
import { startSession } from "./support/occurrences";

const verb = { language: "de", family: "Lexeme", kind: "VERB" } as const;
const noun = { language: "de", family: "Lexeme", kind: "NOUN" } as const;
const pron = { language: "de", family: "Lexeme", kind: "PRON" } as const;
const adp = { language: "de", family: "Lexeme", kind: "ADP" } as const;

/** `Er geht zum Arzt.` stored with `zum` whole, then marked as failed, and a click on `zum`. */
async function failedSentence() {
	const t = createTestConvex();
	const { sentenceIds } = await submitText(t, [
		["Er", " ", "geht", " ", "zum", " ", "Arzt", "."],
	]);
	const sentenceId = sentenceIds[0] as Id<"sentences">;
	const selection = {
		requestId: "request-1",
		visitorId: "visitor-1",
		sentenceId,
		clickedSegmentIndex: 4,
	};
	const sessionGuard = await startSession(t, selection);
	await t.run((ctx) =>
		ctx.db.patch(sentenceId, { units: [], segmentationFailed: true }),
	);
	return { t, sentenceId, selection, sessionGuard };
}

const rows = (
	t: ReturnType<typeof createTestConvex>,
	sentenceId: Id<"sentences">,
) =>
	t.run(async (ctx) =>
		(
			await ctx.db
				.query("segments")
				.withIndex("by_sentence_id_and_index", (q) =>
					q.eq("sentenceId", sentenceId),
				)
				.collect()
		).map(({ _id, index, text, surface }) => ({
			_id,
			index,
			text,
			surface,
		})),
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
	const { t, sentenceId, selection, sessionGuard } = await failedSentence();
	const clicked = (await rows(t, sentenceId)).find(
		({ index }) => index === 4,
	);
	const result = await t.mutation(
		internal.persistence.storeResegmentedSentence,
		{
			...selection,
			sessionGuard,
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
		},
	);
	expect(result).toEqual({ clickedSegmentIndex: 4 });
	const after = await rows(t, sentenceId);
	expect(after.map(({ text }) => text)).toEqual([
		"Er",
		" ",
		"geht",
		" ",
		"zu",
		"m",
		" ",
		"Arzt",
		".",
	]);
	// The clicked row is kept, now the piece zu, so its session holds.
	expect(after.find(({ index }) => index === 4)?._id).toBe(clicked?._id);
	const session = await t.run((ctx) =>
		ctx.db
			.query("resolutionSessions")
			.withIndex("by_request_id", (q) => q.eq("requestId", "request-1"))
			.unique(),
	);
	expect(session?.clickedSegmentIndex).toBe(4);
	expect(session?.segmentId).toBe(clicked?._id);
	expect(
		(await t.run((ctx) => ctx.db.get(sentenceId)))?.segmentationFailed,
	).toBeUndefined();
});
