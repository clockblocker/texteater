import { z } from "zod";
import type { DeOtherFeatures } from "../../../../../types/concrete-language/features/de/lexeme/other.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildOptionalFeatureObjectSchema,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers.js";

export const deOtherFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({
		abbr: abstractFeatureAtomSchemas.abbr,
		foreign: abstractFeatureAtomSchemas.foreign,
		hyph: abstractFeatureAtomSchemas.hyph,
		numType: abstractFeatureAtomSchemas.numType.extract([
			"Card",
			"Mult",
			"Range",
		]),
	}),
	inflectional: requireNonEmptyFeatureObject(
		buildOptionalFeatureObjectSchema({
			case: abstractFeatureAtomSchemas.case.extract([
				"Acc",
				"Dat",
				"Gen",
				"Nom",
			]),
			gender: abstractFeatureAtomSchemas.gender.extract([
				"Fem",
				"Masc",
				"Neut",
			]),
			mood: abstractFeatureAtomSchemas.mood.extract([
				"Imp",
				"Ind",
				"Sub",
			]),
			number: abstractFeatureAtomSchemas.number.extract(["Plur", "Sing"]),
			verbForm: abstractFeatureAtomSchemas.verbForm.extract([
				"Fin",
				"Inf",
				"Part",
			]),
		}),
	),
}) satisfies z.ZodSchema<DeOtherFeatures>;
