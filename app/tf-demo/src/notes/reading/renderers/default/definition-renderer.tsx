import { useId, useLayoutEffect, useRef, useState } from "react";
import { normalizeReadingDefinition } from "@/lib/reading-definition";
import type {
	ReadingNoteDefaultRenderer,
	ReadingNotePresentationCapabilities,
} from "../../reading-note-render-context";

export const renderReadingDefinition = (({ note, capabilities }) => {
	if (!capabilities.knowledgeSettings.definition) return null;
	if (!note.knowledge.definition && !capabilities.definition.save)
		return null;
	return (
		<DefinitionEditor
			key={note.reading.ownerKey}
			value={note.knowledge.definition ?? ""}
			title={note.reading.lemma.canonicalForm}
			capability={capabilities.definition}
		/>
	);
}) satisfies ReadingNoteDefaultRenderer;

function DefinitionEditor({
	value,
	title,
	capability,
}: {
	value: string;
	title: string;
	capability: ReadingNotePresentationCapabilities["definition"];
}) {
	const id = useId();
	const editor = useRef<HTMLTextAreaElement>(null);
	const [draft, setDraft] = useState(value);
	const [baseline, setBaseline] = useState(value);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	if (value !== baseline) {
		setBaseline(value);
		if (draft === baseline) setDraft(value);
	}
	useLayoutEffect(() => {
		const element = editor.current;
		if (!element) return;
		const fit = () => {
			element.style.height = "0px";
			element.style.height = `${element.scrollHeight}px`;
		};
		fit();
		let width = element.clientWidth;
		const observer = new ResizeObserver(() => {
			if (element.clientWidth === width) return;
			width = element.clientWidth;
			fit();
		});
		observer.observe(element);
		return () => observer.disconnect();
	}, [draft]);
	async function save() {
		if (
			!capability.save ||
			saving ||
			capability.isSaving ||
			normalizeReadingDefinition(draft) ===
				normalizeReadingDefinition(value)
		)
			return;
		setSaving(true);
		setError(null);
		try {
			await capability.save(normalizeReadingDefinition(draft));
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "Definition could not be saved.",
			);
		} finally {
			setSaving(false);
		}
	}
	return (
		<section
			className="reading-note__section reading-note__definition"
			aria-label="Definition"
		>
			<label className="sr-only" htmlFor={id}>
				Definition of {title}
			</label>
			<textarea
				id={id}
				ref={editor}
				rows={1}
				value={draft}
				placeholder="…"
				readOnly={!capability.save}
				disabled={saving || capability.isSaving}
				onChange={(event) => setDraft(event.target.value)}
				onBlur={() => void save()}
				onKeyDown={(event) => {
					if (event.key === "Escape") {
						event.stopPropagation();
						setDraft(value);
						setError(null);
					}
					if (
						event.key === "Enter" &&
						(event.metaKey || event.ctrlKey)
					) {
						event.preventDefault();
						void save();
					}
				}}
				aria-describedby={
					error || capability.error ? `${id}-error` : undefined
				}
			/>
			{saving || capability.isSaving ? (
				<p role="status">Saving…</p>
			) : null}
			{error || capability.error ? (
				<div id={`${id}-error`} role="alert">
					<p>{error ?? capability.error}</p>
					<button type="button" onClick={() => void save()}>
						Retry saving
					</button>
				</div>
			) : null}
		</section>
	);
}
