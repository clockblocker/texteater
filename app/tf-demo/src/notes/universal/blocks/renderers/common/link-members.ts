import { ReaderSegment } from "lego";
import { createElement, type MouseEvent, type ReactNode } from "react";

/**
 * Renders a source sentence with only the occurrence's members as links,
 * each styled like a known word in the reader. The rest stays plain text
 * so it can be selected without following the link. Segment boundaries
 * are not part of the projection, so members are matched by text, each
 * at its first remaining occurrence, in order.
 */
export function linkMembers(
	snippet: string,
	members: readonly string[],
	follow: () => void,
): ReactNode[] {
	const parts: ReactNode[] = [];
	let cursor = 0;
	for (const member of members) {
		if (!member) continue;
		const at = snippet.indexOf(member, cursor);
		if (at === -1) continue;
		if (at > cursor) parts.push(snippet.slice(cursor, at));
		parts.push(
			createElement(
				ReaderSegment,
				{
					key: `${at}:${member}`,
					tone: "known",
					interaction: "hover",
					"aria-label": `${member}, open in the source Text`,
					onClick: (event: MouseEvent<HTMLButtonElement>) => {
						if (event.detail > 0) event.currentTarget.blur();
						follow();
					},
				},
				member,
			),
		);
		cursor = at + member.length;
	}
	if (cursor < snippet.length) parts.push(snippet.slice(cursor));
	return parts;
}
