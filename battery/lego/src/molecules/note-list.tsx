import { ChevronDownIcon, LoaderCircleIcon } from "lucide-react";
import type * as React from "react";
import type { ElementType } from "react";

import { cn } from "../utils";
import { IconSwap } from "./icon-swap";
import { NoteMorphReveal } from "./note-surface";

/**
 * A vertical stack or wrapping row of items inside a Note block whose rhythm
 * tightens in Card form and opens smoothly toward Sheet via `--note-morph`.
 */
export function NoteList<T extends ElementType = "ul">({
	as,
	gap = "default",
	layout = "stack",
	className,
	...props
}: {
	readonly as?: T;
	readonly gap?: "tight" | "default" | "loose";
	readonly layout?: "stack" | "wrap";
} & Omit<React.ComponentPropsWithRef<T>, "as" | "gap" | "layout">) {
	const Element: ElementType = as ?? "ul";
	return (
		<Element
			data-slot="note-list"
			data-gap={gap}
			data-layout={layout}
			className={cn(
				layout === "wrap" ? "flex flex-wrap gap-x-5" : "grid",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * Quiet pagination trigger closing an expandable Note list. Uses one consistent
 * surface-integrated style instead of forking an outlined button in Card;
 * collapses cleanly in Card when `sheetOnly` is enabled.
 */
export function NoteLoadMore({
	label,
	isLoading,
	onLoadMore,
	sheetOnly = true,
	className,
}: {
	readonly label: string;
	readonly isLoading: boolean;
	readonly onLoadMore: (() => unknown) | null;
	readonly sheetOnly?: boolean;
	readonly className?: string;
}) {
	const disabled = isLoading || onLoadMore === null;
	const button = (
		<button
			type="button"
			data-slot="load-more"
			disabled={disabled}
			onClick={() => void onLoadMore?.()}
			className={cn(
				"-mx-2 mt-3 flex w-fit cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm text-ink-muted transition-[color,background-color] duration-150 ease-out hover:bg-ink/[0.04] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link/50 disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-ink-muted motion-reduce:transition-none [&_svg]:size-3.5",
				className,
			)}
		>
			<IconSwap
				data-icon="inline-start"
				active={isLoading}
				idle={<ChevronDownIcon />}
				busy={<LoaderCircleIcon className="animate-spin" />}
			/>
			{isLoading ? "Loading…" : label}
		</button>
	);
	if (!sheetOnly) return button;
	return <NoteMorphReveal visibility="sheet">{button}</NoteMorphReveal>;
}
