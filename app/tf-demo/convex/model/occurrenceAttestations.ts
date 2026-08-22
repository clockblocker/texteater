import { projectGrammaticalResolutionInput } from "dumgen/projection";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

const MAX_SEGMENTS_PER_SENTENCE = 512;

type ServerCtx = QueryCtx | MutationCtx;

type LemmaRecord = {
	language: "de" | "he";
	family: string;
	kind: string;
	canonicalForm: string;
	coreFeatures: unknown;
};

type SurfaceRecord = {
	language: "de" | "he";
	normalizedSurface: string;
	spelling: "Canonical" | "Variant";
	surfaceKind: "Citation" | "Inflection";
	surfaceFeatures: unknown;
	inflectionalFeatures?: unknown;
};

type ReadingRecord = { emojiDescription: string };

export function lemmaValue(lemma: LemmaRecord) {
	return {
		language: lemma.language,
		family: lemma.family,
		kind: lemma.kind,
		canonicalForm: lemma.canonicalForm,
		coreFeatures: lemma.coreFeatures,
	};
}

export function surfaceValue(surface: SurfaceRecord, lemma: LemmaRecord) {
	return {
		language: surface.language,
		normalizedSurface: surface.normalizedSurface,
		spelling: surface.spelling,
		surfaceKind: surface.surfaceKind,
		surfaceFeatures: surface.surfaceFeatures,
		...(surface.inflectionalFeatures === undefined
			? {}
			: { inflectionalFeatures: surface.inflectionalFeatures }),
		lemma: lemmaValue(lemma),
	};
}

export function readingValue(reading: ReadingRecord, lemma: LemmaRecord) {
	return {
		lemma: lemmaValue(lemma),
		emojiDescription: reading.emojiDescription,
	};
}

export async function loadCompleteOccurrenceMembers(
	ctx: ServerCtx,
	attestationId: Id<"attestations">,
): Promise<{
	readonly sentenceId: Id<"sentences">;
	readonly memberSegmentIndices: number[];
} | null> {
	const segments = await ctx.db
		.query("segments")
		.withIndex("by_attestation_id", (q) =>
			q.eq("attestationMembership.attestationId", attestationId),
		)
		.take(MAX_SEGMENTS_PER_SENTENCE + 1);
	if (segments.length === 0) return null;
	if (segments.length > MAX_SEGMENTS_PER_SENTENCE) {
		throw new Error("Occurrence Attestation has too many members.");
	}
	const sentenceId = segments[0]?.sentenceId;
	if (
		!sentenceId ||
		segments.some((segment) => segment.sentenceId !== sentenceId)
	) {
		return null;
	}
	return {
		sentenceId,
		memberSegmentIndices: segments
			.map(({ index }) => index)
			.sort((left, right) => left - right),
	};
}

/** Loads and validates every record needed to reconstruct one occurrence. */
export async function loadOccurrenceAttestation(
	ctx: ServerCtx,
	attestationId: Id<"attestations">,
) {
	const attestation = await ctx.db.get(attestationId);
	if (!attestation) return null;

	const [surface, reading, members] = await Promise.all([
		ctx.db.get(attestation.surfaceId),
		ctx.db.get(attestation.readingId),
		ctx.db
			.query("segments")
			.withIndex("by_attestation_id", (q) =>
				q.eq("attestationMembership.attestationId", attestationId),
			)
			.take(MAX_SEGMENTS_PER_SENTENCE + 1),
	]);
	if (!surface || !reading) return null;
	if (surface.lemmaId !== reading.lemmaId) {
		throw new Error(
			"Attestation Surface and Reading must share one Lemma.",
		);
	}
	const lemma = await ctx.db.get(surface.lemmaId);
	if (!lemma) return null;
	if (members.length === 0) {
		throw new Error(
			"An Attestation must have at least one member Segment.",
		);
	}
	if (members.length > MAX_SEGMENTS_PER_SENTENCE) {
		throw new Error(
			`An Attestation may contain at most ${MAX_SEGMENTS_PER_SENTENCE} member Segments.`,
		);
	}
	const orderedMembers = [...members].sort(
		(left, right) => left.index - right.index,
	);
	const sentenceId = orderedMembers[0]?.sentenceId;
	if (!sentenceId) return null;
	for (const member of orderedMembers) {
		if (
			member.sentenceId !== sentenceId ||
			member.kind !== "ResolvableText" ||
			member.attestationMembership?.attestationId !== attestationId
		) {
			throw new Error(
				"Attestation members must be ResolvableText Segments from one Sentence.",
			);
		}
	}
	const sentence = await ctx.db.get(sentenceId);
	if (!sentence) return null;
	const sentenceSegments = await ctx.db
		.query("segments")
		.withIndex("by_sentence_id_and_index", (q) =>
			q.eq("sentenceId", sentenceId),
		)
		.take(MAX_SEGMENTS_PER_SENTENCE + 1);
	if (sentenceSegments.length > MAX_SEGMENTS_PER_SENTENCE) {
		throw new Error(
			`A Sentence may contain at most ${MAX_SEGMENTS_PER_SENTENCE} Segments.`,
		);
	}
	const orderedSentenceSegments = [...sentenceSegments].sort(
		(left, right) => left.index - right.index,
	);
	const memberSegmentIndices = orderedMembers.map(({ index }) => index);
	const markedContext = projectGrammaticalResolutionInput({
		segments: orderedSentenceSegments.map(({ kind, text }) => ({
			kind,
			text,
		})),
		memberSegmentIndices: memberSegmentIndices as [number, ...number[]],
	}).markedContext;
	const publicAttestation = {
		members: orderedMembers.map((member) => ({
			attested: member.text,
			orthography: member.attestationMembership?.orthography as
				| "Standard"
				| "Typo",
		})),
		realizationCoverage: attestation.realizationCoverage,
		surface: surfaceValue(surface, lemma),
	};

	return {
		attestation,
		surface,
		reading,
		lemma,
		sentence,
		members: orderedMembers,
		segments: orderedSentenceSegments,
		memberSegmentIndices,
		markedContext,
		publicAttestation,
		publicReading: readingValue(reading, lemma),
	};
}
