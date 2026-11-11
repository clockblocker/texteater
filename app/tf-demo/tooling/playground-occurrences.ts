import { makeSurfaceId } from "dumdict/planning";
import type * as Dumling from "dumling/types";
import type { Id } from "../convex/_generated/dataModel";
import type { MutationCtx } from "../convex/_generated/server";
import { ensureVisitorEncounter } from "../convex/model/visitorEncounters";
import { persistSubmittedScroll } from "../convex/modules/scroll/submission";
import {
	type StoredUnit,
	unitsAroundOccurrence,
} from "../server/storedSegments";
import {
	NOTE_STUDY_VISITOR_ID,
	type NoteStudyDatabaseUnit,
} from "./notes-study/note-study-dummy-database";
import { evidenceOf } from "./playground-attestation-evidence";

/** The unit route a fixture Lemma's occurrence takes; a Morpheme has none. */
function unitRouteOf(lemma: Dumling.Lemma<"de">): StoredUnit["route"] {
	return lemma.family === "Morpheme"
		? "Unresolved"
		: ({
				language: "de",
				family: lemma.family,
				kind: lemma.kind,
			} as StoredUnit["route"]);
}

/**
 * Stores a fixture unit's occurrences: each Sentence in a Scroll of its
 * own, and its Attestation with each member's Segment as intake and a
 * commit would leave them. A `visible` occurrence is one the study's
 * Visitor has met, so it shows among the Reading's Source Contexts.
 */
export async function ensureOccurrence(
	ctx: MutationCtx,
	unit: NoteStudyDatabaseUnit,
	ids: {
		lemmaId: Id<"lemmas">;
		readingId: Id<"readings">;
		surfaceId: Id<"surfaces">;
	},
	visible: boolean,
) {
	for (const [occurrenceIndex, occurrence] of unit.occurrences.entries()) {
		const sourceText = occurrence.segments.map(({ text }) => text).join("");
		const existingSentence = await ctx.db
			.query("sentences")
			.withIndex("by_segmented_sentence_id", (q) =>
				q.eq("segmentedSentenceId", occurrence.segmentedSentenceId),
			)
			.unique();
		if (existingSentence?.heading) continue;
		const persisted = existingSentence
			? {
					scrollId: existingSentence.scrollId,
					sentenceIds: [existingSentence._id],
				}
			: await persistSubmittedScroll(ctx, {
					submissionKey: occurrence.submissionKey,
					sourceText,
					sentences: [
						{
							segmentedSentenceId: occurrence.segmentedSentenceId,
							position: 0,
							paragraph: 0,
							language: "de",
							stitchedText: sourceText,
							segments: [...occurrence.segments],
							units: unitsAroundOccurrence(
								occurrence.segments,
								occurrence.memberSegmentIndices,
								unitRouteOf(unit.reading.lemma),
							),
						},
					],
				});
		const sentenceId = persisted.sentenceIds[0];
		if (!sentenceId)
			throw new Error("Notes Study sentence was not persisted.");
		const memberSegments = await Promise.all(
			occurrence.memberSegmentIndices.map((index) =>
				ctx.db
					.query("segments")
					.withIndex("by_sentence_id_and_index", (q) =>
						q.eq("sentenceId", sentenceId).eq("index", index),
					)
					.unique(),
			),
		);
		if (memberSegments.some((segment) => !segment)) {
			throw new Error("Notes Study Attestation member is missing.");
		}
		let attestationId =
			memberSegments[0]?.attestationMembership?.attestationId;
		if (!attestationId) {
			/* an occurrence of an inflected form is attested by that form's
			   Surface, one of the unit's presentation Surfaces */
			const attested = await ctx.db
				.query("surfaces")
				.withIndex("by_surface_key", (q) =>
					q.eq(
						"surfaceKey",
						makeSurfaceId("de", occurrence.attestation.surface),
					),
				)
				.unique();
			const createdAttestationId = await ctx.db.insert("attestations", {
				surfaceId: attested?._id ?? ids.surfaceId,
				readingId: ids.readingId,
				realizationCoverage: occurrence.attestation.realizationCoverage,
				...evidenceOf(occurrence.attestation),
			});
			await Promise.all(
				memberSegments.flatMap((segment, memberIndex) => {
					const member = occurrence.attestation.members[memberIndex];
					if (!segment || !member) return [];
					const { attested: _spelling, ...membership } = member;
					return [
						ctx.db.patch(segment._id, {
							attestationMembership: {
								attestationId: createdAttestationId,
								...membership,
							},
						}),
					];
				}),
			);
			attestationId = createdAttestationId;
		}
		if (visible) {
			const clicked = memberSegments[0];
			if (!clicked) continue;
			await ensureVisitorEncounter(ctx, {
				requestId: `${occurrence.submissionKey}:encounter:${occurrenceIndex}`,
				visitorId: NOTE_STUDY_VISITOR_ID,
				scrollId: persisted.scrollId,
				sentenceId,
				segmentId: clicked._id,
				attestationId,
			});
		}
	}
}
