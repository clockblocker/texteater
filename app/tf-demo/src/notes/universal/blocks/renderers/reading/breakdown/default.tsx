import { NoteSection } from "lego";

import type { ReadingDefaultRenderer } from "../../../renderer";
import { ConstituentsLine } from "./constituents-line";
import { MorphemesLine } from "./morphemes-line";
import { SourceLine } from "./source-line";

/**
 * What a Reading is built from (ADR 0050, ADR 0051): its Constituents one
 * level down, its morphemes under the school marks, and the Source an
 * unsegmentable formation names instead of Constituents. Each piece opens
 * the Note of the unit it links to.
 */
export const renderDefaultReadingBreakdown = (({
	noteData,
	PresentationCapabilities,
}) => {
	const constituents = noteData.breakdown?.constituents;
	const morphemes = noteData.breakdown?.morphemes;
	const sourceLinks = noteData.sourceLinks ?? [];
	if (!constituents && !morphemes && sourceLinks.length === 0) return null;
	const { follow } = PresentationCapabilities;
	return (
		<NoteSection aria-label="Breakdown" label="Breakdown">
			<div className="grid gap-1.5">
				{constituents ? (
					<ConstituentsLine
						pieces={constituents}
						ownerFamily={noteData.reading.lemma.family}
						follow={follow}
					/>
				) : null}
				{sourceLinks.map((link) => (
					<SourceLine
						key={
							link.target.kind === "Shadow"
								? link.target.shadowId
								: link.target.lemmaId
						}
						link={link}
						follow={follow}
					/>
				))}
				{morphemes ? (
					<MorphemesLine pieces={morphemes} follow={follow} />
				) : null}
			</div>
		</NoteSection>
	);
}) satisfies ReadingDefaultRenderer;
