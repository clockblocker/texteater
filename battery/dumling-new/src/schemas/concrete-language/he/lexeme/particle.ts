import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const HeParticleFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type HeParticleFeatureBags = z.infer<typeof HeParticleFeatureBagsSchema>;

type _HeParticleFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeParticleFeatureBags>
>;
