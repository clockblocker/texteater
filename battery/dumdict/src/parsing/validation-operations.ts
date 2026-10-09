import type { ValidationOperations } from "common-utils/validation";
import { validationOperations } from "dumling/validation";
import {
	dumdictNamedValidationErrors,
	dumdictNamedValidationNames,
	dumdictNamedValidationPredicates,
} from "../validation-semantics.js";

export const dumdictValidationOperations: ValidationOperations = {
	...validationOperations,
	...Object.fromEntries(
		dumdictNamedValidationNames.map((name) => {
			const predicate = dumdictNamedValidationPredicates[name];
			return [
				name,
				(value: unknown) => ({
					value,
					issues: predicate(value)
						? []
						: [
								{
									code: "custom",
									path: [],
									message:
										dumdictNamedValidationErrors[name](),
								},
							],
				}),
			];
		}),
	),
	...Object.fromEntries(
		[
			"dumdict.pending-entry-id.de",
			"dumdict.pending-entry-id.en",
			"dumdict.pending-entry-id.he",
			"dumdict.retain-commit-request",
			"dumdict.retain-plan",
		].map((name) => [name, (value: unknown) => ({ value })]),
	),
};
