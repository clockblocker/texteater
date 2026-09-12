import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import {
	FeatureBagKind,
	featureBagSchema,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

export const DeNumeralFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: DE_FEATURE_SCHEMA.abbr,
		foreign: DE_FEATURE_SCHEMA.foreign,
		numType: DE_FEATURE_SCHEMA.numType.extract([
			"Card",
			"Frac",
			"Mult",
			"Range",
		]),
	}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			case: DE_FEATURE_SCHEMA.case.extract(["Acc", "Dat", "Gen", "Nom"]),
			gender: DE_FEATURE_SCHEMA.gender.extract(["Fem", "Masc", "Neut"]),
			number: DE_FEATURE_SCHEMA.number.extract(["Plur", "Sing"]),
		}),
	),
});

export type DeNumeralFeatureBags = z.infer<typeof DeNumeralFeatureBagsSchema>;

type _DeNumeralFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeNumeralFeatureBags>
>;
