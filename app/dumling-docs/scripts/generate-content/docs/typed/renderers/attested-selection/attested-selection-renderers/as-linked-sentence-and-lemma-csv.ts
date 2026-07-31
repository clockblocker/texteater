import { getLanguageApi } from "dumling";
import type { AttestedSelection } from "dumling/types";
import { withLinkedSelectionSpan } from "../helpers/attested-selection";
import type { AttestedSelectionRenderer } from "../types";

export const asLinkedSentenceAndLemmaCsv: AttestedSelectionRenderer = (
	attestedSelection: AttestedSelection,
): string => {
	const selection = attestedSelection.selection;
	const languageApi = getLanguageApi(selection.surface.lemma.language);
	const entryCsvId = String(
		languageApi.id.encode.asCsv(selection.surface.lemma),
	);

	return `- ${JSON.stringify(withLinkedSelectionSpan(attestedSelection))} -> ${entryCsvId}`;
};
