import type { ExternalOutputTypes } from "dumval/compiler";
import { encodedValidation } from "../src/generated/validation.js";

/** Dumling operations whose output has the same structural type as their input. */
export const dumlingTypePreservingOperations = [
	"dumling.feature-bag.marked",
	"dumling.de-pronoun.core",
	"dumling.syncretism.view",
	"dumling.syncretism.lemma",
	"dumling.de-determiner.core",
	"dumling.de-particle.core",
	"dumling.emoji-description",
	"dumling.saying.canonical-form",
	"dumling.normalize-form",
	"dumling.normalize-emoji-description",
];

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
