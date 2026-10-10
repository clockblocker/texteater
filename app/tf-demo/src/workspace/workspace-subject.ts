/**
 * tf-demo's workspace Subjects: a Text, with the occurrence Go to source
 * lands on and its title, or a Note with the Presentation context that
 * opened it. Their keys, and the guard Workspace Persistence reads them
 * back through.
 */
import { isRecord } from "common-utils";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type {
	AttestationNoteTarget,
	LemmaNoteTarget,
	ReadingNoteTarget,
	ShadowNoteTarget,
	SurfaceNoteTarget,
	TextTarget,
} from "../../shared/navigation";

/**
 * The Cards a running Resolution deals before it commits; its Lemma and
 * Surface are dealt at commit, as stored Notes.
 */
export type ResolutionStepKind = "Reading" | "Attestation";

export type ResolutionStepTarget = {
	readonly kind: "ResolutionStep";
	readonly requestId: string;
	readonly stepKind: ResolutionStepKind;
};

type WorkspaceNoteTarget =
	| ReadingNoteTarget
	| LemmaNoteTarget
	| SurfaceNoteTarget
	| AttestationNoteTarget
	| ShadowNoteTarget
	| ResolutionStepTarget;

export type WorkspaceTarget = TextTarget | WorkspaceNoteTarget;

type SurfaceNotePresentationContext = {
	/** Selects one of the aggregate Surface Note's analyses for this Presentation. */
	readonly activeAnalysisKey: Id<"surfaces">;
};

export type AttestationNotePresentationContext = {
	/**
	 * The Segment the click that dealt this Attestation landed on, so its
	 * title emphasises that piece of the unit.
	 */
	readonly clickedSegmentIndex: number;
};

export type LemmaNotePresentationContext = {
	/** The Reading the click that dealt this Lemma resolved to, which its caption marks. */
	readonly activeReadingId: Id<"readings">;
};

export type ReadingNotePresentationContext = {
	/**
	 * The Resolution this Reading was just committed from. While the stored
	 * Note loads, its Presentation keeps showing the resolving Note instead of
	 * a skeleton.
	 */
	readonly resolutionRequestId: string;
};

type SegmentSelectionResult = FunctionReturnType<
	typeof api.resolutionSessions.selectSegment
>;

/** The route intake stored for a clicked unit, when it stored one. */
export type UnitRoute = Exclude<
	NonNullable<
		Extract<SegmentSelectionResult, { kind: "Resolving" }>["unitRoute"]
	>,
	"Unresolved"
>;

export type ResolutionStepPresentationContext = {
	/**
	 * The clicked unit's route, which lays the Reading step out before the
	 * Session's first result arrives.
	 */
	readonly unitRoute: UnitRoute;
};

export type NotePresentationContext =
	| SurfaceNotePresentationContext
	| AttestationNotePresentationContext
	| LemmaNotePresentationContext
	| ReadingNotePresentationContext
	| ResolutionStepPresentationContext;

type ContextualSurfaceNoteSubject = {
	readonly kind: "Note";
	readonly target: SurfaceNoteTarget;
	readonly presentationContext?: SurfaceNotePresentationContext;
};

type ContextualAttestationNoteSubject = {
	readonly kind: "Note";
	readonly target: AttestationNoteTarget;
	readonly presentationContext?: AttestationNotePresentationContext;
};

type ContextualLemmaNoteSubject = {
	readonly kind: "Note";
	readonly target: LemmaNoteTarget;
	readonly presentationContext?: LemmaNotePresentationContext;
};

type ContextualReadingNoteSubject = {
	readonly kind: "Note";
	readonly target: ReadingNoteTarget;
	readonly presentationContext?: ReadingNotePresentationContext;
};

type ContextualResolutionStepSubject = {
	readonly kind: "Note";
	readonly target: ResolutionStepTarget;
	readonly presentationContext?: ResolutionStepPresentationContext;
};

