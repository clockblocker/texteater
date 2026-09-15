import type { Id } from "../../convex/_generated/dataModel";
import type {
	AttestationNoteTarget,
	LemmaNoteTarget,
	ReadingNoteTarget,
	ResolutionTarget,
	ShadowNoteTarget,
	SurfaceNoteTarget,
	TextTarget,
} from "../../shared/navigation";

export type ResolutionStepKind =
	| "Reading"
	| "Lemma"
	| "Surface"
	| "Attestation";

export type ResolutionStepTarget = {
	readonly kind: "ResolutionStep";
	readonly requestId: string;
	readonly stepKind: ResolutionStepKind;
};

export type WorkspaceNoteTarget =
	| ReadingNoteTarget
	| LemmaNoteTarget
	| SurfaceNoteTarget
	| AttestationNoteTarget
	| ShadowNoteTarget
	| ResolutionTarget
	| ResolutionStepTarget;

export type WorkspaceTarget = TextTarget | WorkspaceNoteTarget;

export type SurfaceNotePresentationContext = {
	/** Selects one of the aggregate Surface Note's analyses for this Presentation. */
	readonly activeAnalysisKey: Id<"surfaces">;
};

type ContextualSurfaceNoteSubject = {
	readonly kind: "Note";
	readonly target: SurfaceNoteTarget;
	readonly presentationContext?: SurfaceNotePresentationContext;
};

type ContextFreeNoteSubject = {
	readonly kind: "Note";
	readonly target: Exclude<WorkspaceNoteTarget, SurfaceNoteTarget>;
	readonly presentationContext?: never;
};

/** A Text as a workspace Subject: which Text, and nothing about how it was reached. */
export type TextSubjectTarget = Omit<TextTarget, "focusAttestationId">;

export type WorkspaceSubject =
	| { readonly kind: "Text"; readonly target: TextSubjectTarget }
	| ContextualSurfaceNoteSubject
	| ContextFreeNoteSubject;

export type WorkspacePresentation = "Card" | "Sheet";

export function workspaceSubjectFor(
	target: SurfaceNoteTarget,
	presentationContext?: SurfaceNotePresentationContext,
): ContextualSurfaceNoteSubject;
export function workspaceSubjectFor(
	target: Exclude<WorkspaceTarget, SurfaceNoteTarget>,
): Exclude<WorkspaceSubject, ContextualSurfaceNoteSubject>;
export function workspaceSubjectFor(
	target: WorkspaceTarget,
	presentationContext?: SurfaceNotePresentationContext,
): WorkspaceSubject;
export function workspaceSubjectFor(
	target: WorkspaceTarget,
	presentationContext?: SurfaceNotePresentationContext,
): WorkspaceSubject {
	return target.kind === "Text"
		? { kind: "Text", target: { kind: "Text", textId: target.textId } }
		: target.kind === "Surface"
			? {
					kind: "Note",
					target,
					...(presentationContext ? { presentationContext } : {}),
				}
			: { kind: "Note", target };
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
		case "Resolution":
			return `Resolution:${target.requestId}`;
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
			target.focusAttestationId === undefined &&
			value.presentationContext === undefined
		);
	}
	if (value.kind !== "Note") return false;
	switch (target.kind) {
		case "Reading":
			return (
				typeof target.readingId === "string" &&
				isDefinitionFocus(target.focus) &&
				value.presentationContext === undefined
			);
		case "Lemma":
			return (
				typeof target.lemmaId === "string" &&
				value.presentationContext === undefined
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
				value.presentationContext === undefined
			);
		case "Shadow":
			return (
				typeof target.shadowId === "string" &&
				value.presentationContext === undefined
			);
		case "Resolution":
			return (
				typeof target.requestId === "string" &&
				value.presentationContext === undefined
			);
		case "ResolutionStep":
			return (
				typeof target.requestId === "string" &&
				isResolutionStepKind(target.stepKind) &&
				value.presentationContext === undefined
			);
		default:
			return false;
	}
}

function isDefinitionFocus(value: unknown): boolean {
	return (
		value === undefined ||
		(isRecord(value) &&
			value.kind === "Definition" &&
			typeof value.attestationId === "string")
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

function isResolutionStepKind(value: unknown): value is ResolutionStepKind {
	return (
		value === "Reading" ||
		value === "Lemma" ||
		value === "Surface" ||
		value === "Attestation"
	);
}

export function workspaceSubjectsEqual(
	left: WorkspaceSubject,
	right: WorkspaceSubject,
): boolean {
	if (workspaceSubjectKey(left) !== workspaceSubjectKey(right)) return false;
	if (left.target.kind === "Reading" && right.target.kind === "Reading") {
		return (
			left.target.focus?.attestationId ===
			right.target.focus?.attestationId
		);
	}
	if (
		left.kind === "Note" &&
		right.kind === "Note" &&
		left.target.kind === "Surface" &&
		right.target.kind === "Surface"
	) {
		return (
			left.presentationContext?.activeAnalysisKey ===
			right.presentationContext?.activeAnalysisKey
		);
	}
	return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
