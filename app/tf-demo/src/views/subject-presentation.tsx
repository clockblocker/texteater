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
} from "@/workspace/workspace-subject";

/** Maps one workspace Subject to the view that presents it, as a Card or a Sheet. */
export function renderApplicationSubject(
	subject: WorkspaceSubject,
	presentation: "Card" | "Sheet",
) {
	const { target } = subject;
	switch (target.kind) {
		case "Text":
			return <TextView key={target.textId} target={target} />;
		case "Reading":
			return (
				<UnitReadingNoteView
					key={target.readingId}
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

/**
 * What a Subject is called where the workspace names it: its aria-labels and
 * the Pane bar's trail. A Text goes by what the Library called it.
 */
export function subjectLabel(subject: WorkspaceSubject): string {
	const { target } = subject;
	switch (target.kind) {
		case "Text":
			return target.title ?? "Text";
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
		// While click resolution is rebuilt, a Resolution Card shows the unit
		// its click selected, and it settles at once (#848, #850).
		case "Resolution":
			return "Unit";
		case "ResolutionStep":
			return target.stepKind;
	}
}
