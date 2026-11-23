import { assertIdentifier } from "../../server/identifiers";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { loadOccurrenceAttestation } from "./occurrenceAttestations";

export function assertIndex(value: number, name: string): void {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new Error(`${name} must be a non-negative safe integer.`);
	}
}

export function assertVisitorInput(visitorId: string, requestId: string): void {
	assertIdentifier(visitorId, "visitorId");
	assertIdentifier(requestId, "requestId");
}

export async function requireClickableSegment(
	ctx: MutationCtx | QueryCtx,
	sentenceId: Id<"sentences">,
	clickedSegmentIndex: number,
) {
	assertIndex(clickedSegmentIndex, "clickedSegmentIndex");
	const [sentence, segment] = await Promise.all([
		ctx.db.get(sentenceId),
		ctx.db
			.query("segments")
			.withIndex("by_sentence_id_and_index", (q) =>
				q.eq("sentenceId", sentenceId).eq("index", clickedSegmentIndex),
			)
			.unique(),
	]);
	if (!sentence) throw new Error("Sentence does not exist.");
	if (segment?.kind !== "ResolvableText") {
		throw new Error("Only a ResolvableText Segment can be clicked.");
	}
	return { sentence, segment };
}

export async function reconstructReusableAttestation(
	ctx: MutationCtx | QueryCtx,
	attestationId: Id<"attestations">,
) {
	const occurrence = await loadOccurrenceAttestation(ctx, attestationId);
	if (!occurrence) {
		throw new Error("Click refers to an invalid Attestation.");
	}
	return {
		sentenceId: occurrence.sentence._id,
		readingId: occurrence.reading._id,
		value: {
			attestationId,
			grammatical: {
				decision: "Resolved" as const,
				language: occurrence.encounter.sentence.language,
				encounter: occurrence.encounter,
				attestation: occurrence.publicAttestation,
			},
			reading: occurrence.publicReading,
		},
	};
}

export function assertMatchingRetry(
	click: {
		visitorId: string;
		segmentId: Id<"segments">;
	},
	args: {
		visitorId: string;
		segmentId: Id<"segments">;
	},
): void {
	if (
		click.visitorId !== args.visitorId ||
		click.segmentId !== args.segmentId
	) {
		throw new Error("requestId was already used for a different click.");
	}
}

export function projectSentenceForResolution(
	sentence: Doc<"sentences">,
	segments: readonly Doc<"segments">[],
	scroll: Doc<"scrolls"> | null,
) {
	return {
		sentenceId: sentence._id,
		scrollId: sentence.scrollId,
		language: sentence.language,
		stitchedText: sentence.stitchedText,
		segments: segments.map(({ index, kind, text, surface }) => ({
			index,
			kind,
			text,
			...(surface === undefined ? {} : { surface }),
		})),
		...(sentence.units ? { units: sentence.units } : {}),
		definitionText: scroll?.origin?.kind === "Definition",
		...(sentence.segmentationFailed
			? { segmentationFailed: true as const }
			: {}),
	};
}

/** The Sentences just before and after this one in its Scroll, as far as they exist. */
export async function loadNeighbourSentences(
	ctx: QueryCtx,
	sentence: Doc<"sentences">,
): Promise<{ before?: string; after?: string }> {
	const [before, after] = await Promise.all([
		ctx.db
			.query("sentences")
			.withIndex("by_scroll_id_and_position", (q) =>
				q
					.eq("scrollId", sentence.scrollId)
					.lt("position", sentence.position),
			)
			.order("desc")
			.first(),
		ctx.db
			.query("sentences")
			.withIndex("by_scroll_id_and_position", (q) =>
				q
					.eq("scrollId", sentence.scrollId)
					.gt("position", sentence.position),
			)
			.first(),
	]);
	return {
		...(before ? { before: before.stitchedText } : {}),
		...(after ? { after: after.stitchedText } : {}),
	};
}
