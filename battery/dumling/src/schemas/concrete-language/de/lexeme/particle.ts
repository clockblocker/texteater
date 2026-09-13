import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

export const DeParticleFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: DE_FEATURE_SCHEMA.abbr,
		foreign: DE_FEATURE_SCHEMA.foreign,
		partType: DE_FEATURE_SCHEMA.partType.extract(["Inf"]),
		polarity: DE_FEATURE_SCHEMA.polarity.extract(["Neg", "Pos"]),
	}),
});

export type DeParticleFeatureBags = z.infer<typeof DeParticleFeatureBagsSchema>;

type _DeParticleFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeParticleFeatureBags>
>;
