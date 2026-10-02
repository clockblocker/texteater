import type { ExternalOutputTypes } from "dumval/compiler";
import { encodedValidation } from "../src/generated/validation.js";
import { registrations } from "./operations.js";

/**
 * Every Dumling operation keeps its input's structural type: a `custom`
 * refinement returns its input, and each `overwrite` maps a string to a string.
 */
export const dumlingTypePreservingOperations = registrations.map(
	({ name }) => name,
);

/** Lets a dependent package's generated types name Dumling units instead of copying them. */
export function dumlingOutputTypes(): ExternalOutputTypes {
	const artifact = JSON.parse(encodedValidation);
	return {
		import: 'import type * as Dumling from "dumling/types";',
		artifact,
		types: Object.fromEntries(
			Object.keys(artifact.roots).map((key) => {
				const [unit, language, family, kind] = key.split("/");
				return [
					key,
					`Dumling.${unit}<"${language}", "${family}", "${kind}">`,
				];
			}),
		),
		typePreservingOperations: dumlingTypePreservingOperations,
	};
}
