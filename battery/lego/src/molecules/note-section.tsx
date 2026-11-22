import type * as React from "react";
import { useId } from "react";

import { cn } from "../utils";
import { useNoteSurface } from "./note-surface";

/**
 * A titled block of a Note.
 *
 * Spacing between sections shrinks cleanly in Card form and expands smoothly
 * toward Sheet via `--note-morph`. How section labels and dividers appear
 * across the morph is controlled declaratively by the enclosing surface's
 * `sectionChrome` (`"reveal"`, `"hairline"`, or `"compact-label"`).
 *
 * Pass `visibility="sheet"` for secondary sections that fold out of the way in
 * Card form and smoothly unfold during the Card -> Sheet morph without
 * unmounting or forking DOM trees.
 *
 * Generates a heading id and wires `aria-labelledby` automatically when a
 * visible label is present and no explicit `aria-label` / `aria-labelledby`
 * is passed. Pass `labelFor` with a control id when the block is a form
 * field so `<label>` is nested cleanly inside `<h2>`.
 */
export function NoteSection({
	label,
	labelFor,
	visibility = "always",
	className,
	children,
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledBy,
	...props
}: React.ComponentProps<"section"> & {
	readonly label: React.ReactNode;
	readonly labelFor?: string;
	readonly visibility?: "always" | "sheet";
}) {
	const { mode } = useNoteSurface();
	const headingId = useId();
	const headless = label === "" || label === null || label === undefined;
	const hiddenInCard = visibility === "sheet" && mode === "card";
	const resolvedLabelledBy =
		ariaLabelledBy ?? (!headless && !ariaLabel ? headingId : undefined);
	const content = (
		<>
			<div data-slot="note-section-divider" aria-hidden="true" />
			{headless ? null : (
				<NoteSectionLabel id={headingId} htmlFor={labelFor}>
					{label}
				</NoteSectionLabel>
			)}
			{children}
		</>
	);
	return (
		<section
			data-slot="note-section"
			data-visibility={visibility === "sheet" ? "sheet" : undefined}
			data-headless={headless || undefined}
			aria-label={ariaLabel}
			aria-labelledby={resolvedLabelledBy}
			aria-hidden={hiddenInCard || undefined}
			inert={hiddenInCard || undefined}
			className={cn("min-w-0", className)}
			{...props}
		>
			{visibility === "sheet" ? (
				<div data-slot="note-section-inner">{content}</div>
			) : (
				content
			)}
		</section>
	);
}

/**
 * The Note's micro-label: 12px uppercase medium label in muted ink.
 * Write the words in natural case.
 */
export const noteLabelClassName =
	"text-xs leading-4 font-medium tracking-[0.07em] text-ink-muted uppercase";

/* Font size is owned in `@layer components` on `[data-slot="note-section-label"]`
   so `compact-label` morph sizing is never overridden by `@layer utilities`. */
const noteSectionLabelClassName =
	"block leading-4 font-medium tracking-[0.07em] text-ink-muted uppercase";

/**
 * A section's micro-label. Always renders `<h2>` so landmark and heading
 * structure stay intact, nesting `<label htmlFor>` inside when `htmlFor`
 * names the control it titles.
 */
function NoteSectionLabel({
	children,
	className,
	htmlFor,
	...props
}: React.HTMLAttributes<HTMLHeadingElement> & { readonly htmlFor?: string }) {
	return (
		<h2
			data-slot="note-section-label"
			className={cn(noteSectionLabelClassName, className)}
			{...props}
		>
			{htmlFor ? (
				<label htmlFor={htmlFor} className="block cursor-pointer">
					{children}
				</label>
			) : (
				children
			)}
		</h2>
	);
}
