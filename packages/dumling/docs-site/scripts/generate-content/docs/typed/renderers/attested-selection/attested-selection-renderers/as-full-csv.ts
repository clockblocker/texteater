import type { AttestedSelection } from "../../../../../../../../src/types/public-types.ts";
import { selectionLogbookCsvRow } from "../../../../../attestations/selection/logbook.ts";
import type { AttestedSelectionRenderer } from "../types";

export const asFullCsv: AttestedSelectionRenderer = (
	attestedSelection: AttestedSelection,
): string =>
	selectionLogbookCsvRow({
		classifierNotes: attestedSelection.classifierNotes,
		classificationMistakes: attestedSelection.classificationMistakes,
		entity: attestedSelection.selection,
		isVerified: attestedSelection.isVerified,
		sentenceMarkdown: attestedSelection.sentenceMarkdown,
	});
