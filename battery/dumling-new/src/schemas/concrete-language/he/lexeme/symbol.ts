import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const HeSymbolFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type HeSymbolFeatureBags = z.infer<typeof HeSymbolFeatureBagsSchema>;

type _HeSymbolFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeSymbolFeatureBags>
>;
