import { LinkButton, NoteSection } from "lego";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { visitorErrorMessage } from "@/lib/visitor-error";

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
		card={PresentationCapabilities.presentation === "Card"}
	/>
)) satisfies ReadingDefaultRenderer;

/** What every form's field shares: it grows with its text and never scrolls. */
const FIELD =
	"block resize-none overflow-hidden leading-relaxed text-foreground disabled:opacity-60";
/** A Card's field: a box, two lines tall, which rests until the Note is a Sheet. */
const CARD_FIELD =
	"min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 placeholder:text-ink-muted placeholder:italic focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
/**
 * A Sheet's field: no box at rest. Its text sits on the Note's leading
 * edge and its shape hangs outside the column by its padding. A faint fill
 * under the pointer and while it is edited, and a hairline ring while it
 * has focus, say it can be written in.
 */
const SHEET_FIELD =
	"-mx-2.5 -my-1 w-[calc(100%_+_1.25rem)] rounded-md bg-transparent px-2.5 py-1 outline-none transition-[background-color,box-shadow] duration-150 ease-out placeholder:text-ink-faint hover:bg-ink/[0.04] focus-visible:bg-ink/[0.05] focus-visible:ring-1 focus-visible:ring-link/60";

function PersonalAnnotationEditor({
	value,
	capability,
	card,
}: {
	value: string;
	capability: ReadingPresentationCapabilities["personalAnnotation"];
	/** The Note is a Card, where the field keeps its box. */
	card: boolean;
}) {
	const id = useId();
	const editor = useRef<HTMLTextAreaElement>(null);
	const [draftOverride, setDraftOverride] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const draft = draftOverride ?? value;
	useLayoutEffect(() => {
		const element = editor.current;
		if (!element) return;
		const fit = () => {
			element.style.height = "0px";
			element.style.height = `${element.scrollHeight}px`;
		};
		fit();
		/* a new width rewraps the text, so the field is fitted again, on
		   the next frame: fitting it inside the observer's own delivery
		   would resize what it observes and loop */
		let width = element.clientWidth;
		let frame = 0;
		const observer = new ResizeObserver(() => {
			if (element.clientWidth === width) return;
			width = element.clientWidth;
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(fit);
		});
		observer.observe(element);
		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
		};
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
			setDraftOverride(null);
		} catch (cause) {
			setError(
				visitorErrorMessage(
					cause,
					"Personal Annotation could not be saved.",
				),
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
				rows={card ? 2 : 1}
				value={draft}
				placeholder={card ? "…" : "Add a note…"}
				readOnly={!capability.save}
				disabled={saving || capability.isSaving}
				onChange={(event) => setDraftOverride(event.target.value)}
				onBlur={() => void save()}
				onKeyDown={(event) => {
					if (event.key === "Escape") {
						event.stopPropagation();
						setDraftOverride(null);
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
				className={`${FIELD} ${card ? CARD_FIELD : SHEET_FIELD}`}
			/>
			{saving || capability.isSaving ? (
				<p
					role="status"
					className="mt-2 text-xs text-ink-muted compact:px-2"
				>
					Saving…
				</p>
			) : null}
			{error || capability.error ? (
				<div
					id={`${id}-error`}
					role="alert"
					className="mt-2 flex flex-col items-start gap-1 text-sm text-destructive compact:px-2 compact:text-[length:inherit]"
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
