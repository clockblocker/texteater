import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";

export const EnInterjectionFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: EN_FEATURE_SCHEMA.abbr,
		foreign: EN_FEATURE_SCHEMA.foreign,
		polarity: EN_FEATURE_SCHEMA.polarity.extract(["Neg", "Pos"]),
		style: EN_FEATURE_SCHEMA.style.extract(["Expr"]),
	}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type EnInterjectionFeatureBags = z.infer<
	typeof EnInterjectionFeatureBagsSchema
>;

type _EnInterjectionFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnInterjectionFeatureBags>
>;
