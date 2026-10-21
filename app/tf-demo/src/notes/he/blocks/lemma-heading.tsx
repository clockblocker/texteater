import { NoteTitle } from "lego";
import type { GrammaticalDefaultRenderer } from "../../universal/blocks/renderer";
import { genderTone } from "../../universal/blocks/renderers/common/feature-values";
import { lemmaCaption } from "../../universal/caption/caption";
import { CaptionedHeading } from "../../universal/caption/heading-caption";
import { UI_LANGUAGE } from "../../universal/caption/wording";

export const renderHebrewLemmaHeading = (({
	noteData,
	PresentationCapabilities,
}) => (
	<CaptionedHeading
		presentation={PresentationCapabilities.presentation}
		title={
			<NoteTitle
				data-lemma-title=""
				tone={genderTone(noteData.presented)}
			>
				<bdi lang="he" dir="rtl">
					{noteData.presented.canonicalForm}
				</bdi>
			</NoteTitle>
		}
		caption={lemmaCaption(
			noteData.connections.readings,
			PresentationCapabilities.activeReadingId,
			{ ui: UI_LANGUAGE, target: "he" },
		)}
	/>
)) satisfies GrammaticalDefaultRenderer<"Lemma">;
