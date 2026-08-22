import type { SupportedLanguage } from "dumling/types";
import {
	validateCleanupRelationsSlice,
	validateNewNoteSlice,
	validateReadingPatchSlice,
	validateRelationsCleanupInfoSlice,
	validateStoredReadingsSlice,
} from "../core/validate-slice";
import {
	parseAsCommitChangesRequest,
	parseAsCommitChangesResult,
	parseAsDumdictPlan,
	unwrapDumdictParse,
} from "../parsing/lightweight-parsers";
import type { DumdictSliceValidation } from "./runtime-options";

export function createFullSliceValidation<L extends SupportedLanguage>(
	language: L,
): DumdictSliceValidation<L> {
	return {
		storedReadings: (slice, requestedLemma) =>
			validateStoredReadingsSlice(language, slice, requestedLemma),
		readingPatch: (slice, requestedReading) =>
			validateReadingPatchSlice(language, slice, requestedReading),
		newNote: (slice, draft) => validateNewNoteSlice(language, slice, draft),
		relationsCleanupInfo: (slice, requestedCanonicalForm) =>
			validateRelationsCleanupInfoSlice(
				language,
				slice,
				requestedCanonicalForm,
			),
		cleanupRelations: (slice) =>
			validateCleanupRelationsSlice(language, slice),
		plan: (value) =>
			unwrapDumdictParse(parseAsDumdictPlan(value, language)),
		commitRequest: (value) =>
			unwrapDumdictParse(parseAsCommitChangesRequest(value, language)),
		commitResult: (value) =>
			unwrapDumdictParse(parseAsCommitChangesResult(value)),
	};
}
