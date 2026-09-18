import type * as React from "react";

import { cn } from "../utils";
import { type LinkTone, linkToneClasses } from "./link-tone";

const passage =
	"py-1 ps-[clamp(1rem,2.5cqi,2.5rem)] text-start leading-[1.55] font-[430] tracking-[-0.012em] compact:ps-3";

const bar =
	"border-s-[3px] border-line transition-colors duration-150 motion-reduce:transition-none";

/**
 * A quoted passage from a source Text. The passage itself is ordinary,
 * selectable text; the words that form the occurrence are rendered inside
 * it as `ReaderSegment` links, and the quote bar lights up while one of them
 * is hovered or focused, echoing the reader.
 *
 * With `onFollow`, the quote as a whole leads where its members lead: the
 * bar and the empty space around the passage hover and click like a member
 * (the bar lights, the members underline), so the reader need not aim for a
 * word. The passage stays on top of that surface and keeps its selection,
 * which is why its plain runs must be elements, not bare text nodes.
 */
export function Quote({
	className,
	children,
	tone = "default",
	onFollow,
	followLabel = "Open in the source Text",
	...props
}: React.ComponentProps<"div"> & {
	readonly tone?: LinkTone;
	readonly onFollow?: () => void;
	readonly followLabel?: string;
}) {
	if (!onFollow) {
		return (
			<div
				data-slot="quote"
				className={cn(
					linkToneClasses[tone],
					bar,
					passage,
					"has-[[data-slot=reader-segment]:hover]:border-link has-[[data-slot=reader-segment]:focus-visible]:border-link",
					className,
				)}
				{...props}
			>
				{children}
			</div>
		);
	}
	return (
		<div
			data-slot="quote"
			className={cn(
				linkToneClasses[tone],
				"relative",
				"has-[[data-slot=quote-surface]:hover]:[&_[data-slot=reader-segment]]:underline",
				className,
			)}
			{...props}
		>
			{/* Pointer-only: the members already give keyboard and assistive
			    users the same destination, so this adds no tab stop. */}
			<button
				data-slot="quote-surface"
				type="button"
				tabIndex={-1}
				aria-hidden
				title={followLabel}
				className={cn(
					bar,
					"absolute inset-0 cursor-pointer appearance-none bg-transparent p-0 hover:border-link",
					"[[data-slot=quote]:has([data-slot=reader-segment]:hover)_&]:border-link [[data-slot=quote]:has([data-slot=reader-segment]:focus-visible)_&]:border-link",
				)}
				onClick={(event) => {
					if (event.detail > 0) event.currentTarget.blur();
					onFollow();
				}}
			/>
			<p
				data-slot="quote-passage"
				className={cn(
					passage,
					"pointer-events-none relative [&>*]:pointer-events-auto",
				)}
			>
				{children}
			</p>
		</div>
	);
}
