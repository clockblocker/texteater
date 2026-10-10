import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";
import {
	attestationSaysSomething,
	unitSaysSomething,
} from "../../shared/click-story";
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

type CanonicalResolution = Extract<
	SegmentSelectionResult,
	{ kind: "Available" }
>["canonical"];

/**
 * A click's Deck, front first: the Reading in front, then its Lemma and
 * Surface, and the Attestation at the back. Every path that builds the Deck
 * keeps this one order, and deals only the Cards whose step says something
 * about how the click led to the Reading (shared/click-story.ts).
 *
 * The Deck a running Resolution keeps up to date. Its Cards are only ever
 * added, each under the key it keeps, and once dealt a Card is never taken
 * back: the Reading step from the click, the Attestation step as soon as
 * the unit or Grammar shows it says something, then the stored Notes under
 * the same keys at commit, with the Lemma and Surface joining them when
 * they say something. A failed Session keeps its steps; the Reading step
 * shows the failure.
 */
export function resolutionDeckCards(
	note: ResolutionNote,
): readonly WorkspaceCardTarget[] {
	const { lifecycle } = note;
	if (lifecycle.state === "Terminal" && lifecycle.outcome === "Complete") {
		return completedCards(note, lifecycle);
	}
	return stepCards(
		note.target.requestId,
		knownUnitRoute(note),
		attestationKnownToSay(note),
	);
}

/**
 * Whether what the Session knows so far makes its Attestation say
 * something: its stored unit, or the members Grammar read. Every later
 * stage asks this too, so a step dealt early is still dealt at commit.
 */
function attestationKnownToSay(note: ResolutionNote): boolean {
	return (
		unitSaysSomething(note.unit?.segments) ||
		(note.grammar !== undefined &&
			attestationSaysSomething(note.grammar.members))
	);
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
 * The steps a running Resolution deals: the Reading, laid out by the unit's
 * route, and the Attestation once it says something, quoting the clicked
 * sentence as soon as the Session's first result arrives.
 */
function stepCards(
	requestId: string,
	unitRoute: UnitRoute | undefined,
	attestation: boolean,
): readonly WorkspaceCardTarget[] {
	return [
		readingStep(requestId, unitRoute),
		...(attestation
			? [
					{
						key: resolutionDeckCardKey(requestId, "Attestation"),
						target: {
							kind: "ResolutionStep" as const,
							requestId,
							stepKind: "Attestation" as const,
						},
					},
				]
			: []),
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
	const attestationDealt = attestationKnownToSay(note);
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
			...(attestationDealt
				? [
						canonicalCard(
							requestId,
							"Attestation",
							{
								kind: "Attestation",
								attestationId: completion.attestationId,
							},
							{
								clickedSegmentIndex:
									note.route.clickedSegmentIndex,
							},
						),
					]
				: []),
		];
	}
	return canonicalResolutionDeckCards(
		requestId,
		{
			...canonical,
			steps: {
				...canonical.steps,
				attestation: canonical.steps.attestation || attestationDealt,
			},
		},
		note.route.clickedSegmentIndex,
		{ resolutionRequestId: requestId },
	);
}

/**
 * The stored Notes of one occurrence whose steps say something, in the
 * Deck's order. A running Resolution deals the Reading, and the Attestation
 * when it says something, before commit; the Deck slots the Lemma and
 * Surface in at commit.
 */
function canonicalResolutionDeckCards(
	requestId: string,
	canonical: CanonicalResolution,
	/** The Segment the click landed on, which the Attestation's title emphasises. */
	clickedSegmentIndex: number,
	/** Set when the deck converges from a live Resolution, so the stored Reading Note can load behind the resolving one. */
	readingContext?: ReadingNotePresentationContext,
): readonly WorkspaceCardTarget[] {
	const { steps } = canonical;
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
	const attestation = canonicalCard(
		requestId,
		"Attestation",
		{ kind: "Attestation", attestationId: canonical.attestationId },
		{ clickedSegmentIndex },
	);
	return [
		reading,
		...(steps.lemma ? [lemma] : []),
		...(steps.surface ? [surface] : []),
		...(steps.attestation ? [attestation] : []),
	];
}

/**
 * The Deck a Segment Selection deals: a stored route's canonical Cards, or
 * the steps of the Session it started or joined: the Reading, and the
 * Attestation when the clicked unit is more than the clicked word.
 */
export function segmentSelectionDeckCards(
	requestId: string,
	result: SegmentSelectionResult,
	clickedSegmentIndex: number,
): readonly WorkspaceCardTarget[] {
	if (result.kind === "Available")
		return canonicalResolutionDeckCards(
			requestId,
			result.canonical,
			clickedSegmentIndex,
		);
	const unitRoute =
		result.unitRoute === "Unresolved" ? undefined : result.unitRoute;
	return stepCards(
		result.requestId,
		unitRoute,
		unitSaysSomething(result.unitSegments),
	);
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
