import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { DeVerbalInflectionalFeatureBagSchema } from "../de-feature-catalog.js";

// A VERB Locution inflects like a verb: Er hat den Faden verloren (ADR 0039).
// Its fixed words, a reflexive or particle included, are its wording, so it
// has no Core Features.
export const DeVerbLocutionFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: DeVerbalInflectionalFeatureBagSchema,
});

export type DeVerbLocutionFeatureBags = z.infer<
	typeof DeVerbLocutionFeatureBagsSchema
>;

type _DeVerbLocutionFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeVerbLocutionFeatureBags>
>;
