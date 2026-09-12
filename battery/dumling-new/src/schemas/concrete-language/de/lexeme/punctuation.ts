import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

export const DePunctuationFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		punctType: DE_FEATURE_SCHEMA.punctType,
	}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type DePunctuationFeatureBags = z.infer<
	typeof DePunctuationFeatureBagsSchema
>;

type _DePunctuationFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DePunctuationFeatureBags>
>;
