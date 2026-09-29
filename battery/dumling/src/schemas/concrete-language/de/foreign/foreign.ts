import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind } from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

// A Foreign unit's only Core Feature is the language it comes from, always
// set. It never inflects: its one Surface is its Canonical Form (ADR 0045).
export const DeForeignFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: z.strictObject({
		sourceLang: DE_FEATURE_SCHEMA.sourceLang,
	}),
});

export type DeForeignFeatureBags = z.infer<typeof DeForeignFeatureBagsSchema>;

type _DeForeignFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeForeignFeatureBags>
>;
