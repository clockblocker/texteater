import type { SupportedLanguage } from "./dumling";
import type { DumdictService } from "./public";
import { createDumdictServiceImplementation } from "./service/create-dumdict-service-implementation";
import { createFullSliceValidation } from "./service/full-slice-validation";
import type { CreateDumdictServiceOptions } from "./storage";

export { applyDumdictKnowledgeChange } from "./core/apply-reading-knowledge-change";
export { makeSurfaceId } from "./dumling";

/**
 * Builds a fully validating Dumdict service from the lightweight runtime
 * entrypoint used by hosts that keep large generation dependencies separate.
 */
export function createDumdictServiceForTrustedStorage<
	L extends SupportedLanguage,
>(options: CreateDumdictServiceOptions<L>): DumdictService<L> {
	return createDumdictServiceImplementation({
		...options,
		sliceValidation: createFullSliceValidation(options.language),
	});
}
