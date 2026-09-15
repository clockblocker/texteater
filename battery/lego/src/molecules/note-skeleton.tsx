import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../utils";
import { type Density, DensityScope } from "./density";
import { Mark } from "./mark";
import { NoteSection } from "./note-section";
import { NoteTags } from "./note-tags";
import { NoteTitleRow, noteTitleVariants } from "./note-title";

/**
 * The loading form of a Note. It keeps the Note's own structure (headword
 * row, dashed rules, route marks, quote bar, tag footer) and fills only the
 * places where words will appear with quiet bones, so a Note that is still
 * on its way already reads as the kind of Note it is about to become.
 *
 * One band of light crosses the whole block; nothing inside it moves on its own.
 */
export function NoteSkeleton({
	density,
	label,
	className,
	children,
	...props
}: Omit<React.ComponentProps<"div">, "aria-label"> & {
	readonly density: Density;
	/** What is loading, for assistive technology: "Loading Lemma Note". */
	readonly label: string;
}) {
	return (
		<DensityScope
			density={density}
			role="status"
			aria-busy="true"
			aria-label={label}
			data-slot="note-skeleton"
			className={cn(
				"min-h-full bg-paper text-base text-ink compact:text-sm",
				className,
			)}
			{...props}
		>
			<div
				aria-hidden="true"
				className="mx-auto w-full max-w-note px-note-gutter pt-note-top pb-note-top compact:p-3.5"
			>
				{children}
			</div>
		</DensityScope>
	);
}

const noteBoneVariants = cva(
	"inline-block h-[0.7em] max-w-full rounded-[0.22em] bone-sheen align-middle motion-reduce:animate-none",
	{
		variants: {
			tone: {
				/** A run of body text. */
				ink: "bg-line",
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
	className,
	children,
	...props
}: React.ComponentProps<"section">) {
	return (
		<NoteSection
			data-slot="note-section-skeleton"
			label={<NoteBone className="h-[0.62rem] w-14 rounded-[0.15rem]" />}
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
	className,
	...props
}: React.ComponentProps<"ul"> & {
	readonly widths: readonly string[];
	readonly mark?: React.ReactNode;
}) {
	return (
		<ul
			data-slot="note-route-rows-skeleton"
			className={cn("grid gap-2", className)}
			{...props}
		>
			{widths.map((width, index) => (
				<li key={index} className="flex items-center">
					{mark ?? <Mark className="text-ink-faint">·</Mark>}
					<NoteBone className={width} />
				</li>
			))}
		</ul>
	);
}

/** A quoted passage before its words arrive. Mirrors `QuoteButton`. */
export function NoteQuoteSkeleton({
	widths = ["w-full", "w-3/4"],
	className,
	...props
}: React.ComponentProps<"div"> & { readonly widths?: readonly string[] }) {
	return (
		<div
			data-slot="note-quote-skeleton"
			className={cn(
				"border-l-[3px] border-line py-1 pl-[clamp(1rem,2.5cqi,2.5rem)] compact:pl-3",
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
			className={cn("items-center", className)}
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
