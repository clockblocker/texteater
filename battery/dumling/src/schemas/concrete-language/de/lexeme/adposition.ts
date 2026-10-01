import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

// Where an adposition stands is not identity: preposed and postposed `wegen`
// are one Lemma, and dumspec's ADP Case Table lists the positions each takes
// (ADR 0032). A circumposition is a Locution ADP (ADR 0039).
export const DeAdpositionFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: DE_FEATURE_SCHEMA.abbr,
	}),
});

export type DeAdpositionFeatureBags = z.infer<
	typeof DeAdpositionFeatureBagsSchema
>;

type _DeAdpositionFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeAdpositionFeatureBags>
>;
