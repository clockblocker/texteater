import type * as React from "react";

import { cn } from "../utils";

/** The dashed hairline that separates one Note block from the next. */
export function NoteRule({ className, ...props }: React.ComponentProps<"hr">) {
	return (
		<hr
			data-slot="note-rule"
			className={cn(
				"border-0 border-t border-dashed border-line",
				className,
			)}
			{...props}
		/>
	);
}
