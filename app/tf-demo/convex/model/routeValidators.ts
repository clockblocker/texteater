import { type Infer, v } from "convex/values";
import type { Route } from "dumgen";
import type * as Dumling from "dumling/types";
import type { SupportedTargetLanguage } from "../../shared/supported-target-language";
import {
	familyValues,
	isLemmaRoute,
	kindValues,
	lemmaRouteKinds,
} from "./lemmaRoutes";
import { literalUnion } from "./literalUnion";

export { isLemmaRoute };

const lexemeKindValues = lemmaRouteKinds.de.Lexeme;

export const familyValidator = literalUnion(familyValues);
export const kindValidator = literalUnion(kindValues);

export type SameMembers<A, B> = [A] extends [B]
	? [B] extends [A]
		? true
		: false
	: false;
// The validators admit every Dumling Family, Kind and route, and nothing else.
true satisfies SameMembers<Infer<typeof familyValidator>, Dumling.Family>;
true satisfies SameMembers<Infer<typeof kindValidator>, Dumling.Kind>;

/**
 * Where a click on a stored unit routes (Dumgen ADR 0007): German, a Family
 * other than Morpheme, and one of its Kinds.
 */
function unitRoutesFor<
	L extends SupportedTargetLanguage,
	K extends readonly [string, ...string[]],
>(language: L, locutionKinds: K) {
	return v.union(
		v.object({
			language: v.literal(language),
			family: v.literal("Lexeme"),
			kind: literalUnion(lexemeKindValues),
		}),
		v.object({
			language: v.literal(language),
			family: v.literal("Locution"),
			kind: literalUnion<K[number]>(locutionKinds),
		}),
		v.object({
			language: v.literal(language),
			family: v.literal("Saying"),
			kind: v.literal("Saying"),
		}),
		v.object({
			language: v.literal(language),
			family: v.literal("Foreign"),
			kind: v.literal("Foreign"),
		}),
	);
}
export const unitRouteValidator = v.union(
	unitRoutesFor("de", lemmaRouteKinds.de.Locution),
	unitRoutesFor("he", lemmaRouteKinds.he.Locution),
);
// A stored route is exactly a Route `segment.inUnits` gives.
true satisfies SameMembers<
	Infer<typeof unitRouteValidator>,
	Route<SupportedTargetLanguage>
>;
