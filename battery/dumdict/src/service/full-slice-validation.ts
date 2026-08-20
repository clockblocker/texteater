import type { SupportedLanguage } from "dumling/types";
import {
	validateCleanupRelationsSlice,
	validateNewNoteSlice,
	validateReadingPatchSlice,
	validateRelationsCleanupInfoSlice,
	validateStoredReadingsSlice,
} from "../core/validate-slice";
import { commitChangesResultSchema, getDumdictSchemasFor } from "../schema";
import type { DumdictSliceValidation } from "./runtime-options";

export function createFullSliceValidation<L extends SupportedLanguage>(
	language: L,
): DumdictSliceValidation<L> {
	const schemas = getDumdictSchemasFor(language);
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
			schemas.dumdictPlanSchema.parse(value) as unknown as ReturnType<
				DumdictSliceValidation<L>["plan"]
			>,
		commitRequest: (value) =>
			schemas.commitChangesRequestSchema.parse(value),
		commitResult: (value) => commitChangesResultSchema.parse(value),
	};
}
