import { z } from "zod";
import type { EnNounFeatures } from "../../../../../types/concrete-language/features/en/lexeme/noun.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildOptionalFeatureObjectSchema,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers.js";

export const enNounFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({
		abbr: abstractFeatureAtomSchemas.abbr,
		extPos: abstractFeatureAtomSchemas.extPos.extract(["ADV", "PROPN"]),
		foreign: abstractFeatureAtomSchemas.foreign,
		numForm: abstractFeatureAtomSchemas.numForm.extract([
			"Combi",
			"Digit",
			"Word",
		]),
		numType: abstractFeatureAtomSchemas.numType.extract([
			"Card",
			"Frac",
			"Ord",
		]),
		style: abstractFeatureAtomSchemas.style.extract(["Expr", "Vrnc"]),
	}),
	inflectional: requireNonEmptyFeatureObject(
		buildOptionalFeatureObjectSchema({
			number: abstractFeatureAtomSchemas.number.extract([
				"Plur",
				"Ptan",
				"Sing",
			]),
		}),
	),
}) satisfies z.ZodSchema<EnNounFeatures>;
