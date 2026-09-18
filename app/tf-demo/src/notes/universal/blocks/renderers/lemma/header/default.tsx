import { NoteTitle, NoteTitleRow } from "lego";

import type { GrammaticalDefaultRenderer } from "../../../renderer";
import { NounArticle } from "../../common/noun-article";
import { genderTone } from "../../common/feature-values";

/**
 * A Lemma collects Readings. It takes the gender tone of its headword but
 * no emoji: each Reading below brings its own.
 */
export const renderDefaultLemmaHeader = (({ noteData, PresentationCapabilities }) => {
	const { presented } = noteData;
	const readings = noteData.connections.readings.length;
	return (
		<header>
			<NoteTitleRow>
				<NoteTitle
					data-lemma-title=""
					tone={genderTone(presented)}
				>
					<NounArticle lemma={presented} lemmaId={noteData.target.lemmaId} navigation={PresentationCapabilities.nounArticle} />
					{presented.canonicalForm}
				</NoteTitle>
				{readings > 1 ? (
					<span className="text-sm text-ink-muted">
						{readings} readings
					</span>
				) : null}
			</NoteTitleRow>
			{PresentationCapabilities.nounArticle?.error ? <p role="alert" className="text-sm text-destructive">{PresentationCapabilities.nounArticle.error}</p> : null}
		</header>
	);
}) satisfies GrammaticalDefaultRenderer<"Lemma">;
