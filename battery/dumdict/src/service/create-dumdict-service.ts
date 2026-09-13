import type * as Dumling from "dumling/types";

import type { DumdictService } from "../public";
import type { CreateDumdictServiceOptions } from "../storage";
import { createDumdictServiceImplementation } from "./create-dumdict-service-implementation";
import { createFullSliceValidation } from "./full-slice-validation";

export function createDumdictService<L extends Dumling.Language>(
	options: CreateDumdictServiceOptions<L>,
): DumdictService<L> {
	return createDumdictServiceImplementation({
		...options,
		sliceValidation: createFullSliceValidation(options.language),
	});
}
