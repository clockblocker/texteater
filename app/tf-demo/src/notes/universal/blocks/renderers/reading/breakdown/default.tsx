import { NoteSection } from "lego";

import type { WorkspaceTarget } from "@/workspace/workspace-subject";
import type { NoteDataFor } from "../../../../note/data";
import type { ReadingDefaultRenderer } from "../../../renderer";
import { ConstituentsLine } from "./constituents-line";
import { MorphemesLine } from "./morphemes-line";
import { SourceLine } from "./source-line";

type Follow = (target: WorkspaceTarget) => void;

type ReadingNoteData = NoteDataFor<"Reading">;

function ReadingBreakdown({
	breakdown,
	sourceLinks,
	readingId,
	family,
	follow,
}: {
	readonly breakdown: ReadingNoteData["breakdown"];
	readonly sourceLinks: NonNullable<ReadingNoteData["sourceLinks"]>;
	readonly readingId: string;
	readonly family: string;
	readonly follow: Follow;
}) {
	const constituents = breakdown?.constituents;
	const morphemes = breakdown?.morphemes;
	if (!constituents && !morphemes && sourceLinks.length === 0) return null;
	return (
		<NoteSection aria-label="Breakdown" label="Breakdown">
			<div className="grid gap-1.5">
				{constituents ? (
					<ConstituentsLine
						pieces={constituents}
						ownerFamily={family}
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
					<MorphemesLine
						owner={readingId}
						pieces={morphemes}
						follow={follow}
					/>
				) : null}
			</div>
		</NoteSection>
	);
}

/**
 * What a Reading is built from (ADR 0050, ADR 0051): its Constituents one
 * level down, its morphemes under the school marks, and the Source an
 * unsegmentable formation names instead of Constituents. Each piece opens
 * the Note of the unit it links to.
 */
export const renderDefaultReadingBreakdown = (({
	noteData,
	PresentationCapabilities,
}) => (
	<ReadingBreakdown
		breakdown={noteData.breakdown}
		sourceLinks={noteData.sourceLinks ?? []}
		readingId={noteData.reading.readingId}
		family={noteData.reading.lemma.family}
		follow={PresentationCapabilities.follow}
	/>
)) satisfies ReadingDefaultRenderer;
