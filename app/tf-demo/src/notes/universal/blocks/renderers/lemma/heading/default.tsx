import { NoteTitle } from "lego";

import { lemmaCaption } from "../../../../caption/caption";
import {
	CaptionedHeading,
	captionLanguages,
} from "../../../../caption/heading-caption";
import type { GrammaticalDefaultRenderer } from "../../../renderer";
import { genderTone } from "../../common/feature-values";

/**
 * A Lemma collects Readings. It takes the gender tone of its headword but
 * no emoji: its caption lists each Reading's, marking the one the Deck
 * that dealt it leads to.
 */
export const renderDefaultLemmaHeading = (({
	noteData,
	PresentationCapabilities,
}) => {
	const { presented } = noteData;
	const languages = captionLanguages(presented.language);
	return (
		<CaptionedHeading
			title={
				<NoteTitle data-lemma-title="" tone={genderTone(presented)}>
					<bdi>{presented.canonicalForm}</bdi>
				</NoteTitle>
			}
			caption={
				languages &&
				lemmaCaption(
					noteData.connections.readings,
					PresentationCapabilities.activeReadingId,
					languages,
				)
			}
		/>
	);
}) satisfies GrammaticalDefaultRenderer<"Lemma">;
