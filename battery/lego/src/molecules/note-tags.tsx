import type * as React from "react";

import { cn } from "../utils";

/** A quiet row of metadata tags closing a Note. */
export function NoteTags({
	className,
	...props
}: React.ComponentProps<"footer">) {
	return (
		<footer
			data-slot="note-tags"
			className={cn(
				"mt-5 flex flex-wrap gap-x-2.5 gap-y-1.5 border-t border-dashed border-line pt-3 text-xs text-ink-soft compact:mt-3",
				className,
			)}
			{...props}
		/>
	);
}
