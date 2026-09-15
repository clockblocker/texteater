import { LinkButton, Quote } from "lego";
import type { ReactNode } from "react";

import { linkMembers, type SourceSegment } from "./link-members";

type SourceOrigin =
	| { readonly kind: "Text" }
	| {
			readonly kind: "Definition";
			readonly emojiDescription: string;
			readonly canonicalForm: string;
	  };

/**
 * One quoted Source Context. A Text occurrence is the bare sentence with its
 * members lit. A Definition occurrence is prefixed with the defined Reading
 * as "{emoji} {headword}:" so the reader knows whose definition is quoted;
 * the prefix and the members lead to the same place.
 */
export function SourceQuote({
	segments,
	memberSegmentIndices,
	origin,
	follow,
}: {
	readonly segments: readonly SourceSegment[];
	readonly memberSegmentIndices: readonly number[];
	readonly origin: SourceOrigin;
	readonly follow: () => void;
}): ReactNode {
	const destination =
		origin.kind === "Definition"
			? `the definition of ${origin.canonicalForm}`
			: "the source Text";
	const members = linkMembers(
		segments,
		memberSegmentIndices,
		follow,
		destination,
	);
	const quote = { onFollow: follow, followLabel: `Open in ${destination}` };
	if (origin.kind !== "Definition")
		return <Quote {...quote}>{members}</Quote>;
	return (
		<Quote data-origin="Definition" {...quote}>
			<LinkButton
				className="me-[0.35em]"
				aria-label={`${origin.canonicalForm}, open its Reading Note`}
				onClick={(event) => {
					if (event.detail > 0) event.currentTarget.blur();
					follow();
				}}
			>
				<span className="me-[0.35em] text-ink">
					{origin.emojiDescription}
				</span>
				{origin.canonicalForm}:
			</LinkButton>
			{members}
		</Quote>
	);
}
