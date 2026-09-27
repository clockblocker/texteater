import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

// An invariant Locution: its spelling is its Grundform (ADR 0039).
export const HeAdverbLocutionFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type HeAdverbLocutionFeatureBags = z.infer<
	typeof HeAdverbLocutionFeatureBagsSchema
>;

type _HeAdverbLocutionFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeAdverbLocutionFeatureBags>
>;
