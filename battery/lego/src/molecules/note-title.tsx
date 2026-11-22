import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../utils";
import { linkToneClasses } from "./link-tone";

export const noteTitleVariants = cva(
	"text-link m-0 text-[length:var(--note-title-size,1.125rem)] leading-[var(--note-title-leading,1.25)] font-[var(--note-title-weight,580)] tracking-[var(--note-title-tracking,-0.02em)] [overflow-wrap:anywhere]",
	{
		variants: {
			tone: linkToneClasses,
		},
		defaultVariants: { tone: "default" },
	},
);

export type NoteTitleTone = NonNullable<
	VariantProps<typeof noteTitleVariants>["tone"]
>;

/**
 * The headword of a Note, coloured by its grammatical tone.
 *
 * Reads `--note-title-size`, `--note-title-weight`, `--note-title-leading`,
 * and `--note-title-tracking` directly from its enclosing `NoteSurface` or
 * Presentation heading bar (`[data-title-bar]`), so morph rules in
 * `@layer components` and utility classes never collide.
 */
export function NoteTitle({
	className,
	tone,
	...props
}: React.ComponentProps<"h1"> & VariantProps<typeof noteTitleVariants>) {
	return (
		<h1
			data-slot="note-title"
			className={cn(noteTitleVariants({ tone }), className)}
			{...props}
		/>
	);
}

/**
 * A headword that leads somewhere. It is a known Unit and wears the same
 * rule family as one in the reader: nothing idle, a hairline while hovered
 * or focused, in whatever hue the title around it chose.
 */
export function NoteTitleLink({
	className,
	type = "button",
	...props
}: React.ComponentProps<"button">) {
	return (
		<button
			data-slot="note-title-link"
			type={type}
			className={cn(
				"relative cursor-pointer touch-manipulation appearance-none rounded-sm border-0 bg-transparent text-start font-[inherit] tracking-[inherit] text-[inherit] leading-[inherit] decoration-current/40 decoration-[0.06em] underline-offset-[0.18em] transition-opacity duration-150 before:absolute before:inset-x-0 before:-inset-y-[0.25em] before:content-[''] active:opacity-75 motion-reduce:transition-none",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * Lays a title and its aside (such as an IPA transcription or a caption) on
 * one baseline with consistent proximity across Card and Sheet forms, so the
 * aside stays beside the headword as the Card widens into a Sheet.
 */
export function NoteTitleRow({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="note-title-row"
			className={cn("flex items-baseline gap-x-3 gap-y-1", className)}
			{...props}
		/>
	);
}
