import {
	ResolutionNoteView,
	ResolutionStepNoteView,
} from "@/views/resolution-note-view";
import { RouteNoteView } from "@/views/route-note-view";
import { ShadowNoteView } from "@/views/shadow-note-view";
import { TextView } from "@/views/text-view";
import { UnitReadingNoteView } from "@/views/unit-reading-note-view";
import type {
	WorkspacePresentation,
	WorkspaceSubject,
} from "@/workspace/sheet-workspace";

/** Maps one workspace Subject to the view that presents it. */
export function renderApplicationSubject(
	subject: WorkspaceSubject,
	presentation: WorkspacePresentation,
	options: { readonly visitorId?: string } = {},
) {
	const { target } = subject;
	switch (target.kind) {
		case "Text":
			return (
				<TextView
					key={`${target.textId}:${target.focusAttestationId ?? ""}`}
					target={target}
				/>
			);
		case "Reading":
			return (
				<UnitReadingNoteView
					key={`${target.readingId}:${target.focus?.attestationId ?? ""}`}
					target={target}
					presentation={presentation}
					visitorId={options.visitorId}
				/>
			);
		case "Lemma":
		case "Surface":
		case "Attestation":
			return (
				<RouteNoteView
					key={noteTargetKey(target)}
					target={target}
					presentation={presentation}
					activeAnalysisKey={
						target.kind === "Surface"
							? "presentationContext" in subject
								? subject.presentationContext?.activeAnalysisKey
								: undefined
							: undefined
					}
				/>
			);
		case "Shadow":
			return (
				<ShadowNoteView
					key={target.shadowId}
					target={target}
					presentation={presentation}
				/>
			);
		case "Resolution":
			return (
				<ResolutionNoteView
					key={target.requestId}
					target={target}
					presentation={presentation}
				/>
			);
		case "ResolutionStep":
			return (
				<ResolutionStepNoteView
					key={`${target.requestId}:${target.stepKind}`}
					target={target}
					presentation={presentation}
				/>
			);
	}
}

/** The label on an occluded Card's tail. */
export function renderCardTail(subject: WorkspaceSubject) {
	const { target } = subject;
	switch (target.kind) {
		case "Text":
			return "Text";
		case "Reading":
			return "Reading";
		case "Lemma":
			return "Lemma";
		case "Surface":
			return "Surface";
		case "Attestation":
			return "Attestation";
		case "Shadow":
			return "Shadow";
		case "Resolution":
			return "Resolving";
		case "ResolutionStep":
			return target.stepKind;
	}
}

function noteTargetKey(
	target: Extract<
		WorkspaceSubject["target"],
		{ readonly kind: "Lemma" | "Surface" | "Attestation" }
	>,
): string {
	switch (target.kind) {
		case "Lemma":
			return `Lemma:${target.lemmaId}`;
		case "Surface":
			return `Surface:${target.language}:${target.normalizedSurface}`;
		case "Attestation":
			return `Attestation:${target.attestationId}`;
	}
}
