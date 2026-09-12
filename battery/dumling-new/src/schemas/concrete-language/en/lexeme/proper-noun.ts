import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import {
	FeatureBagKind,
	featureBagSchema,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";

export const EnProperNounFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: EN_FEATURE_SCHEMA.abbr,
		extPos: EN_FEATURE_SCHEMA.extPos.extract(["PROPN"]),
		style: EN_FEATURE_SCHEMA.style.extract(["Expr"]),
	}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			number: EN_FEATURE_SCHEMA.number.extract(["Plur", "Ptan", "Sing"]),
		}),
	),
});

export type EnProperNounFeatureBags = z.infer<
	typeof EnProperNounFeatureBagsSchema
>;

type _EnProperNounFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnProperNounFeatureBags>
>;
