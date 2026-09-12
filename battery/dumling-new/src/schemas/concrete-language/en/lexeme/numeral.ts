import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";

export const EnNumeralFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: EN_FEATURE_SCHEMA.abbr,
		extPos: EN_FEATURE_SCHEMA.extPos.extract(["PROPN"]),
		numForm: EN_FEATURE_SCHEMA.numForm.extract(["Digit", "Roman", "Word"]),
		numType: EN_FEATURE_SCHEMA.numType.extract(["Card", "Frac"]),
	}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type EnNumeralFeatureBags = z.infer<typeof EnNumeralFeatureBagsSchema>;

type _EnNumeralFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnNumeralFeatureBags>
>;
