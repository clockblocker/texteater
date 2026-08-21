import { z } from "zod";
import type { HeAuxiliaryFeatures } from "../../../../../types/concrete-language/features/he/lexeme/auxiliary.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildOptionalFeatureObjectSchema,
	featureValueSet,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers.js";

export const heAuxiliaryFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({
		verbType: abstractFeatureAtomSchemas.verbType.extract(["Cop", "Mod"]),
	}),
	inflectional: requireNonEmptyFeatureObject(
		buildOptionalFeatureObjectSchema({
			gender: featureValueSet(
				abstractFeatureAtomSchemas.gender.extract(["Fem", "Masc"]),
			),
			number: abstractFeatureAtomSchemas.number.extract(["Plur", "Sing"]),
			person: featureValueSet(
				abstractFeatureAtomSchemas.person.extract(["1", "2", "3"]),
			),
			polarity: abstractFeatureAtomSchemas.polarity.extract([
				"Neg",
				"Pos",
			]),
			tense: abstractFeatureAtomSchemas.tense.extract(["Fut", "Past"]),
			verbForm: abstractFeatureAtomSchemas.verbForm.extract([
				"Inf",
				"Part",
			]),
		}),
	),
}) satisfies z.ZodSchema<HeAuxiliaryFeatures>;
