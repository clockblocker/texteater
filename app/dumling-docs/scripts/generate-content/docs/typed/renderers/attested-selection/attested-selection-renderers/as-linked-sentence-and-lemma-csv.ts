import { getLanguageApi } from "dumling";
import type { AttestedSelection } from "dumling/types";
import {
	withLinkedSelectionSpan,
} from "../helpers/attested-selection";
import type { AttestedSelectionRenderer } from "../types";

export const asLinkedSentenceAndLemmaCsv: AttestedSelectionRenderer = (
	attestedSelection: AttestedSelection,
): string => {
	const selection = attestedSelection.selection;
	const languageApi = getLanguageApi(selection.language);
	const lemmaCsvId = String(languageApi.id.encode.asCsv(selection.surface.lemma));

	return `- ${JSON.stringify(withLinkedSelectionSpan(attestedSelection))} -> ${lemmaCsvId}`;
};
