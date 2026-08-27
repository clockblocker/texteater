import type { ResolutionNote } from "../../convex/model/resolutionSessions";
import type {
	ResolutionStepKind,
	WorkspaceTarget,
} from "../workspace/sheet-workspace";
import type { WorkspaceCardTarget } from "../workspace/workspace-controller";

export type CanonicalResolution = {
	readonly readingId: string;
	readonly lemmaId: string;
	readonly surfaceId: string;
	readonly attestationId: string;
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
	return [
		...(note.reading ? [stepCard(requestId, "Reading")] : []),
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
			terminal.target.kind === "UnitReadingNote"
				? "Reading"
				: "Attestation";
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
	);
}

export function canonicalResolutionDeckCards(
	requestId: string,
	foregroundTarget: WorkspaceTarget,
	canonical: CanonicalResolution,
): readonly WorkspaceCardTarget[] {
	const reading = canonicalCard(requestId, "Reading", {
		kind: "UnitReadingNote",
		readingId: canonical.readingId,
	});
	const lemma = canonicalCard(requestId, "Lemma", {
		kind: "RouteNote",
		routeKind: "Lemma",
		id: canonical.lemmaId,
	});
	const surface = canonicalCard(requestId, "Surface", {
		kind: "RouteNote",
		routeKind: "Surface",
		id: canonical.surfaceId,
	});
	const attestation = canonicalCard(requestId, "Attestation", {
		kind: "RouteNote",
		routeKind: "Attestation",
		id: canonical.attestationId,
	});
	return foregroundTarget.kind === "UnitReadingNote"
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
): WorkspaceCardTarget {
	return { key: resolutionDeckCardKey(requestId, role), target };
}
