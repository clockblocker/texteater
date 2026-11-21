// Generated from canonical Zod unit schemas. Run bun run generate.
import type { UnitMap as DeUnitMap } from "./languages/de/units.js";
import type { UnitMap as EnUnitMap } from "./languages/en/units.js";
import type { UnitMap as HeUnitMap } from "./languages/he/units.js";
export interface UnitMap extends DeUnitMap, EnUnitMap, HeUnitMap {}

export type UnitKind = "Lemma" | "Surface" | "Reading" | "Attestation";
export type VariantTag = "Licensed" | "Historical" | "Regional" | "Expressive";
export type Language = UnitMap[keyof UnitMap]["Lemma"]["language"];
export type Family<L extends Language = Language> = L extends Language
	? {
			[R in keyof UnitMap]: UnitMap[R]["Lemma"]["language"] extends L
				? UnitMap[R]["Lemma"]["family"]
				: never;
		}[keyof UnitMap]
	: never;
export type Kind<
	L extends Language = Language,
	F extends Family<L> = Family<L>,
> = L extends Language
	? F extends Family<L>
		? {
				[R in keyof UnitMap]: UnitMap[R]["Lemma"] extends {
					language: L;
					family: F;
				}
					? UnitMap[R]["Lemma"]["kind"]
					: never;
			}[keyof UnitMap]
		: never
	: never;
export type Unit<
	U extends UnitKind = UnitKind,
	L extends Language = Language,
	F extends Family<L> = Family<L>,
	K extends Kind<L, F> = Kind<L, F>,
> = UnitMap[Extract<`${L}/${F}/${K}`, keyof UnitMap>][U];
export type Lemma<
	L extends Language = Language,
	F extends Family<L> = Family<L>,
	K extends Kind<L, F> = Kind<L, F>,
> = Unit<"Lemma", L, F, K>;
export type Surface<
	L extends Language = Language,
	F extends Family<L> = Family<L>,
	K extends Kind<L, F> = Kind<L, F>,
> = Unit<"Surface", L, F, K>;
export type Reading<
	L extends Language = Language,
	F extends Family<L> = Family<L>,
	K extends Kind<L, F> = Kind<L, F>,
> = Unit<"Reading", L, F, K>;
export type Attestation<
	L extends Language = Language,
	F extends Family<L> = Family<L>,
	K extends Kind<L, F> = Kind<L, F>,
> = Unit<"Attestation", L, F, K>;
/** The Unit Kinds that carry features, so a route may give them Syncretisms (system ADR 0046). Reading and Attestation reach one through their Lemma or Surface. */
type SyncretizableUnitKind = "Lemma" | "Surface";
/** A Syncretism with its units (system ADR 0046): `syncretic` names the features its units disagree on and `syncretized` holds them. Only routes whose schema allows one have it. */
export type Syncretism<
	U extends SyncretizableUnitKind = SyncretizableUnitKind,
	L extends Language = Language,
	F extends Family<L> = Family<L>,
	K extends Kind<L, F> = Kind<L, F>,
> =
	Unit<U, L, F, K> extends infer T
		? T extends { syncretic?: infer S; syncretized?: infer V }
			? "syncretized" extends keyof T
				? {
						[P in keyof T as P extends "syncretic" | "syncretized"
							? never
							: P]: T[P];
					} & {
						syncretic: Exclude<S, undefined>;
						syncretized: Exclude<V, undefined>;
					}
				: never
			: never
		: never;
/** A Syncretism without its units: what a classifier answers. It keeps `syncretic`, so it has the Syncretism's identity (system ADR 0046). */
export type SyncretismView<
	U extends SyncretizableUnitKind = SyncretizableUnitKind,
	L extends Language = Language,
	F extends Family<L> = Family<L>,
	K extends Kind<L, F> = Kind<L, F>,
> =
	Unit<U, L, F, K> extends infer T
		? T extends { syncretic?: infer S }
			? "syncretic" extends keyof T
				? {
						[P in keyof T as P extends "syncretic" | "syncretized"
							? never
							: P]: T[P];
					} & { syncretic: Exclude<S, undefined> }
				: never
			: never
		: never;
/** A Lemma's route: one member per route, so a value keeps its `family` and `kind` together. */
export type LemmaRoute = {
	[R in keyof UnitMap]: Pick<
		UnitMap[R]["Lemma"],
		"language" | "family" | "kind"
	>;
}[keyof UnitMap];
export type UnitRoute = {
	[R in keyof UnitMap]: Pick<
		UnitMap[R]["Lemma"],
		"language" | "family" | "kind"
	> & { unitKind: UnitKind };
}[keyof UnitMap];
// Distributes over R without re-checking each route against UnitRoute: that
// check relates every route to the whole union and grows cubically with routes.
export type ParsedUnit<R extends UnitRoute = UnitRoute> = R extends unknown
	? {
			[U in R["unitKind"]]: {
				unitKind: U;
				language: R["language"];
				family: R["family"];
				kind: R["kind"];
				value: UnitMap[Extract<
					`${R["language"]}/${R["family"]}/${R["kind"]}`,
					keyof UnitMap
				>][U];
			};
		}[R["unitKind"]]
	: never;
