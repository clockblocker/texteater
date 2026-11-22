import type * as React from "react";

import { cn } from "../utils";

/**
 * Paper-integrated annotation textarea shared by Card and Sheet forms.
 *
 * When empty, presents a discoverable dashed well so readers immediately
 * recognize the field as writable; once filled, melts borderless onto the
 * Note's leading edge with a capped reading measure (`36rem`) and a crisp
 * keyboard focus ring.
 */
export function NoteAnnotationField({
	className,
	rows = 1,
	value,
	defaultValue,
	...props
}: React.ComponentProps<"textarea">) {
	const empty =
		typeof value === "string"
			? value.trim() === ""
			: typeof defaultValue === "string"
				? defaultValue.trim() === ""
				: undefined;
	return (
		<textarea
			data-slot="note-annotation-field"
			data-empty={
				empty === undefined ? undefined : empty ? "true" : "false"
			}
			rows={rows}
			value={value}
			defaultValue={defaultValue}
			className={cn(
				"block max-w-[36rem] resize-none overflow-hidden text-base leading-[1.55] text-foreground outline-2 outline-transparent transition-[background-color,border-color,box-shadow] duration-150 ease-out placeholder:text-ink-placeholder focus-visible:border-transparent focus-visible:bg-ink/[0.05] focus-visible:outline-2 focus-visible:outline-transparent focus-visible:ring-2 focus-visible:ring-link/60 disabled:opacity-60 sm:text-[inherit] pointer-coarse:text-[max(16px,1rem)] motion-reduce:transition-none",
				empty
					? "w-full rounded-lg border border-dashed border-line/80 bg-canvas/35 px-3 py-2 hover:border-line-strong/80 hover:bg-canvas/50"
					: "-mx-2.5 -my-1 w-[calc(100%_+_1.25rem)] max-w-[37.25rem] rounded-md border border-transparent bg-transparent px-2.5 py-1 hover:bg-ink/[0.04] placeholder-shown:mx-0 placeholder-shown:my-0 placeholder-shown:w-full placeholder-shown:max-w-[36rem] placeholder-shown:rounded-lg placeholder-shown:border-dashed placeholder-shown:border-line/80 placeholder-shown:bg-canvas/35 placeholder-shown:px-3 placeholder-shown:py-2",
				className,
			)}
			{...props}
		/>
	);
}
