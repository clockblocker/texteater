import { NoteSection, QuoteButton, ReaderPlainSegment } from "lego";
import type { ReactNode } from "react";

import type { GrammaticalDefaultRenderer } from "../../../renderer";

/** The one Sentence this Attestation lives in, with its members lit. */
export const renderDefaultAttestationSource = (({
	noteData,
	PresentationCapabilities,
}) => {
	const { source } = noteData;
	if (!source.sentenceSnippet) return null;
	return (
		<NoteSection
			aria-label="Source"
			label="Source"
			className="compact:before:hidden"
		>
			<QuoteButton
				onClick={() => PresentationCapabilities.follow(source.target)}
			>
				{highlightMembers(
					source.sentenceSnippet,
					noteData.presented.members.map(({ attested }) => attested),
				)}
			</QuoteButton>
		</NoteSection>
	);
}) satisfies GrammaticalDefaultRenderer<"Attestation">;

/**
 * Lights each member's first remaining occurrence, in order. Segment
 * boundaries are not part of the projection, so this is a text match.
 */
export function highlightMembers(
	snippet: string,
	members: readonly string[],
): ReactNode[] {
	const parts: ReactNode[] = [];
	let cursor = 0;
	for (const [index, member] of members.entries()) {
		if (!member) continue;
		const at = snippet.indexOf(member, cursor);
		if (at === -1) continue;
		if (at > cursor) parts.push(snippet.slice(cursor, at));
		parts.push(
			<ReaderPlainSegment key={`${index}:${at}`} highlighted>
				{member}
			</ReaderPlainSegment>,
		);
		cursor = at + member.length;
	}
	if (cursor < snippet.length) parts.push(snippet.slice(cursor));
	return parts;
}
