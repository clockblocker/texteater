import type * as React from "react";

import { cn } from "../utils";

/**
 * A titled block of a Note. Comfortable density sets a quiet label on the
 * column's start edge and groups with space alone: no rule. Compact density
 * drops the label and keeps a dashed rule on top.
 *
 * A section after another section takes more than four times the air it
 * keeps under its label, so a label belongs to what follows it. The first
 * section keeps less, and stays with the title above it. In a Card, a
 * section that opens the body keeps none: the Heading row above it already
 * leaves the title its room.
 *
 * Every block passes a `label`. Pass `""` on purpose for the rare body-only
 * block: space sets it apart in comfortable density, and in compact density
 * the section draws the separating rule itself.
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
				"min-w-0 pt-3 compact:pt-3 compact:first:pt-0 [section+&]:pt-9 compact:[section+&]:pt-3",
				!headless &&
					"compact:before:mb-2 compact:before:block compact:before:border-t compact:before:border-dashed compact:before:border-line compact:before:content-['']",
				className,
			)}
			{...props}
		>
			{headless ? (
				<hr
					data-slot="note-rule"
					className="mb-3 hidden border-0 border-t border-dashed border-line compact:block"
				/>
			) : (
				<NoteSectionLabel htmlFor={labelFor}>{label}</NoteSectionLabel>
			)}
			{children}
		</section>
	);
}

/**
 * The Note's micro-label: small, spaced caps in a muted ink. A section's
 * label wears it, and so does a tag that names a row, such as a
 * translation's language. Write the words in natural case.
 */
export const noteLabelClassName =
	"text-[0.6875rem] leading-4 font-medium tracking-[0.08em] text-ink-muted uppercase";

const noteSectionLabelClassName = `mb-2 block ${noteLabelClassName} compact:hidden`;

/**
 * A section's micro-label. Renders a heading, or a `<label>` when `htmlFor`
 * names the control it titles.
 */
function NoteSectionLabel({
	children,
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
			>
				{children}
			</label>
		);
	}
	return (
		<h2
			data-slot="note-section-label"
			className={cn(noteSectionLabelClassName, className)}
			{...props}
		>
			{children}
		</h2>
	);
}
