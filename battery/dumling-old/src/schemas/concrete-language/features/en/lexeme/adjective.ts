import { z } from "zod";
import type { EnAdjectiveFeatures } from "../../../../../types/concrete-language/features/en/lexeme/adjective.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildOptionalFeatureObjectSchema,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers.js";

export const enAdjectiveFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({
		abbr: abstractFeatureAtomSchemas.abbr,
		extPos: abstractFeatureAtomSchemas.extPos.extract([
			"ADP",
			"ADV",
			"SCONJ",
		]),
		numForm: abstractFeatureAtomSchemas.numForm.extract(["Combi", "Word"]),
		numType: abstractFeatureAtomSchemas.numType.extract(["Frac", "Ord"]),
		style: abstractFeatureAtomSchemas.style.extract(["Expr"]),
	}),
	inflectional: requireNonEmptyFeatureObject(
		buildOptionalFeatureObjectSchema({
			degree: abstractFeatureAtomSchemas.degree.extract([
				"Cmp",
				"Pos",
				"Sup",
			]),
		}),
	),
}) satisfies z.ZodSchema<EnAdjectiveFeatures>;
