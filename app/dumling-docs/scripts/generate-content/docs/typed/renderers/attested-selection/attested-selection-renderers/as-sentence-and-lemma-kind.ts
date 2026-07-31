import type { AttestedSelection } from "dumling/types";
import {
	asSingleLineSentence,
	hrefForAttestedSelection,
} from "../helpers/attested-selection";
import type { AttestedSelectionRenderer } from "../types";

export const asSentenceAndLemmaKind: AttestedSelectionRenderer = (
	attestedSelection: AttestedSelection,
): string =>
	`- ${JSON.stringify(asSingleLineSentence(attestedSelection.sentenceMarkdown))} -> [${attestedSelection.selection.surface.lemma.kind}](${hrefForAttestedSelection(attestedSelection)})`;
