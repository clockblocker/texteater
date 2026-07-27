import { z } from "zod/v3";
import type { EnAdverbFeatures } from "../../../../../types/concrete-language/features/en/lexeme/adverb";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import {
	buildOptionalFeatureObjectSchema,
	featureValueSet,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers";

export const enAdverbFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			abbr: abstractFeatureAtomSchemas.abbr,
			extPos: abstractFeatureAtomSchemas.extPos.extract([
				"ADP",
				"ADV",
				"CCONJ",
				"SCONJ",
			]),
			numForm: abstractFeatureAtomSchemas.numForm.extract(["Word"]),
			numType: abstractFeatureAtomSchemas.numType.extract([
				"Frac",
				"Mult",
				"Ord",
			]),
			pronType: featureValueSet(
				abstractFeatureAtomSchemas.pronType.extract([
					"Dem",
					"Ind",
					"Int",
					"Neg",
					"Rel",
					"Tot",
				]),
			),
			style: abstractFeatureAtomSchemas.style.extract(["Expr", "Slng"]),
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
	})
	.strict() satisfies z.ZodSchema<EnAdverbFeatures>;
