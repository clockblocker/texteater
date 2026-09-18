import { ReaderPlainSegment, ReaderSegment } from "lego";
import { createElement, type MouseEvent, type ReactNode } from "react";

export type SourceSegment = {
	readonly kind: string;
	readonly text: string;
	readonly gender?: "Fem" | "Masc" | "Neut";
};

/**
 * Renders a source sentence with only the occurrence's members as links,
 * each styled like a known word in the reader. The rest stays plain text
 * so it can be selected without following the link; each plain run is its
 * own element so a `Quote` with a follow surface can keep it hittable.
 * Members are found by Segment index, so a repeated word lights only the
 * attested instance.
 */
export function linkMembers(
	segments: readonly SourceSegment[],
	memberSegmentIndices: readonly number[],
	follow: () => void,
	destination = "the source Text",
): ReactNode[] {
	const members = new Set(memberSegmentIndices);
	const parts: ReactNode[] = [];
	let run = "";
	const flush = (key: number) => {
		if (run) {
			parts.push(
				createElement(ReaderPlainSegment, { key: `plain:${key}` }, run),
			);
		}
		run = "";
	};
	for (const [index, segment] of segments.entries()) {
		if (!members.has(index)) {
			run += segment.text;
			continue;
		}
		flush(index);
		parts.push(
			createElement(
				ReaderSegment,
				{
					key: `${index}:${segment.text}`,
					tone: "known",
					gender: segment.gender,
					interaction: "hover",
					"aria-label": `${segment.text}, open in ${destination}`,
					onClick: (event: MouseEvent<HTMLButtonElement>) => {
						if (event.detail > 0) event.currentTarget.blur();
						follow();
					},
				},
				segment.text,
			),
		);
	}
	flush(segments.length);
	return parts;
}
