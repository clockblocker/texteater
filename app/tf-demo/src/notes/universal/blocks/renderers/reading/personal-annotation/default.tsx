import { LinkButton, NoteAnnotationField, NoteSection } from "lego";
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
	const [draftOverride, setDraftOverride] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const draft = draftOverride ?? value;
	const isEmpty = draft.trim() === "";
	const isSaving = saving || capability.isSaving;
	const errorMessage = error ?? capability.error;
	const hasStatus = isSaving || Boolean(errorMessage);

	useLayoutEffect(() => {
		const element = editor.current;
		if (!element) return;
		const supportsFieldSizing =
			typeof CSS !== "undefined" &&
			typeof CSS.supports === "function" &&
			CSS.supports("field-sizing", "content");
		if (supportsFieldSizing) return;
		if (isEmpty) {
			element.style.height = "";
			return;
		}
		const fit = () => {
			element.style.height = "0px";
			element.style.height = `${element.scrollHeight}px`;
		};
		fit();
		/* Defer width-triggered refits until the container settles so Card <-> Sheet
		   morphing never thrashes layout at 60–120fps. */
		let width = element.clientWidth;
		let settleTimer: ReturnType<typeof setTimeout> | undefined;
		const observer = new ResizeObserver(() => {
			if (element.clientWidth === width) return;
			width = element.clientWidth;
			if (settleTimer !== undefined) clearTimeout(settleTimer);
			settleTimer = setTimeout(fit, 120);
		});
		observer.observe(element);
		return () => {
			if (settleTimer !== undefined) clearTimeout(settleTimer);
			observer.disconnect();
		};
	}, [draft, isEmpty]);

	async function save() {
		if (!capability.save || isSaving || draft === value) {
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
					"Unable to save note. Check your connection and try again.",
				),
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<NoteSection
			label="Margin note"
			labelFor={id}
			visibility={isEmpty && !hasStatus ? "sheet" : "always"}
			data-empty={isEmpty ? "true" : "false"}
		>
			<NoteAnnotationField
				id={id}
				name="personal-annotation"
				ref={editor}
				value={draft}
				placeholder="Jot a memory hook, nuance, or example…"
				className="field-sizing-content"
				readOnly={!capability.save}
				disabled={isSaving}
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
				aria-invalid={Boolean(errorMessage) || undefined}
				aria-describedby={errorMessage ? `${id}-error` : undefined}
			/>
			<p
				role="status"
				className={isSaving ? "mt-2 text-xs text-ink-muted" : "sr-only"}
			>
				{isSaving ? "Saving…" : ""}
			</p>
			{errorMessage ? (
				<div
					id={`${id}-error`}
					role="alert"
					className="mt-2 flex flex-col items-start gap-1 text-sm text-destructive"
				>
					<p>{errorMessage}</p>
					<LinkButton onClick={() => void save()}>
						Try again
					</LinkButton>
				</div>
			) : null}
		</NoteSection>
	);
}
