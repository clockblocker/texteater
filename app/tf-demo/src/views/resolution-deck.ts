import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { WorkspaceCardTarget } from "../workspace/workspace-controller";
import type {
	ReadingNotePresentationContext,
	ResolutionStepKind,
	UnitRoute,
	WorkspaceTarget,
} from "../workspace/workspace-subject";

export type ResolutionNote = NonNullable<
	FunctionReturnType<typeof api.resolutionSessions.getResolutionNote>
>;
type ResolutionNoteLifecycle = ResolutionNote["lifecycle"];
type SegmentSelectionResult = FunctionReturnType<
	typeof api.resolutionSessions.selectSegment
>;

type CanonicalResolution = {
	readonly readingId: Id<"readings">;
	readonly lemmaId: Id<"lemmas">;
	readonly surfaceLanguage: "de";
	readonly normalizedSurface: string;
	/** The analysis selected by this occurrence, not the aggregate Surface identity. */
	readonly surfaceId: Id<"surfaces">;
	readonly attestationId: Id<"attestations">;
};

/**
 * A click's Deck, front first: the Reading in front, then its Lemma and
 * Surface, and the Attestation at the back. Every path that builds the Deck
 * keeps this one order.
 *
 * The Deck a running Resolution keeps up to date. Its Cards are only ever
 * added, each under the key it keeps: the Reading and Attestation steps from
 * the click until commit, then the stored Notes under the same keys, with
 * the Lemma and Surface joining them. A failed Session keeps both steps; the
 * Reading step shows the failure.
 */
export function resolutionDeckCards(
	note: ResolutionNote,
): readonly WorkspaceCardTarget[] {
	const { lifecycle } = note;
	if (lifecycle.state === "Terminal" && lifecycle.outcome === "Complete") {
		return completedCards(note, lifecycle);
	}
	return stepCards(note.target.requestId, knownUnitRoute(note));
}

/** The unit's stored route, when intake gave it one. */
export function knownUnitRoute(note: ResolutionNote): UnitRoute | undefined {
	const route = note.unit?.route;
	return route === undefined || route === "Unresolved" ? undefined : route;
}

function resolutionDeckCardKey(
	requestId: string,
	role: ResolutionStepKind | "Lemma" | "Surface",
): string {
	return `${requestId}:${role}`;
}

/**
 * Both steps a click deals at once: the Reading is laid out by the unit's
 * route, and the Attestation quotes the clicked sentence as soon as the
 * Session's first result arrives.
 */
function stepCards(
	requestId: string,
	unitRoute: UnitRoute | undefined,
): readonly WorkspaceCardTarget[] {
	return [
		readingStep(requestId, unitRoute),
		{
			key: resolutionDeckCardKey(requestId, "Attestation"),
			target: {
				kind: "ResolutionStep",
				requestId,
				stepKind: "Attestation",
			},
		},
	];
}

function readingStep(
	requestId: string,
	unitRoute: UnitRoute | undefined,
): WorkspaceCardTarget {
	return {
		key: resolutionDeckCardKey(requestId, "Reading"),
		target: { kind: "ResolutionStep", requestId, stepKind: "Reading" },
		...(unitRoute ? { presentationContext: { unitRoute } } : {}),
	};
}

function completedCards(
	note: ResolutionNote,
	completion: Extract<ResolutionNoteLifecycle, { outcome: "Complete" }>,
): readonly WorkspaceCardTarget[] {
	const requestId = note.target.requestId;
	const { canonical } = completion;
	if (!canonical) {
		// Without the whole occurrence, only its Reading and Attestation are
		// known.
		return [
			canonicalCard(
				requestId,
				"Reading",
				{ kind: "Reading", readingId: completion.readingId },
				{ resolutionRequestId: requestId },
			),
			canonicalCard(requestId, "Attestation", {
				kind: "Attestation",
				attestationId: completion.attestationId,
			}),
		];
	}
	return canonicalResolutionDeckCards(requestId, canonical, {
		resolutionRequestId: requestId,
	});
}

/**
 * The four stored Notes of one occurrence, in the Deck's order. A running
 * Resolution deals the Reading and Attestation at the click, and the Deck
 * slots the Lemma and Surface between them at commit.
 */
function canonicalResolutionDeckCards(
	requestId: string,
	canonical: CanonicalResolution,
	/** Set when the deck converges from a live Resolution, so the stored Reading Note can load behind the resolving one. */
	readingContext?: ReadingNotePresentationContext,
): readonly WorkspaceCardTarget[] {
	const reading = canonicalCard(
		requestId,
		"Reading",
		{
			kind: "Reading",
			readingId: canonical.readingId,
		},
		readingContext,
	);
	const lemma = canonicalCard(requestId, "Lemma", {
		kind: "Lemma",
		lemmaId: canonical.lemmaId,
	});
	const surface = canonicalCard(
		requestId,
		"Surface",
		{
			kind: "Surface",
			language: canonical.surfaceLanguage,
			normalizedSurface: canonical.normalizedSurface,
		},
		{ activeAnalysisKey: canonical.surfaceId },
	);
	const attestation = canonicalCard(requestId, "Attestation", {
		kind: "Attestation",
		attestationId: canonical.attestationId,
	});
	return [reading, lemma, surface, attestation];
}

/**
 * The Deck a Segment Selection deals: a stored route's canonical Cards, or
 * the Reading and Attestation steps of the Session it started or joined.
 */
export function segmentSelectionDeckCards(
	requestId: string,
	result: SegmentSelectionResult,
): readonly WorkspaceCardTarget[] {
	if (result.kind === "Available")
		return canonicalResolutionDeckCards(requestId, result.canonical);
	const unitRoute =
		result.unitRoute === "Unresolved" ? undefined : result.unitRoute;
	return stepCards(result.requestId, unitRoute);
}

function canonicalCard(
	requestId: string,
	role: ResolutionStepKind | "Lemma" | "Surface",
	target: WorkspaceTarget,
	presentationContext?: WorkspaceCardTarget["presentationContext"],
): WorkspaceCardTarget {
	return {
		key: resolutionDeckCardKey(requestId, role),
		target,
		...(presentationContext ? { presentationContext } : {}),
	};
}
