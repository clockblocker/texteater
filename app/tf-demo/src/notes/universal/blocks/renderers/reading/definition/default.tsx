import { LinkButton, NoteRule, NoteSection } from "lego";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { normalizeReadingDefinition } from "@/lib/reading-definition";
import type { ReadingPresentationCapabilities } from "../../../../note/capabilities";
import type { ReadingDefaultRenderer } from "../../../renderer";

export const renderReadingDefinition = (({
	noteData,
	PresentationCapabilities,
}) => {
	if (!PresentationCapabilities.knowledgeSettings.definition) return null;
	if (
		!noteData.knowledge.definition &&
		!PresentationCapabilities.definition.save
	)
		return null;
	return (
		<DefinitionEditor
			key={noteData.reading.ownerKey}
			value={noteData.knowledge.definition ?? ""}
			title={noteData.reading.lemma.canonicalForm}
			capability={PresentationCapabilities.definition}
		/>
	);
}) satisfies ReadingDefaultRenderer;

function DefinitionEditor({
	value,
	title,
	capability,
}: {
	value: string;
	title: string;
	capability: ReadingPresentationCapabilities["definition"];
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
		<NoteSection aria-label="Definition" className="compact:before:hidden">
			<NoteRule className="mb-3" />
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
				className="block min-h-11 w-full resize-none overflow-hidden rounded-none border-0 bg-transparent px-2 py-1 leading-relaxed text-ink placeholder:text-ink-muted placeholder:italic focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-primary"
			/>
			{saving || capability.isSaving ? (
				<p role="status" className="text-xs text-ink-muted">
					Saving…
				</p>
			) : null}
			{error || capability.error ? (
				<div
					id={`${id}-error`}
					role="alert"
					className="flex flex-col items-start gap-1 text-destructive"
				>
					<p>{error ?? capability.error}</p>
					<LinkButton onClick={() => void save()}>
						Retry saving
					</LinkButton>
				</div>
			) : null}
		</NoteSection>
	);
}
