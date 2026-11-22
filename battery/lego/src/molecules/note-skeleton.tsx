import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../utils";
import type { Density } from "./density";
import { Mark } from "./mark";
import { NoteList } from "./note-list";
import { NoteSection } from "./note-section";
import { NoteFrame } from "./note-surface";
import { NoteTags } from "./note-tags";
import { NoteTitleRow, noteTitleVariants } from "./note-title";

/**
 * The loading form of a Note. Shares `NoteFrame` and the exact same morph
 * tokens as a loaded Note, so bones sit where words will land in both Card
 * and Sheet forms without layout jumps.
 */
export function NoteSkeleton({
	density,
	underHeading = false,
	label,
	className,
	children,
	...props
}: Omit<React.ComponentProps<"div">, "aria-label"> & {
	readonly density: Density;
	readonly underHeading?: boolean;
	/** What is loading, for assistive technology: "Loading Lemma Note". */
	readonly label: string;
}) {
	return (
		<NoteFrame
			mode={density === "compact" ? "card" : "sheet"}
			underHeading={underHeading}
			frameAs="div"
			frameHidden
			role="status"
			aria-busy="true"
			aria-label={label}
			data-slot="note-skeleton"
			className={className}
			{...props}
		>
			{children}
		</NoteFrame>
	);
}

const noteBoneVariants = cva(
	"inline-block h-[0.7em] max-w-full rounded-[0.22em] bone-sheen align-middle motion-reduce:animate-none",
	{
		variants: {
			tone: {
				/** A run of body text. */
				ink: "bg-skeleton",
				/** A headword, tinted the way a loaded headword will be. */
				headword: "bg-primary/25",
			},
		},
		defaultVariants: { tone: "ink" },
	},
);

/** One run of text that has not arrived yet. Size it with a width class. */
export function NoteBone({
	className,
	tone,
	...props
}: React.ComponentProps<"span"> & VariantProps<typeof noteBoneVariants>) {
	return (
		<span
			data-slot="note-bone"
			className={cn(noteBoneVariants({ tone }), className)}
			{...props}
		/>
	);
}

/** The headword row with its word still on the way. */
export function NoteTitleSkeleton({
	width = "w-28",
	className,
	children,
	...props
}: React.ComponentProps<"header"> & { readonly width?: string }) {
	return (
		<header
			data-slot="note-title-skeleton"
			className={className}
			{...props}
		>
			<NoteTitleRow>
				<div className={noteTitleVariants({ tone: "default" })}>
					{children ?? (
						<NoteBone
							tone="headword"
							className={cn("h-[0.8em]", width)}
						/>
					)}
				</div>
			</NoteTitleRow>
		</header>
	);
}

/** A titled block whose label is also still on the way. */
export function NoteSectionSkeleton({
	visibility = "always",
	className,
	children,
	...props
}: React.ComponentProps<"section"> & {
	readonly visibility?: "always" | "sheet";
}) {
	return (
		<NoteSection
			data-slot="note-section-skeleton"
			label={<NoteBone className="h-[0.5rem] w-14 rounded-[0.15rem]" />}
			visibility={visibility}
			className={className}
			{...props}
		>
			{children}
		</NoteSection>
	);
}

/** Lines of running text, one bone per line, set on the Note's leading. */
export function NoteLinesSkeleton({
	widths = ["w-full", "w-4/5"],
	className,
	...props
}: React.ComponentProps<"div"> & { readonly widths?: readonly string[] }) {
	return (
		<div
			data-slot="note-lines-skeleton"
			className={cn("leading-[1.55]", className)}
			{...props}
		>
			{widths.map((width, index) => (
				<div key={index}>
					<NoteBone className={width} />
				</div>
			))}
		</div>
	);
}

/**
 * Route rows before their words arrive. The mark is the one thing already
 * known about each row: pass the hop glyph the loaded Note will use.
 */
export function NoteRouteRowsSkeleton({
	widths,
	mark,
	layout = "stack",
	className,
	...props
}: React.ComponentProps<"ul"> & {
	readonly widths: readonly string[];
	readonly mark?: React.ReactNode;
	readonly layout?: "stack" | "wrap";
}) {
	return (
		<NoteList
			data-slot="note-route-rows-skeleton"
			layout={layout}
			className={className}
			{...props}
		>
			{widths.map((width, index) => (
				<li key={index} className="flex items-center">
					{mark ?? <Mark className="text-ink-faint">·</Mark>}
					<NoteBone className={width} />
				</li>
			))}
		</NoteList>
	);
}

/** A quoted passage before its words arrive. Mirrors `Quote` rail and indent. */
export function NoteQuoteSkeleton({
	widths = ["w-full", "w-3/4"],
	className,
	...props
}: React.ComponentProps<"div"> & { readonly widths?: readonly string[] }) {
	return (
		<div
			data-slot="note-quote-skeleton"
			className={cn(
				"relative max-w-[38rem] py-0.5 before:pointer-events-none before:absolute before:inset-y-[0.18em] before:start-0 before:w-[2.5px] before:rounded-full before:bg-skeleton",
				className,
			)}
			{...props}
		>
			<NoteLinesSkeleton widths={widths} />
		</div>
	);
}

const TAG_WIDTHS = ["w-5", "w-14", "w-10", "w-16"] as const;

/** The closing tag row before it knows what the Note is. */
export function NoteTagsSkeleton({
	count = 3,
	className,
	...props
}: React.ComponentProps<"footer"> & { readonly count?: number }) {
	return (
		<NoteTags
			data-slot="note-tags-skeleton"
			className={cn(
				"items-center gap-x-5 [&>*:not(:last-child)]:after:content-none",
				className,
			)}
			{...props}
		>
			{Array.from({ length: count }, (_, index) => (
				<NoteBone
					key={index}
					className={TAG_WIDTHS[index % TAG_WIDTHS.length]}
				/>
			))}
		</NoteTags>
	);
}
