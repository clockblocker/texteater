import type { SupportedLanguage } from "dumling/types";
import type { DumdictService } from "../public";
import type { CreateDumdictServiceOptions } from "../storage";
import { createDumdictServiceImplementation } from "./create-dumdict-service-implementation";
import { createFullSliceValidation } from "./full-slice-validation";

export function createDumdictService<L extends SupportedLanguage>(
	options: CreateDumdictServiceOptions<L>,
): DumdictService<L> {
	return createDumdictServiceImplementation({
		...options,
		sliceValidation: createFullSliceValidation(options.language),
	});
}
