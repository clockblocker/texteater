import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";

export const EnAdpositionFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: EN_FEATURE_SCHEMA.abbr,
		extPos: EN_FEATURE_SCHEMA.extPos.extract(["ADP", "ADV", "SCONJ"]),
	}),
});

export type EnAdpositionFeatureBags = z.infer<
	typeof EnAdpositionFeatureBagsSchema
>;

type _EnAdpositionFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnAdpositionFeatureBags>
>;
