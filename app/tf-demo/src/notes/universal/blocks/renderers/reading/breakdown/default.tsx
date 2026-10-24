import { NoteSection } from "lego";

import type { WorkspaceTarget } from "@/workspace/workspace-subject";
import type { NoteDataFor } from "../../../../note/data";
import type { ReadingDefaultRenderer } from "../../../renderer";
import { useBreakdownDisplay } from "../../common/breakdown-display";
import { FormationsSection } from "../../common/formations";
import { ConstituentsLine } from "./constituents-line";
import { MorphemesLine } from "./morphemes-line";
import { SourceLine } from "./source-line";

type Follow = (target: WorkspaceTarget) => void;

/**
 * The Lemma's Formations on its Reading Note too, when the Breakdowns
 * prototype asks for them (#1241): right under the Breakdown, so what the
 * word is built from and what is built on it sit together.
 */
function ReadingFormations({
	lemmaId,
	follow,
}: {
	readonly lemmaId: string;
	readonly follow: Follow;
}) {
	const display = useBreakdownDisplay();
	if (display.formations !== "AlsoReadings") return null;
	const formations = display.formationsOfLemma?.(lemmaId);
	return formations ? (
		<FormationsSection formations={formations} follow={follow} />
	) : null;
}

type ReadingNoteData = NoteDataFor<"Reading">;

function ReadingBreakdown({
	breakdown,
	sourceLinks,
	readingId,
	lemmaId,
	family,
	follow,
}: {
	readonly breakdown: ReadingNoteData["breakdown"];
	readonly sourceLinks: NonNullable<ReadingNoteData["sourceLinks"]>;
	readonly readingId: string;
	readonly lemmaId: string;
	readonly family: string;
	readonly follow: Follow;
}) {
	const constituents = breakdown?.constituents;
	const morphemes = breakdown?.morphemes;
	const formations = <ReadingFormations lemmaId={lemmaId} follow={follow} />;
	if (!constituents && !morphemes && sourceLinks.length === 0)
		return formations;
	return (
		<>
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
			{formations}
		</>
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
		lemmaId={noteData.reading.lemma.lemmaId}
		family={noteData.reading.lemma.family}
		follow={PresentationCapabilities.follow}
	/>
)) satisfies ReadingDefaultRenderer;
