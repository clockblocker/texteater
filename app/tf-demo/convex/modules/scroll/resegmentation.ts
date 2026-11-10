import type { Infer, ObjectType } from "convex/values";
import { assertSentenceUnits } from "../../../server/storedSegments";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import type { occurrenceCommitArgs } from "../../model/occurrenceCommit";
import {
	deleteResolutionSessions,
	requireCommittingSession,
} from "../../model/resolutionSessions";
import { loadStoredSegments } from "../../model/storedSegments";
import type {
	storedSegmentInputValidator,
	storedUnitValidator,
} from "../../model/validators";

/**
 * Stores what a click's re-segmentation of a failed Sentence found (#861):
 * its units, its Segments when they came out differently, and the end of
 * its failure mark. The clicked Segment's row moves to the new Segment at
 * the same place in the Stitched Text, so the session that ran the click
 * keeps its Segment; any other row is reused, added or removed. A Sentence
 * another click already segmented again is left as it is. A failed
 * Sentence has no occurrence, and another session still running on one of
 * its Segments makes the click fail; the next click is a fresh attempt. A
 * click that ended on another Segment holds nothing: its row is never
 * reused, so the Segments stored here start without its Resolution State.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
export async function storeResegmentation(
	ctx: MutationCtx,
	args: ObjectType<typeof occurrenceCommitArgs> & {
		readonly segments: ReadonlyArray<
			Infer<typeof storedSegmentInputValidator>
		>;
		readonly units: Array<Infer<typeof storedUnitValidator>>;
	},
): Promise<{ clickedSegmentIndex: number }> {
	const session = await requireCommittingSession(
		ctx,
		args.sessionGuard,
		args,
	);
	const sentence = await ctx.db.get(args.sentenceId);
	if (!sentence) throw new Error("The requested sentence does not exist.");
	if (!sentence.segmentationFailed)
		return { clickedSegmentIndex: args.clickedSegmentIndex };
	if (
		args.segments.map(({ text }) => text).join("") !== sentence.stitchedText
	)
		throw new Error("The new Segments do not spell the Sentence.");
	assertSentenceUnits({ segments: args.segments, units: args.units });
	const rows = await loadStoredSegments(ctx, args.sentenceId);
	const same =
		rows.length === args.segments.length &&
		rows.every((row, index) => {
			const segment = args.segments[index];
			return (
				segment !== undefined &&
				row.index === index &&
				row.kind === segment.kind &&
				row.text === segment.text &&
				row.surface === segment.surface
			);
		});
	let clickedSegmentIndex = args.clickedSegmentIndex;
	if (!same) {
		const clicked = rows.find(
			(row) => row.index === args.clickedSegmentIndex,
		);
		if (!clicked) throw new Error("The clicked Segment does not exist.");
		if (
			rows.some(
				(row) =>
					row.attestationMembership !== undefined ||
					(row._id !== clicked._id &&
						row.resolutionState?.kind === "Active"),
			)
		)
			throw new Error(
				"Another click holds this Sentence's Segments; click it again.",
			);
		const offset = rows
			.filter((row) => row.index < clicked.index)
			.reduce((length, row) => length + row.text.length, 0);
		let start = 0;
		const placed = args.segments.map((segment, index) => {
			const at = { index, start, end: start + segment.text.length };
			start = at.end;
			return { ...at, segment };
		});
		clickedSegmentIndex =
			placed.find(
				({ segment, start: from, end }) =>
					segment.kind === "ResolvableText" &&
					from <= offset &&
					offset < end,
			)?.index ??
			placed.find(
				({ segment, start: from }) =>
					segment.kind === "ResolvableText" && from >= offset,
			)?.index ??
			-1;
		if (clickedSegmentIndex < 0)
			throw new Error("No new Segment sits where the click was.");
		const others = rows.filter((row) => row._id !== clicked._id);
		await removeEndedSegments(
			ctx,
			args.sentenceId,
			others.filter((row) => row.resolutionState !== undefined),
		);
		const spare = others.filter((row) => row.resolutionState === undefined);
		for (const { index, segment } of placed) {
			const fields = {
				index,
				kind: segment.kind,
				text: segment.text,
				surface: segment.surface,
			};
			const row = index === clickedSegmentIndex ? clicked : spare.shift();
			if (row) await ctx.db.patch(row._id, fields);
			else
				await ctx.db.insert("segments", {
					sentenceId: args.sentenceId,
					index,
					kind: segment.kind,
					text: segment.text,
					...(segment.surface === undefined
						? {}
						: { surface: segment.surface }),
				});
		}
		for (const row of spare) await ctx.db.delete(row._id);
		await ctx.db.patch(session._id, { clickedSegmentIndex });
	}
	await ctx.db.patch(args.sentenceId, {
		units: args.units,
		segmentationFailed: undefined,
	});
	return { clickedSegmentIndex };
}

/**
 * Removes the Segments ended clicks left their Resolution State on, each
 * with what hangs on it, in Analysis Stripping's order: the ended Resolution
 * Sessions, the Visitor Encounters, then the Segment. Such a click's card
 * finds no session, and its retry starts nothing. It reads the Sentence's
 * sessions the cleanup has not deleted yet, and one Encounter for each
 * Visitor who clicked such a Segment.
 */
async function removeEndedSegments(
	ctx: MutationCtx,
	sentenceId: Id<"sentences">,
	ended: ReadonlyArray<Doc<"segments">>,
): Promise<void> {
	if (ended.length === 0) return;
	const endedIds = new Set(ended.map(({ _id }) => _id));
	const sessions: Doc<"resolutionSessions">[] = [];
	for await (const session of ctx.db
		.query("resolutionSessions")
		.withIndex("by_sentence_id", (q) => q.eq("sentenceId", sentenceId)))
		if (endedIds.has(session.segmentId)) sessions.push(session);
	await deleteResolutionSessions(ctx, sessions);
	for (const { _id } of ended) {
		const encounters: Id<"visitorEncounters">[] = [];
		for await (const encounter of ctx.db
			.query("visitorEncounters")
			.withIndex("by_segment_id_and_attestation_id", (q) =>
				q.eq("segmentId", _id),
			))
			encounters.push(encounter._id);
		for (const encounterId of encounters) await ctx.db.delete(encounterId);
		await ctx.db.delete(_id);
	}
}
