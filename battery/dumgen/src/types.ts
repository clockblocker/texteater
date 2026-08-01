import type { Lemma, Surface } from "dumling/types";

import type {
	GermanHighLevelFamily,
	GermanHighLevelKind,
} from "./promtsmith/laboratory/de-routes";

export type Unresolved = { readonly decision: "Unresolved" };

export type AnalysisTarget = {
	[Family in GermanHighLevelFamily]: {
		readonly memberSegmentIndices: readonly number[];
		readonly family: Family;
		readonly kind: GermanHighLevelKind<Family>;
	};
}[GermanHighLevelFamily];

type WithoutLemma<Value> = Value extends { readonly lemma: unknown }
	? Omit<Value, "lemma">
	: never;

export type GrammaticalResolution =
	| Unresolved
	| {
			readonly decision: "Resolved";
			readonly memberOrthographies: readonly ("Standard" | "Typo")[];
			readonly surface: WithoutLemma<Surface<"de">>;
			readonly lemma: Lemma<"de">;
	  };

export type ReadingResolution = {
	readonly decision: "Reuse" | "New";
	readonly emojiDescription: string;
};
