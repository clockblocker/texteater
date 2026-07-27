import type { AttestedSelection } from "../../../../../../../../src/types/public-types.ts";
import {
	asSingleLineSentence,
	hrefForAttestedSelection,
} from "../helpers/attested-selection";
import type { AttestedSelectionRenderer } from "../types";

export const asSentenceAndLemmaSubKind: AttestedSelectionRenderer = (
	attestedSelection: AttestedSelection,
): string =>
	`- ${JSON.stringify(asSingleLineSentence(attestedSelection.sentenceMarkdown))} -> [${attestedSelection.selection.surface.lemma.lemmaSubKind}](${hrefForAttestedSelection(attestedSelection)})`;
