import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

// An invariant Locution: its spelling is its Grundform (ADR 0039).
export const HeInterjectionLocutionFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type HeInterjectionLocutionFeatureBags = z.infer<
	typeof HeInterjectionLocutionFeatureBagsSchema
>;

type _HeInterjectionLocutionFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeInterjectionLocutionFeatureBags>
>;
