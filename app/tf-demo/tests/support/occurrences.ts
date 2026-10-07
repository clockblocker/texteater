import { jest } from "bun:test";
import { makeSurfaceId } from "dumdict";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
	lemmaIdentityKey,
	readingIdentityKey,
} from "../../server/linguisticIdentity";
import type { TestConvexDb } from "./convex";

/** The German `Bank` (🏦) the Resolution Session tests resolve `Banken` to. */
export const bankLemma = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem" },
} as const;
export const bankReading = {
	unitKind: "Reading",
	lemma: bankLemma,
	emojiDescription: "🏦",
} as const;
export const bankenSurface = {
	unitKind: "Surface",
	language: "de",
	normalizedSurface: "Banken",
	spelling: { kind: "Canonical" },
	surfaceFeatures: null,
	inflectionalFeatures: { case: "Nom", gender: null, number: "Plur" },
	lemma: bankLemma,
} as const;

export type SessionGuard = {
	requestId: string;
	runToken: string;
	segmentId: Id<"segments">;
};

export type Selection = {
	requestId: string;
	visitorId: string;
	sentenceId: Id<"sentences">;
	clickedSegmentIndex: number;
};

/**
 * Selects an unattested Segment, which starts its Resolution Session, and
 * returns the guard its run holds. It refuses to run on real timers: there
 * the scheduled run fires after the test ends and reaches whatever `fetch`
 * a later test file has installed (#1061).
 */
export async function startSession(
	t: TestConvexDb,
	selection: Selection,
	options: { readonly routeNoteRequested?: boolean } = {},
): Promise<SessionGuard> {
	if (!jest.isFakeTimers())
		throw new Error(
			"startSession needs jest.useFakeTimers(), or its scheduled run outlives the test.",
		);
	await t.mutation(api.resolutionSessions.selectSegment, {
		...selection,
		routeNoteRequested: options.routeNoteRequested ?? false,
	});
	return sessionGuard(t, selection.requestId);
}

/** The guard the session's current run holds. */
export async function sessionGuard(
	t: TestConvexDb,
	requestId: string,
): Promise<SessionGuard> {
	const session = await t.run((ctx) =>
		ctx.db
			.query("resolutionSessions")
			.withIndex("by_request_id", (q) => q.eq("requestId", requestId))
			.unique(),
	);
	if (!session) throw new Error(`No Resolution Session for ${requestId}.`);
	return {
		requestId,
		runToken: session.runToken,
		segmentId: session.segmentId,
	};
}

/** Commit input resolving one `Banken` Segment to the Bank Reading. */
export function bankOccurrenceCommit(
	selection: Selection,
	guard: SessionGuard,
	readingDecision: "New" | "Reuse" = "New",
) {
	return {
		...selection,
		sessionGuard: guard,
		reading: bankReading,
		readingKey: readingIdentityKey(bankReading),
		readingDecision,
		occurrence: {
			memberSegmentIndices: [selection.clickedSegmentIndex],
			attestation: {
				unitKind: "Attestation" as const,
				members: [
					{ attested: "Banken", orthography: "Standard" as const },
				],
				realizationCoverage: "Full" as const,
				articleEvidence: null,
				valencyEvidence: [],
				surface: bankenSurface,
			},
			surfaceKey: makeSurfaceId("de", bankenSurface),
			lemmaKey: lemmaIdentityKey(bankLemma),
		},
	};
}

/**
 * Resolves `Banken` through a real Resolution Session and Occurrence commit,
 * leaving a committed Attestation Membership on its Segment.
 */
export async function commitBankOccurrence(
	t: TestConvexDb,
	selection: Selection,
) {
	const guard = await startSession(t, selection);
	const result = await t.mutation(
		internal.persistence.persistResolvedClick,
		bankOccurrenceCommit(selection, guard),
	);
	if (result.status !== "Committed") {
		throw new Error(
			`Expected a committed occurrence, got ${result.status}.`,
		);
	}
	return result;
}

/**
 * Commit input resolving `die` and `Banken`, at the two given Segment
 * indices, to one Bank occurrence.
 */
export function dieBankenOccurrenceCommit(
	selection: Selection,
	guard: SessionGuard,
	memberSegmentIndices: readonly [article: number, noun: number],
) {
	const commit = bankOccurrenceCommit(selection, guard);
	return {
		...commit,
		occurrence: {
			...commit.occurrence,
			memberSegmentIndices: [...memberSegmentIndices],
			attestation: {
				...commit.occurrence.attestation,
				// The article is a member the noun owns, not a Surface feature (ADR 0040).
				articleEvidence: { kind: "Owned" as const, member: 0 },
				valencyEvidence: [],
				members: [
					{ attested: "die", orthography: "Standard" as const },
					{ attested: "Banken", orthography: "Standard" as const },
				],
			},
		},
	};
}

/** The Resolution Session row `requestId` names. */
export async function resolutionSessionRow(t: TestConvexDb, requestId: string) {
	const session = await t.run((ctx) =>
		ctx.db
			.query("resolutionSessions")
			.withIndex("by_request_id", (q) => q.eq("requestId", requestId))
			.unique(),
	);
	if (!session) throw new Error(`No Resolution Session for ${requestId}.`);
	return session;
}
