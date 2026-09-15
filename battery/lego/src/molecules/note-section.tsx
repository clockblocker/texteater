import type * as React from "react";

import { cn } from "../utils";
import { NoteRule } from "./note-rule";

/**
 * A titled block of a Note. Comfortable density shows the label between
 * dashed rules; compact density drops the label and keeps a rule on top.
 *
 * Every block passes a `label`. Pass `""` on purpose for the rare body-only
 * block, and the section draws the separating rule itself.
 *
 * Pass `labelFor` with a control id when the block is a form field, and the
 * label renders as a `<label>` for it instead of a heading.
 */
export function NoteSection({
	label,
	labelFor,
	className,
	children,
	...props
}: React.ComponentProps<"section"> & {
	readonly label: React.ReactNode;
	readonly labelFor?: string;
}) {
	const headless = label === "" || label === null || label === undefined;
	return (
		<section
			data-slot="note-section"
			className={cn(
				"min-w-0 pt-5 compact:pt-3",
				!headless &&
					"compact:before:mb-2 compact:before:block compact:before:border-t compact:before:border-dashed compact:before:border-line compact:before:content-['']",
				className,
			)}
			{...props}
		>
			{headless ? (
				<NoteRule className="mb-3" />
			) : (
				<NoteSectionLabel htmlFor={labelFor}>{label}</NoteSectionLabel>
			)}
			{children}
		</section>
	);
}

const noteSectionLabelClassName =
	"mb-3 flex items-center font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase before:me-1.5 before:flex-1 before:border-t before:border-dashed before:border-line before:content-[''] after:ms-1.5 after:w-1.5 after:border-t after:border-dashed after:border-line after:content-[''] compact:hidden";

/**
 * Small monospaced caps set into a dashed rule. Renders a heading, or a
 * `<label>` when `htmlFor` names the control it titles.
 */
export function NoteSectionLabel({
	className,
	htmlFor,
	...props
}: React.HTMLAttributes<HTMLElement> & { readonly htmlFor?: string }) {
	if (htmlFor) {
		return (
			<label
				data-slot="note-section-label"
				htmlFor={htmlFor}
				className={cn(noteSectionLabelClassName, className)}
				{...props}
			/>
		);
	}
	return (
		<h2
			data-slot="note-section-label"
			className={cn(noteSectionLabelClassName, className)}
			{...props}
		/>
	);
}
