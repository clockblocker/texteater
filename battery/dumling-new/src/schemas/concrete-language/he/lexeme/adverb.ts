import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { HE_FEATURE_SCHEMA } from "../he-feature-catalog.js";

export const HeAdverbFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		prefix: HE_FEATURE_SCHEMA.prefix,
	}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type HeAdverbFeatureBags = z.infer<typeof HeAdverbFeatureBagsSchema>;

type _HeAdverbFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeAdverbFeatureBags>
>;
