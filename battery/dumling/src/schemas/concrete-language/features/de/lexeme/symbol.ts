import { z } from "zod";
import type { DeSymbolFeatures } from "../../../../../types/concrete-language/features/de/lexeme/symbol.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildOptionalFeatureObjectSchema,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers.js";

export const deSymbolFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({
		foreign: abstractFeatureAtomSchemas.foreign,
		numType: abstractFeatureAtomSchemas.numType.extract(["Card", "Range"]),
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
			number: abstractFeatureAtomSchemas.number.extract(["Plur", "Sing"]),
		}),
	),
}) satisfies z.ZodSchema<DeSymbolFeatures>;
