import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import {
	FeatureBagKind,
	featureBagSchema,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";

export const EnNounFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: EN_FEATURE_SCHEMA.abbr,
		extPos: EN_FEATURE_SCHEMA.extPos.extract(["ADV", "PROPN"]),
		foreign: EN_FEATURE_SCHEMA.foreign,
		numForm: EN_FEATURE_SCHEMA.numForm.extract(["Combi", "Digit", "Word"]),
		numType: EN_FEATURE_SCHEMA.numType.extract(["Card", "Frac", "Ord"]),
		style: EN_FEATURE_SCHEMA.style.extract(["Expr", "Vrnc"]),
	}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			number: EN_FEATURE_SCHEMA.number.extract(["Plur", "Ptan", "Sing"]),
		}),
	),
});

export type EnNounFeatureBags = z.infer<typeof EnNounFeatureBagsSchema>;

type _EnNounFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnNounFeatureBags>
>;
