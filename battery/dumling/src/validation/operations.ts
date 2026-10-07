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
			: (value) => ({ value: operation.implementation(value as string) }),
	]),
);
