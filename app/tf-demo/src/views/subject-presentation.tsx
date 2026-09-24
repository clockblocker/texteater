import type { PresentationForm } from "react-resizable-panels/workspace";
import {
	ResolutionNoteView,
	ResolutionStepNoteView,
} from "@/views/resolution-note-view";
import { RouteNoteView } from "@/views/route-note-view";
import { ShadowNoteView } from "@/views/shadow-note-view";
import { TextView } from "@/views/text-view";
import { UnitReadingNoteView } from "@/views/unit-reading-note-view";
import {
	activeAnalysisKeyOf,
	type WorkspaceSubject,
	workspaceSubjectKey,
} from "@/workspace/sheet-workspace";

/** Maps one workspace Subject to the view that presents it. */
export function renderApplicationSubject(
	subject: WorkspaceSubject,
	presentation: PresentationForm,
) {
	const { target } = subject;
	switch (target.kind) {
		case "Text":
			return <TextView key={target.textId} target={target} />;
		case "Reading":
			return (
				<UnitReadingNoteView
					key={`${target.readingId}:${target.focus?.attestationId ?? ""}`}
					target={target}
					presentation={presentation}
					resolutionRequestId={
						"presentationContext" in subject &&
						subject.presentationContext &&
						"resolutionRequestId" in subject.presentationContext
							? subject.presentationContext.resolutionRequestId
							: undefined
					}
				/>
			);
		case "Lemma":
		case "Surface":
		case "Attestation":
			return (
				<RouteNoteView
					key={workspaceSubjectKey(subject)}
					target={target}
					presentation={presentation}
					activeAnalysisKey={
						target.kind === "Surface" &&
						"presentationContext" in subject
							? activeAnalysisKeyOf(subject.presentationContext)
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
