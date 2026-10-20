import type * as Dumling from "dumling/types";
import type { Id } from "../../convex/_generated/dataModel";
import {
	foldedCanonicalForm,
	lemmaIdentityKey,
	readingIdentityKey,
} from "../../server/linguisticIdentity";
import type { TestConvexDb } from "./convex";

/* Reading, occurrence and Encounter fixtures the presentation test files share. */

export type ReadingValue = Dumling.Reading<"de", "Lexeme">;

export const bankLemma = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem" },
} as const;

export const anrufenLemma = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "VERB",
	canonicalForm: "anrufen",
	coreFeatures: {
		hasSepPrefix: "an",
		lexicallyReflexive: null,
	},
} as const;

/** A German ADP Lemma, which has no Core Features. */
export function germanAdposition(canonicalForm: string) {
	return {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "ADP",
		canonicalForm,
		coreFeatures: {},
	} as const;
}

/** Stores a Lemma, one Surface of it, and one Reading, keyed as production keys them. */
export async function insertReading(t: TestConvexDb, reading: ReadingValue) {
	const { lemma, emojiDescription } = reading;
	const readingKey = readingIdentityKey(reading);
	return t.run(async (ctx) => {
		const lemmaId = await ctx.db.insert("lemmas", {
			lemmaKey: lemmaIdentityKey(lemma),
			language: lemma.language,
			family: lemma.family,
			kind: lemma.kind,
			canonicalForm: lemma.canonicalForm,
			foldedCanonicalForm: foldedCanonicalForm(lemma),
			coreFeatures: lemma.coreFeatures,
		});
		const readingId = await ctx.db.insert("readings", {
			readingKey,
			lemmaId,
			emojiDescription,
		});
		const surfaceId = await ctx.db.insert("surfaces", {
			surfaceKey: `surface:${readingKey}`,
			lemmaId,
			language: lemma.language,
			normalizedSurface: lemma.canonicalForm,
			spelling: { kind: "Canonical" },
			surfaceFeatures: {},
		});
		return { lemmaId, readingId, readingKey, surfaceId };
	});
}

/** Commits one occurrence: an Attestation owning the given member Segments. */
export function attest(
	t: TestConvexDb,
	owner: {
		readonly readingId: Id<"readings">;
		readonly surfaceId: Id<"surfaces">;
	},
	memberSegmentIds: readonly (Id<"segments"> | undefined)[],
) {
	return t.run(async (ctx) => {
		const attestationId = await ctx.db.insert("attestations", {
			surfaceId: owner.surfaceId,
			readingId: owner.readingId,
			realizationCoverage: "Full",
		});
		for (const segmentId of memberSegmentIds) {
			if (!segmentId) throw new Error("Expected a member Segment.");
			await ctx.db.patch(segmentId, {
				attestationMembership: {
					attestationId,
					orthography: "Standard",
				},
			});
		}
		return attestationId;
	});
}

/**
 * Records that a Visitor clicked one Segment. Like Segment Selection, the
 * Encounter of an attested Segment carries its occurrence and Reading.
 */
export function encounter(
	t: TestConvexDb,
	visitorId: string,
	segmentId: Id<"segments"> | undefined,
) {
	if (!segmentId) throw new Error("Expected an encountered Segment.");
	return t.run(async (ctx) => {
		const segment = await ctx.db.get(segmentId);
		const sentence = segment ? await ctx.db.get(segment.sentenceId) : null;
		if (!segment || !sentence)
			throw new Error("Expected a stored Sentence.");
		const attestationId = segment.attestationMembership?.attestationId;
		const attestation = attestationId
			? await ctx.db.get(attestationId)
			: null;
		return ctx.db.insert("visitorEncounters", {
			requestId: `click:${visitorId}:${segmentId}`,
			visitorId,
			scrollId: sentence.scrollId,
			sentenceId: sentence._id,
			segmentId,
			...(attestation
				? {
						attestationId: attestation._id,
						readingId: attestation.readingId,
					}
				: {}),
			encounteredAt: 1,
		});
	});
}
