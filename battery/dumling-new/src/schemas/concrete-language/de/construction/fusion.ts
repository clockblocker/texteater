import type { Assert } from "common-utils";
import { z } from "zod";
import {
	FeatureBagKind,
	type IsUniversalFeatureBags,
} from "../../../universal/index.js";

const EmptyFeatureBagSchema = z.strictObject({}) as z.ZodType<
	Record<never, never>
>;

export const DeConstructionFusionFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: EmptyFeatureBagSchema,
	[FeatureBagKind.Inflectional]: EmptyFeatureBagSchema,
});

export type DeConstructionFusionFeatureBags = z.infer<
	typeof DeConstructionFusionFeatureBagsSchema
>;

type _DeConstructionFusionFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeConstructionFusionFeatureBags>
>;