type ContextFreeNoteSubject = {
	readonly kind: "Note";
	readonly target: Exclude<
		WorkspaceNoteTarget,
		| SurfaceNoteTarget
		| AttestationNoteTarget
		| LemmaNoteTarget
		| ReadingNoteTarget
		| ResolutionStepTarget
	>;
	readonly presentationContext?: never;
};

/**
 * A Text as a workspace Subject: which Text, what the Library called it, and
 * for a Cover pushed by Go to source, the occurrence it lands on.
 */
export type TextSubjectTarget = TextTarget;

export type WorkspaceSubject =
	| { readonly kind: "Text"; readonly target: TextSubjectTarget }
	| ContextualSurfaceNoteSubject
	| ContextualAttestationNoteSubject
	| ContextualLemmaNoteSubject
	| ContextualReadingNoteSubject
	| ContextualResolutionStepSubject
	| ContextFreeNoteSubject;

export function workspaceSubjectFor(
	target: SurfaceNoteTarget,
	presentationContext?: SurfaceNotePresentationContext,
): ContextualSurfaceNoteSubject;
export function workspaceSubjectFor(
	target: AttestationNoteTarget,
	presentationContext?: AttestationNotePresentationContext,
): ContextualAttestationNoteSubject;
export function workspaceSubjectFor(
	target: LemmaNoteTarget,
	presentationContext?: LemmaNotePresentationContext,
): ContextualLemmaNoteSubject;
export function workspaceSubjectFor(
	target: ReadingNoteTarget,
	presentationContext?: ReadingNotePresentationContext,
): ContextualReadingNoteSubject;
export function workspaceSubjectFor(
	target: ResolutionStepTarget,
	presentationContext?: ResolutionStepPresentationContext,
): ContextualResolutionStepSubject;
export function workspaceSubjectFor(
	target: Exclude<
		WorkspaceTarget,
		| SurfaceNoteTarget
		| AttestationNoteTarget
		| LemmaNoteTarget
		| ReadingNoteTarget
		| ResolutionStepTarget
	>,
): Exclude<
	WorkspaceSubject,
	| ContextualSurfaceNoteSubject
	| ContextualAttestationNoteSubject
	| ContextualLemmaNoteSubject
	| ContextualReadingNoteSubject
	| ContextualResolutionStepSubject
>;
export function workspaceSubjectFor(
	target: WorkspaceTarget,
	presentationContext?: NotePresentationContext,
): WorkspaceSubject;
export function workspaceSubjectFor(
	target: WorkspaceTarget,
	presentationContext?: NotePresentationContext,
): WorkspaceSubject {
	if (target.kind === "Text") return { kind: "Text", target };
	if (
		target.kind === "Surface" &&
		presentationContext &&
		"activeAnalysisKey" in presentationContext
	)
		return { kind: "Note", target, presentationContext };
	if (
		target.kind === "Attestation" &&
		presentationContext &&
		"clickedSegmentIndex" in presentationContext
	)
		return { kind: "Note", target, presentationContext };
	if (
		target.kind === "Lemma" &&
		presentationContext &&
		"activeReadingId" in presentationContext
	)
		return { kind: "Note", target, presentationContext };
	if (
		target.kind === "Reading" &&
		presentationContext &&
		"resolutionRequestId" in presentationContext
	)
		return { kind: "Note", target, presentationContext };
	if (
		target.kind === "ResolutionStep" &&
		presentationContext &&
		"unitRoute" in presentationContext
	)
		return { kind: "Note", target, presentationContext };
	return { kind: "Note", target } as WorkspaceSubject;
}

export function workspaceSubjectKey(subject: WorkspaceSubject): string {
	const { target } = subject;
	switch (target.kind) {
		case "Text":
			return `Text:${target.textId}`;
		case "Reading":
			return `Reading:${target.readingId}`;
		case "Lemma":
			return `Lemma:${target.lemmaId}`;
		case "Surface":
			return `Surface:${target.language}:${target.normalizedSurface}`;
		case "Attestation":
			return `Attestation:${target.attestationId}`;
		case "Shadow":
			return `Shadow:${target.shadowId}`;
		case "ResolutionStep":
			return `ResolutionStep:${target.requestId}:${target.stepKind}`;
	}
}

