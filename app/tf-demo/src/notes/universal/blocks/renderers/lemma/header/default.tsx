import { NoteTitle, NoteTitleRow } from "lego";

import type { GrammaticalDefaultRenderer } from "../../../renderer";
import { genderTone } from "../../common/features";

/**
 * A Lemma collects Readings. It takes the gender tone of its headword but
 * no emoji: each Reading below brings its own.
 */
export const renderDefaultLemmaHeader = (({ noteData }) => {
	const { presented } = noteData;
	const readings = noteData.connections.readings.length;
	return (
		<header>
			<NoteTitleRow>
				<NoteTitle
					data-lemma-title=""
					tone={genderTone(presented.coreFeatures)}
				>
					{presented.canonicalForm}
				</NoteTitle>
				{readings > 1 ? (
					<span className="text-sm text-ink-muted">
						{readings} readings
					</span>
				) : null}
			</NoteTitleRow>
		</header>
	);
}) satisfies GrammaticalDefaultRenderer<"Lemma">;
