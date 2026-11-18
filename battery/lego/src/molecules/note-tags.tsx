import type * as React from "react";

import { cn } from "../utils";

/**
 * A quiet row of metadata tags closing a Note. Comfortable density sets it
 * apart with space and draws a middle dot between tags; the dot is CSS, so
 * the tags' own text stays plain. Compact density keeps a dashed rule on
 * top and a gap between tags.
 */
export function NoteTags({
	className,
	...props
}: React.ComponentProps<"footer">) {
	return (
		<footer
			data-slot="note-tags"
			className={cn(
				"mt-10 flex flex-wrap gap-y-1.5 text-xs text-ink-muted [&>*:not(:last-child)]:after:mx-2 [&>*:not(:last-child)]:after:text-ink-faint [&>*:not(:last-child)]:after:content-['·'] compact:mt-3 compact:gap-x-2.5 compact:border-t compact:border-dashed compact:border-line compact:pt-3 compact:text-ink-soft compact:[&>*:not(:last-child)]:after:content-none",
				className,
			)}
			{...props}
		/>
	);
}
