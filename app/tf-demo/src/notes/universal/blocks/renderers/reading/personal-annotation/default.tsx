import { LinkButton, NoteSection } from "lego";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import type { ReadingPresentationCapabilities } from "../../../../note/capabilities";
import type { ReadingDefaultRenderer } from "../../../renderer";

export const renderReadingPersonalAnnotation = (({
	noteData,
	PresentationCapabilities,
}) => (
	<PersonalAnnotationEditor
		key={noteData.reading.ownerKey}
		value={noteData.personalAnnotation}
		capability={PresentationCapabilities.personalAnnotation}
	/>
)) satisfies ReadingDefaultRenderer;

function PersonalAnnotationEditor({
	value,
	capability,
}: {
	value: string;
	capability: ReadingPresentationCapabilities["personalAnnotation"];
}) {
	const id = useId();
	const editor = useRef<HTMLTextAreaElement>(null);
	const [draft, setDraft] = useState(value);
	const [baseline, setBaseline] = useState(value);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		setBaseline(value);
		setDraft((current) => (current === baseline ? value : current));
	}, [baseline, value]);
	useLayoutEffect(() => {
		const element = editor.current;
		if (!element) return;
		const fit = () => {
			element.style.height = "0px";
			element.style.height = `${element.scrollHeight}px`;
		};
		fit();
		const observer = new ResizeObserver(fit);
		observer.observe(element);
		return () => observer.disconnect();
	}, [draft]);

	async function save() {
		if (
			!capability.save ||
			saving ||
			capability.isSaving ||
			draft === value
		) {
			return;
		}
		setSaving(true);
		setError(null);
		try {
			await capability.save(draft);
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "Personal Annotation could not be saved.",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<NoteSection
			aria-label="Personal Annotation"
			label="Personal Annotation"
			labelFor={id}
		>
			<textarea
				id={id}
				ref={editor}
				rows={2}
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
				className="block min-h-20 w-full resize-none overflow-hidden rounded-lg border border-input bg-background px-3 py-2 leading-relaxed text-foreground placeholder:text-ink-muted placeholder:italic focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
			/>
			{saving || capability.isSaving ? (
				<p role="status" className="mt-2 px-2 text-xs text-ink-muted">
					Saving…
				</p>
			) : null}
			{error || capability.error ? (
				<div
					id={`${id}-error`}
					role="alert"
					className="mt-2 flex flex-col items-start gap-1 px-2 text-destructive"
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
