import type * as React from "react";

import { cn } from "../utils";

/**
 * A phonetic transcription set quietly beside a headword: always upright in
 * a dedicated IPA-complete font stack, tagged `lang="und-fonipa"`, with
 * softened boundary slashes and never broken mid-symbol.
 */
export function Ipa({
	transcription,
	className,
	...props
}: Omit<React.ComponentProps<"span">, "children"> & {
	readonly transcription: string;
}) {
	return (
		<span
			data-slot="ipa"
			lang="und-fonipa"
			className={cn(
				"shrink-0 whitespace-nowrap not-italic text-ink-muted",
				className,
			)}
			{...props}
		>
			<span aria-hidden="true" className="me-[0.05em] text-ink-faint">
				/
			</span>
			{transcription}
			<span aria-hidden="true" className="ms-[0.05em] text-ink-faint">
				/
			</span>
		</span>
	);
}
