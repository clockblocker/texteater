import type { SupportedLanguage } from "./dumling";
import type { DumdictService } from "./public";
import { createDumdictServiceImplementation } from "./service/create-dumdict-service-implementation";
import type { DumdictSliceValidation } from "./service/runtime-options";
import type { CreateDumdictServiceOptions } from "./storage";

export { applyDumdictKnowledgeChange } from "./core/apply-reading-knowledge-change";
export { makeSurfaceId } from "./dumling";

const trustStorageBoundary = () => undefined;

/**
 * Builds Dumdict for an internal storage adapter that already validates every
 * decoded row. External adapters should use createDumdictService instead.
 */
export function createDumdictServiceForTrustedStorage<
	L extends SupportedLanguage,
>(options: CreateDumdictServiceOptions<L>): DumdictService<L> {
	const sliceValidation: DumdictSliceValidation<L> = {
		storedReadings: trustStorageBoundary,
		readingPatch: trustStorageBoundary,
		newNote: trustStorageBoundary,
		relationsCleanupInfo: trustStorageBoundary,
		cleanupRelations: trustStorageBoundary,
		plan: (value) => value as ReturnType<DumdictSliceValidation<L>["plan"]>,
		commitRequest: (value) =>
			value as ReturnType<DumdictSliceValidation<L>["commitRequest"]>,
		commitResult: (value) =>
			value as ReturnType<DumdictSliceValidation<L>["commitResult"]>,
	};
	return createDumdictServiceImplementation({
		...options,
		sliceValidation,
	});
}
