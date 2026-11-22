import { v } from "convex/values";
import { unitsByMember } from "../../../server/storedSegments";
import { coreGender } from "../../../shared/grammatical-gender";
import { isPlainSentence } from "../../../shared/supported-target-language";

import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { loadStoredSegments } from "../../model/storedSegments";
import {
	detectedLanguageValidator,
	storedSegmentValidator,
	storedUnitValidator,
} from "../../model/validators";
import { loadEncounteredSegmentIds } from "../../model/visitorEncounters";

export const grammaticalGenderValidator = v.union(
	v.literal("Fem"),
	v.literal("Masc"),
	v.literal("Neut"),
);

const presentedSegmentResolutionStateValidator = v.union(
	v.literal("Active"),
	v.literal("Unresolved"),
	v.literal("PermanentFailure"),
);

const sentenceSegmentViewValidator = storedSegmentValidator.extend({
	attestationId: v.optional(v.id("attestations")),
	encountered: v.boolean(),
	gender: v.optional(grammaticalGenderValidator),
	resolutionState: v.optional(presentedSegmentResolutionStateValidator),
	/**
	 * The biggest unit a ResolvableText Segment belongs to, as intake stored
	 * it: its members by index in this Sentence, route and variants. Absent
	 * for other Segments and once Analysis Stripping removed the units.
	 */
	unit: v.optional(storedUnitValidator),
});

export const sentenceViewValidator = v.object({
	sentenceId: v.id("sentences"),
	position: v.number(),
	paragraph: v.number(),
	/** The Detected Language, absent when undetermined. */
	language: v.optional(detectedLanguageValidator),
	/** A Plain Sentence: shown, with no Segments to click. */
	plain: v.optional(v.literal(true)),
	stitchedText: v.string(),
	heading: v.optional(v.string()),
	/** Intake could not segment the Sentence: its Segments have no units. */
	segmentationFailed: v.optional(v.literal(true)),
	segments: v.array(sentenceSegmentViewValidator),
});

/**
 * Several Sentences as a Visitor sees them in the reader, batching and
 * deduplicating Attestation -> Reading -> Lemma gender lookups across the
 * whole batch in three parallel waves.
 */
export async function projectSentenceViews(
	ctx: QueryCtx,
	sentences: readonly Doc<"sentences">[],
	visitorId: string,
) {
	if (sentences.length === 0) return [];
	const prepared = await Promise.all(
		sentences.map(async (sentence) => {
			// A Plain Sentence, unprocessed ones included, has no Segments to load
			// or encounter, so a long plain Scroll costs one read per Sentence.
			const plain = isPlainSentence(sentence.language);
			const [segments, encounteredSegmentIds] = plain
				? [[], new Set<Id<"segments">>()]
				: await Promise.all([
						loadStoredSegments(ctx, sentence._id),
						loadEncounteredSegmentIds(ctx, {
							visitorId,
							sentenceId: sentence._id,
						}),
					]);
			const encounteredAttestationIds = new Set<Id<"attestations">>();
			for (const segment of segments) {
				const attestationId =
					segment.attestationMembership?.attestationId;
				if (encounteredSegmentIds.has(segment._id) && attestationId) {
					encounteredAttestationIds.add(attestationId);
				}
			}
			return {
				sentence,
				plain,
				segments,
				encounteredSegmentIds,
				encounteredAttestationIds,
			};
		}),
	);

	const uniqueAttestationIds = [
		...new Set(
			prepared.flatMap(({ encounteredAttestationIds }) => [
				...encounteredAttestationIds,
			]),
		),
	];
	const attestationsById = new Map(
		await Promise.all(
			uniqueAttestationIds.map(
				async (id) => [id, await ctx.db.get(id)] as const,
			),
		),
	);

	const uniqueReadingIds = [
		...new Set(
			[...attestationsById.values()].flatMap((attestation) =>
				attestation ? [attestation.readingId] : [],
			),
		),
	];
	const readingsById = new Map(
		await Promise.all(
			uniqueReadingIds.map(
				async (id) => [id, await ctx.db.get(id)] as const,
			),
		),
	);

	const uniqueLemmaIds = [
		...new Set(
			[...readingsById.values()].flatMap((reading) =>
				reading ? [reading.lemmaId] : [],
			),
		),
	];
	const lemmasById = new Map(
		await Promise.all(
			uniqueLemmaIds.map(
				async (id) => [id, await ctx.db.get(id)] as const,
			),
		),
	);

	const genders = new Map(
		uniqueAttestationIds.map((id) => {
			const attestation = attestationsById.get(id);
			const reading = attestation
				? readingsById.get(attestation.readingId)
				: null;
			const lemma = reading ? lemmasById.get(reading.lemmaId) : null;
			return [id, lemma ? coreGender(lemma) : undefined] as const;
		}),
	);

	return prepared.map(
		({
			sentence,
			plain,
			segments,
			encounteredSegmentIds,
			encounteredAttestationIds,
		}) => {
			const unitOf = unitsByMember(sentence.units);
			return {
				sentenceId: sentence._id,
				position: sentence.position,
				paragraph: sentence.paragraph,
				...(sentence.language === undefined
					? {}
					: { language: sentence.language }),
				...(plain ? { plain: true as const } : {}),
				stitchedText: sentence.stitchedText,
				...(sentence.heading ? { heading: sentence.heading } : {}),
				...(sentence.segmentationFailed
					? { segmentationFailed: true as const }
					: {}),
				segments: segments.map((segment) => {
					const attestationId =
						segment.attestationMembership?.attestationId;
					const unit = unitOf.get(segment.index);
					const encountered = Boolean(
						encounteredSegmentIds.has(segment._id) ||
							(attestationId &&
								encounteredAttestationIds.has(attestationId)),
					);
					const gender = attestationId
						? genders.get(attestationId)
						: undefined;
					return {
						index: segment.index,
						kind: segment.kind,
						text: segment.text,
						...(segment.surface === undefined
							? {}
							: { surface: segment.surface }),
						...(attestationId ? { attestationId } : {}),
						encountered,
						...(gender ? { gender } : {}),
						...(encountered && segment.resolutionState
							? { resolutionState: segment.resolutionState.kind }
							: {}),
						...(unit ? { unit } : {}),
					};
				}),
			};
		},
	);
}

/**
 * One Sentence as a Visitor sees it in the reader: every Segment, the
 * biggest unit and the occurrence it belongs to, and the resolution state
 * this Visitor has earned by encountering it. An occurrence counts as
 * encountered when any of its members was. Every member of a unit carries
 * the whole unit, so a reader groups them without another query.
 */
export async function projectSentenceView(
	ctx: QueryCtx,
	sentence: Doc<"sentences">,
	visitorId: string,
) {
	const [view] = await projectSentenceViews(ctx, [sentence], visitorId);
	if (!view) throw new Error("Expected a projected Sentence view.");
	return view;
}
