import type { Id } from "../../convex/_generated/dataModel";
import type { ResolutionNote } from "../../convex/model/resolutionSessions";
import type {
	ReadingNotePresentationContext,
	ResolutionStepKind,
	WorkspaceTarget,
} from "../workspace/sheet-workspace";
import type { WorkspaceCardTarget } from "../workspace/workspace-controller";

export type CanonicalResolution = {
	readonly readingId: Id<"readings">;
	readonly lemmaId: Id<"lemmas">;
	readonly surfaceLanguage: "de";
	readonly normalizedSurface: string;
	/** The analysis selected by this occurrence, not the aggregate Surface identity. */
	readonly surfaceId: Id<"surfaces">;
	readonly attestationId: Id<"attestations">;
};

const progressPosition = {
	Starting: 0,
	RouteAvailable: 1,
	GrammarAvailable: 2,
	ReadingAvailable: 3,
	Committing: 4,
} as const;

export function resolutionDeckCards(
	note: ResolutionNote,
): readonly WorkspaceCardTarget[] {
	if (note.terminal?.kind === "Complete") {
		return completedCards(note, note.terminal);
	}
	const steps = availableStepCards(note);
	if (note.activity === "Terminal" || steps.length === 0) {
		return [resolutionCard(note.target.requestId), ...steps];
	}
	return steps;
}

export function resolutionDeckCardKey(
	requestId: string,
	role: ResolutionStepKind | "Resolver",
): string {
	return `${requestId}:${role}`;
}

function availableStepCards(
	note: ResolutionNote,
): readonly WorkspaceCardTarget[] {
	const requestId = note.target.requestId;
	// A resolved Lemma always yields a Reading, so its Card opens with Grammar
	// and fills in as the emoji and Knowledge arrive. A failed Session keeps
	// its Grammar steps but not a Reading that will never finish loading.
	const failed =
		note.activity === "Terminal" && note.terminal?.kind !== "Complete";
	return [
		...(note.grammar && !failed ? [stepCard(requestId, "Reading")] : []),
		...(note.grammar
			? [stepCard(requestId, "Lemma"), stepCard(requestId, "Surface")]
			: []),
		...(progressPosition[note.progress] >= progressPosition.RouteAvailable
			? [stepCard(requestId, "Attestation")]
			: []),
	];
}

function completedCards(
	note: ResolutionNote,
	terminal: Extract<
		NonNullable<ResolutionNote["terminal"]>,
		{ readonly kind: "Complete" }
	>,
): readonly WorkspaceCardTarget[] {
	const { canonical } = terminal;
	if (!canonical) {
		const role =
			terminal.target.kind === "Reading" ? "Reading" : "Attestation";
		const finalCard = canonicalCard(
			note.target.requestId,
			role,
			terminal.target,
		);
		const steps = availableStepCards(note);
		return steps.some(({ key }) => key === finalCard.key)
			? steps.map((card) =>
					card.key === finalCard.key ? finalCard : card,
				)
			: [finalCard, ...steps];
	}
	return canonicalResolutionDeckCards(
		note.target.requestId,
		terminal.target,
		canonical,
		{ resolutionRequestId: note.target.requestId },
	);
}

export function canonicalResolutionDeckCards(
	requestId: string,
	foregroundTarget: WorkspaceTarget,
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
	return foregroundTarget.kind === "Reading"
		? [reading, lemma, surface, attestation]
		: [attestation, reading, lemma, surface];
}

function resolutionCard(requestId: string): WorkspaceCardTarget {
	return {
		key: resolutionDeckCardKey(requestId, "Resolver"),
		target: { kind: "Resolution", requestId },
	};
}

function stepCard(
	requestId: string,
	stepKind: ResolutionStepKind,
): WorkspaceCardTarget {
	return {
		key: resolutionDeckCardKey(requestId, stepKind),
		target: { kind: "ResolutionStep", requestId, stepKind },
	};
}

function canonicalCard(
	requestId: string,
	role: ResolutionStepKind,
	target: WorkspaceTarget,
	presentationContext?: WorkspaceCardTarget["presentationContext"],
): WorkspaceCardTarget {
	return {
		key: resolutionDeckCardKey(requestId, role),
		target,
		...(presentationContext ? { presentationContext } : {}),
	};
}
