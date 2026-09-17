import { registeredBlockMap } from "@/notes/renderer-registry";
import type { NoteBlockKind } from "@/notes/universal/blocks/kind";
import { describeNote } from "@/notes/universal/note/data";
import { defaultNoteBlockLayout } from "@/notes/universal/note/layout";
import {
	defaultCapabilities,
	renderUniversalNote,
} from "@/notes/universal/note/render";
import { TextPresentation } from "@/views/text-view";
import type { WorkspaceTarget } from "@/workspace/sheet-workspace";
import type { PlaygroundSnapshot } from "../../../tooling/playground-snapshot";

export function PlaygroundNote({
	target,
	presentation,
	snapshot,
	follow,
}: {
	target: WorkspaceTarget;
	presentation: "Card" | "Sheet";
	snapshot: PlaygroundSnapshot;
	follow: (target: WorkspaceTarget) => void;
}) {
	if (target.kind === "Text") {
		const text = snapshot.texts[target.textId];
		return text ? (
			<TextPresentation
				sentences={text.sentences.map((sentence) => ({
					...sentence,
					sourceText: text.sourceText,
				}))}
				selectedSegmentKey={null}
				onSegmentClick={async (sentence, index) => {
					const attestationId = sentence.segments.find(
						(segment) => segment.index === index,
					)?.attestationId;
					if (attestationId)
						follow({ kind: "Attestation", attestationId });
				}}
			/>
		) : (
			<p>This Text is not part of the playground fixtures.</p>
		);
	}

	const id =
		target.kind === "Reading"
			? target.readingId
			: target.kind === "Lemma"
				? target.lemmaId
				: target.kind === "Surface"
					? target.normalizedSurface
					: target.kind === "Attestation"
						? target.attestationId
						: target.kind === "Shadow"
							? target.shadowId
							: null;
	const note = id ? snapshot.notes[`${target.kind}:${id}`] : null;
	if (!note)
		return <p>This target is not part of the playground fixtures.</p>;
	const registry = registeredBlockMap(describeNote(note).coordinates);
	return renderUniversalNote({
		noteData: note,
		capabilities: { ...defaultCapabilities(note), presentation, follow },
		layout: defaultNoteBlockLayout(
			Object.keys(registry ?? {}) as NoteBlockKind[],
		),
		registryFor: registeredBlockMap,
	});
}
