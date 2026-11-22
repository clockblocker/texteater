import type * as React from "react";
import type { ElementType } from "react";

import { cn } from "../utils";

/**
 * Running prose inside a Note (such as a Definition), held to a comfortable
 * reading measure (~70 characters) with balanced wrapping in both Card and
 * Sheet forms.
 */
export function NoteProse<T extends ElementType = "p">({
	as,
	className,
	...props
}: {
	readonly as?: T;
} & Omit<React.ComponentPropsWithRef<T>, "as">) {
	const Element: ElementType = as ?? "p";
	return (
		<Element
			data-slot="note-prose"
			className={cn(
				"max-w-[36rem] leading-[1.55] text-ink text-pretty",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * Quiet secondary metadata or inline aside beside a Note item. Scales smoothly
 * via `--note-aside-size` across the Card -> Sheet morph instead of snapping.
 */
export function NoteAside<T extends ElementType = "span">({
	as,
	className,
	...props
}: {
	readonly as?: T;
} & Omit<React.ComponentPropsWithRef<T>, "as">) {
	const Element: ElementType = as ?? "span";
	return (
		<Element
			data-slot="note-aside"
			className={cn("text-ink-muted", className)}
			{...props}
		/>
	);
}
