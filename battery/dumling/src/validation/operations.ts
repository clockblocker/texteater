import type {
	ValidationOperation,
	ValidationOperations,
} from "common-utils/validation";
import { operationTable } from "./operation-table.js";

function check(
	predicate: (value: never) => boolean,
	error: () => string,
): ValidationOperation {
	return (value) =>
		// The compiled validator runs an operation only on a value whose
		// structure its rule has already accepted, the fields the predicate names.
		predicate(value as never)
			? { value }
			: {
					value,
					issues: [{ code: "custom", path: [], message: error() }],
				};
}
/** A `custom` entry reports its error when its predicate fails; an `overwrite` entry maps the value. */
export const validationOperations: ValidationOperations = Object.fromEntries(
	operationTable.map((operation): [string, ValidationOperation] => [
		operation.name,
		operation.construct === "custom"
			? check(operation.implementation, operation.error)
			: // An overwrite runs only on a value its rule has accepted as a string.
				(value) => ({
					value: operation.implementation(value as string),
				}),
	]),
);