export function isWorkspaceSubject(value: unknown): value is WorkspaceSubject {
	if (!isRecord(value) || !isRecord(value.target)) return false;
	const target = value.target;
	if (value.kind === "Text" && target.kind === "Text") {
		return (
			typeof target.textId === "string" &&
			isOptionalString(target.focusAttestationId) &&
			isOptionalString(target.title) &&
			value.presentationContext === undefined
		);
	}
	if (value.kind !== "Note") return false;
	switch (target.kind) {
		case "Reading":
			return (
				typeof target.readingId === "string" &&
				isReadingNotePresentationContext(value.presentationContext)
			);
		case "Lemma":
			return (
				typeof target.lemmaId === "string" &&
				isLemmaNotePresentationContext(value.presentationContext)
			);
		case "Surface":
			return (
				target.language === "de" &&
				typeof target.normalizedSurface === "string" &&
				isSurfaceNotePresentationContext(value.presentationContext)
			);
		case "Attestation":
			return (
				typeof target.attestationId === "string" &&
				isAttestationNotePresentationContext(value.presentationContext)
			);
		case "Shadow":
			return (
				typeof target.shadowId === "string" &&
				value.presentationContext === undefined
			);
		case "ResolutionStep":
			return (
				typeof target.requestId === "string" &&
				isResolutionStepKind(target.stepKind) &&
				isResolutionStepPresentationContext(value.presentationContext)
			);
		default:
			return false;
	}
}

function isReadingNotePresentationContext(
	value: unknown,
): value is ReadingNotePresentationContext | undefined {
	return (
		value === undefined ||
		(isRecord(value) && typeof value.resolutionRequestId === "string")
	);
}

function isAttestationNotePresentationContext(
	value: unknown,
): value is AttestationNotePresentationContext | undefined {
	return (
		value === undefined ||
		(isRecord(value) &&
			typeof value.clickedSegmentIndex === "number" &&
			Number.isSafeInteger(value.clickedSegmentIndex))
	);
}

function isLemmaNotePresentationContext(
	value: unknown,
): value is LemmaNotePresentationContext | undefined {
	return (
		value === undefined ||
		(isRecord(value) && typeof value.activeReadingId === "string")
	);
}

function isSurfaceNotePresentationContext(
	value: unknown,
): value is SurfaceNotePresentationContext | undefined {
	return (
		value === undefined ||
		(isRecord(value) && typeof value.activeAnalysisKey === "string")
	);
}

function isResolutionStepPresentationContext(
	value: unknown,
): value is ResolutionStepPresentationContext | undefined {
	return (
		value === undefined ||
		(isRecord(value) &&
			isRecord(value.unitRoute) &&
			value.unitRoute.language === "de" &&
			typeof value.unitRoute.family === "string" &&
			typeof value.unitRoute.kind === "string")
	);
}

function isResolutionStepKind(value: unknown): value is ResolutionStepKind {
	return value === "Reading" || value === "Attestation";
}

export function unitRouteOf(
	context: NotePresentationContext | undefined,
): UnitRoute | undefined {
	return context && "unitRoute" in context ? context.unitRoute : undefined;
}

export function clickedSegmentIndexOf(
	context: NotePresentationContext | undefined,
): number | undefined {
	return context && "clickedSegmentIndex" in context
		? context.clickedSegmentIndex
		: undefined;
}

export function activeReadingIdOf(
	context: NotePresentationContext | undefined,
): Id<"readings"> | undefined {
	return context && "activeReadingId" in context
		? context.activeReadingId
		: undefined;
}

export function activeAnalysisKeyOf(
	context: NotePresentationContext | undefined,
): Id<"surfaces"> | undefined {
	return context && "activeAnalysisKey" in context
		? context.activeAnalysisKey
		: undefined;
}

function isOptionalString(value: unknown): boolean {
	return value === undefined || typeof value === "string";
}
