import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import {
	FeatureBagKind,
	featureBagSchema,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

export const DeAdjectiveFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: DE_FEATURE_SCHEMA.abbr,
		foreign: DE_FEATURE_SCHEMA.foreign,
		numType: DE_FEATURE_SCHEMA.numType.extract(["Card", "Ord"]),
		variant: DE_FEATURE_SCHEMA.variant,
	}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			case: DE_FEATURE_SCHEMA.case.extract(["Acc", "Dat", "Gen", "Nom"]),
			degree: DE_FEATURE_SCHEMA.degree.extract(["Cmp", "Pos", "Sup"]),
			gender: DE_FEATURE_SCHEMA.gender.extract(["Fem", "Masc", "Neut"]),
			number: DE_FEATURE_SCHEMA.number.extract(["Plur", "Sing"]),
		}),
	),
});

export type DeAdjectiveFeatureBags = z.infer<
	typeof DeAdjectiveFeatureBagsSchema
>;

type _DeAdjectiveFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeAdjectiveFeatureBags>
>;
