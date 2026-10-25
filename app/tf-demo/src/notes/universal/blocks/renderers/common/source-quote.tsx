import { LinkButton, type NoteTitleTone, Quote } from "lego";
import type { ReactNode } from "react";

import type { ReflexiveSlot } from "../../../../../../shared/reflexive-slot";
import { type CitationPresenter, citationText } from "../../citation";
import { linkMembers, type SourceSegment } from "./link-members";

type StoredOrigin =
	| { readonly kind: "Scroll" }
	| {
			readonly kind: "Definition";
			readonly emojiDescription: string;
			readonly canonicalForm: string;
			readonly reflexive: ReflexiveSlot | null;
	  };

/** Where a quote comes from, a defined Reading named by its Citation. */
type SourceOrigin =
	| { readonly kind: "Scroll" }
	| {
			readonly kind: "Definition";
			readonly emojiDescription: string;
			readonly citation: string;
	  };

/** A stored origin with its defined Reading cited (ADR 0052). */
export function citedOrigin(
	origin: StoredOrigin,
	cite: CitationPresenter,
): SourceOrigin {
	if (origin.kind === "Scroll") return origin;
	return {
		kind: "Definition",
		emojiDescription: origin.emojiDescription,
		citation: citationText(
			cite({ ...origin, lemma: { canonicalForm: origin.canonicalForm } }),
		),
	};
}

/**
 * One quoted Source Context. A Scroll occurrence is the bare sentence with its
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
			? `the definition of ${origin.citation}`
			: "the source Text";
	const members = linkMembers(
		segments,
		memberSegmentIndices,
		follow,
		destination,
	);
	const memberGenders = new Set(
		memberSegmentIndices.map((index) => segments[index]?.gender),
	);
	const gender =
		memberGenders.size === 1
			? memberGenders.values().next().value
			: undefined;
	const tone: NoteTitleTone =
		gender === "Fem"
			? "feminine"
			: gender === "Masc"
				? "masculine"
				: gender === "Neut"
					? "neuter"
					: "default";
	const quote = {
		tone,
		onFollow: follow,
		followLabel: `Open in ${destination}`,
	};
	if (origin.kind !== "Definition")
		return <Quote {...quote}>{members}</Quote>;
	return (
		<Quote data-origin="Definition" {...quote}>
			<LinkButton
				className="me-[0.35em]"
				aria-label={`${origin.citation}, open its definition`}
				onClick={(event) => {
					if (event.detail > 0) event.currentTarget.blur();
					follow();
				}}
			>
				<span className="me-[0.35em] text-ink">
					{origin.emojiDescription}
				</span>
				{origin.citation}:
			</LinkButton>
			{members}
		</Quote>
	);
}
