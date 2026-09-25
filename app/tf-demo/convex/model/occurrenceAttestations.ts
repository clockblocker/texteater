import {
	parseGermanAttestation,
	parseGermanReading,
} from "../../server/operationalParsing";
import {
	encounterSentenceOf,
	MAX_SEGMENTS_PER_SENTENCE,
} from "../../server/storedSegments";

import {
	germanGovernorKinds,
	germanVerbalKinds,
} from "../../shared/german-evidence-kinds";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { loadStoredSegments } from "./storedSegments";

type ServerCtx = QueryCtx | MutationCtx;

type LemmaRecord = {
	language: "de" | "en" | "he";
	family: string;
	kind: string;
	canonicalForm: string;
	coreFeatures: unknown;
};

type SurfaceRecord = {
	language: "de" | "en" | "he";
	normalizedSurface: string;
	spelling: "Canonical" | "Variant";
	surfaceFeatures: unknown;
	inflectionalFeatures?: unknown;
};

type ReadingRecord = { emojiDescription: string };

export function lemmaValue(lemma: LemmaRecord) {
	return {
		unitKind: "Lemma" as const,
		language: lemma.language,
		family: lemma.family,
		kind: lemma.kind,
		canonicalForm: lemma.canonicalForm,
		coreFeatures: lemma.coreFeatures,
	};
}

export function surfaceValue(surface: SurfaceRecord, lemma: LemmaRecord) {
	const bag = surface.inflectionalFeatures;
	const inflectionalFeatures =
		lemma.language === "de" &&
		germanVerbalKinds.includes(lemma.kind) &&
		bag &&
		typeof bag === "object"
			? { expletive: null, ...bag }
			: bag;
	return {
		unitKind: "Surface" as const,
		language: surface.language,
		normalizedSurface: surface.normalizedSurface,
		spelling: surface.spelling,
		surfaceFeatures: surface.surfaceFeatures,
		...(surface.inflectionalFeatures === undefined
			? {}
			: { inflectionalFeatures }),
		lemma: lemmaValue(lemma),
	};
}

export function readingValue(reading: ReadingRecord, lemma: LemmaRecord) {
	return {
		unitKind: "Reading" as const,
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
	readonly memberTexts: string[];
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
	const orderedSegments = [...segments].sort(
		(left, right) => left.index - right.index,
	);
	return {
		sentenceId,
		memberSegmentIndices: orderedSegments.map(({ index }) => index),
		memberTexts: orderedSegments.map(({ text }) => text),
	};
}

/**
 * Loads and validates every record needed to reconstruct one occurrence.
 * Keep this aggregate inferred until callers converge on a stable subset that
 * earns an explicit `ResolvedOccurrenceFor` interface.
 */
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
	if (sentence.language !== "de")
		throw new Error("Only German occurrences are supported.");
	const sentenceSegments = await loadStoredSegments(ctx, sentenceId);
	const orderedSentenceSegments = [...sentenceSegments].sort(
		(left, right) => left.index - right.index,
	);
	const memberSegmentIndices = orderedMembers.map(({ index }) => index);
	const sentenceValue = encounterSentenceOf({
		segmentedSentenceId: sentence.segmentedSentenceId,
		segments: orderedSentenceSegments,
	});
	const encounter = {
		sentence: {
			...sentenceValue,
			segments: sentenceValue.segments.map(({ kind, text }) => ({
				kind,
				text,
			})),
		},
		target: {
			family: lemma.family,
			kind: lemma.kind,
			memberSegmentIndices,
		},
	};
	const publicAttestation = {
		unitKind: "Attestation" as const,
		members: orderedMembers.map(attestationMemberOf),
		realizationCoverage: attestation.realizationCoverage,
		...(lemma.language === "de" && germanVerbalKinds.includes(lemma.kind)
			? { expletiveEvidence: attestation.expletiveEvidence ?? null }
			: {}),
		...(lemma.language === "de" && germanGovernorKinds.includes(lemma.kind)
			? { valencyEvidence: attestation.valencyEvidence ?? [] }
			: {}),
		...(lemma.language === "de" && lemma.kind === "ADP"
			? { valencyEvidence: attestation.valencyEvidence ?? [] }
			: {}),
		...(attestation.articleEvidence === undefined
			? {}
			: { articleEvidence: attestation.articleEvidence }),
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
		encounter,
		publicAttestation: parseGermanAttestation(publicAttestation),
		publicReading: parseGermanReading(readingValue(reading, lemma)),
	};
}

/**
 * The Attestation member a member Segment realizes, attested as its own
 * letters. A `Fused` member also names its Fusion and component (ADR 0035).
 */
function attestationMemberOf(segment: Doc<"segments">) {
	const membership = segment.attestationMembership;
	if (!membership)
		throw new Error("An Attestation member Segment has no membership.");
	if (membership.orthography !== "Fused")
		return { attested: segment.text, orthography: membership.orthography };
	const { fusion, component } = membership;
	if (!fusion || component === undefined)
		throw new Error("A Fused member stores its Fusion and component.");
	return {
		attested: segment.text,
		orthography: membership.orthography,
		fusion,
		component,
	};
}
