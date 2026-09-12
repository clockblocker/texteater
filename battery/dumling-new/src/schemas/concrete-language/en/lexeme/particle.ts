import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";

export const EnParticleFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: EN_FEATURE_SCHEMA.abbr,
		extPos: EN_FEATURE_SCHEMA.extPos.extract(["CCONJ"]),
		polarity: EN_FEATURE_SCHEMA.polarity.extract(["Neg"]),
	}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type EnParticleFeatureBags = z.infer<typeof EnParticleFeatureBagsSchema>;

type _EnParticleFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnParticleFeatureBags>
>;
