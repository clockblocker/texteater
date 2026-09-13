import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const HeRootMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type HeRootMorphemeFeatureBags = z.infer<
	typeof HeRootMorphemeFeatureBagsSchema
>;

type _HeRootMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeRootMorphemeFeatureBags>
>;
