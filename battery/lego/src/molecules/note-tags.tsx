import type * as React from "react";

import { cn } from "../utils";

/**
 * A quiet row of metadata tags closing a Note. Separated from the body by a
 * whisper-thin top hairline, with screen-reader-silent `·` middle dot
 * separators defined in `@layer components`; top spacing expands smoothly
 * via `--note-morph`.
 */
export function NoteTags({
	className,
	...props
}: React.ComponentProps<"footer">) {
	return (
		<footer
			data-slot="note-tags"
			className={cn(
				"flex flex-wrap gap-y-1.5 border-t border-hairline pt-3 text-xs leading-[1.4] text-ink-muted",
				className,
			)}
			{...props}
		/>
	);
}
