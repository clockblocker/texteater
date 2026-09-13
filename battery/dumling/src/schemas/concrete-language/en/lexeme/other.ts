import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";

export const EnOtherFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		extPos: EN_FEATURE_SCHEMA.extPos.extract(["PROPN"]),
		foreign: EN_FEATURE_SCHEMA.foreign,
	}),
});

export type EnOtherFeatureBags = z.infer<typeof EnOtherFeatureBagsSchema>;

type _EnOtherFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnOtherFeatureBags>
>;
