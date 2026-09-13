import type { ValidationOperations } from "common-utils";
import { validationOperations } from "dumling/validation";
import {
	dumdictNamedValidationErrors,
	dumdictNamedValidationPredicates,
} from "../validation-semantics.js";

export const dumdictValidationOperations: ValidationOperations = {
	...validationOperations,
	"dumrel.normalize-text": (value) => ({
		value: (value as string).trim().normalize("NFC"),
	}),
	...Object.fromEntries(
		Object.entries(dumdictNamedValidationPredicates).map(
			([name, predicate]) => [
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
										dumdictNamedValidationErrors[
											name as keyof typeof dumdictNamedValidationErrors
										](),
								},
							],
				}),
			],
		),
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
