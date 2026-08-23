import type {
	FixedCatalog,
	FixedLemmaCatalog,
	FixedMembersFor,
} from "./fixed/catalog.js";
import {
	DE_LEXEME_AUX_FIXED_LEMMA_CATALOG,
	DE_LEXEME_AUX_FIXED_READING_CATALOG,
	FIXED_CATALOG_SCOPE_DE_LEXEME_AUX_V1,
} from "./fixed/de/lexeme/auxiliary.js";
import {
	DE_LEXEME_DET_FIXED_LEMMA_CATALOG,
	DE_LEXEME_DET_FIXED_READING_CATALOG,
	FIXED_CATALOG_SCOPE_DE_LEXEME_DET_V1,
} from "./fixed/de/lexeme/determiner.js";
import {
	DE_LEXEME_PRON_PERSONAL_FIXED_LEMMA_CATALOG,
	DE_LEXEME_PRON_PERSONAL_FIXED_READING_CATALOG,
	FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1,
} from "./fixed/de/lexeme/pronoun.js";
import type {
	Lemma,
	LemmaFamilyFor,
	LemmaForRoute,
	LemmaKindFor,
	LemmaRoute,
	Reading,
	SupportedLanguage,
} from "./types/public-types.js";

export type {
	FixedCatalog,
	FixedCatalogCoverage,
	FixedLemmaCatalog,
} from "./fixed/catalog.js";
export { FIXED_CATALOG_SCOPE_DE_LEXEME_AUX_V1 } from "./fixed/de/lexeme/auxiliary.js";
export { FIXED_CATALOG_SCOPE_DE_LEXEME_DET_V1 } from "./fixed/de/lexeme/determiner.js";
export { FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1 } from "./fixed/de/lexeme/pronoun.js";

const lemmaCatalogs = Object.freeze([
	DE_LEXEME_DET_FIXED_LEMMA_CATALOG,
	DE_LEXEME_AUX_FIXED_LEMMA_CATALOG,
	DE_LEXEME_PRON_PERSONAL_FIXED_LEMMA_CATALOG,
]) satisfies readonly FixedLemmaCatalog[];

const readingCatalogs = Object.freeze([
	Object.freeze({
		route: DE_LEXEME_DET_FIXED_LEMMA_CATALOG.route,
		...DE_LEXEME_DET_FIXED_READING_CATALOG,
	}),
	Object.freeze({
		route: DE_LEXEME_AUX_FIXED_LEMMA_CATALOG.route,
		...DE_LEXEME_AUX_FIXED_READING_CATALOG,
	}),
	Object.freeze({
		route: DE_LEXEME_PRON_PERSONAL_FIXED_LEMMA_CATALOG.route,
		...DE_LEXEME_PRON_PERSONAL_FIXED_READING_CATALOG,
	}),
]);

/** Every authored fixed Lemma catalog, for idempotent application loading. */
export function allFixedLemmaCatalogs(): readonly FixedLemmaCatalog[] {
	return lemmaCatalogs;
}

/** Every authored fixed Reading catalog, for idempotent application loading. */
export function allFixedReadingCatalogs(): readonly FixedCatalog<Reading>[] {
	return readingCatalogs;
}

export const fixedMembersFor: FixedMembersFor = Object.freeze({
	lemma<const R extends LemmaRoute>(
		route: R,
	): FixedCatalog<LemmaForRoute<R>> | undefined {
		const catalog = lemmaCatalogs.find(({ route: candidate }) =>
			sameRoute(candidate, route),
		);
		return catalog as FixedCatalog<LemmaForRoute<R>> | undefined;
	},
	reading<
		const L extends SupportedLanguage,
		const F extends LemmaFamilyFor<L>,
		const K extends LemmaKindFor<L, F>,
	>(lemma: Lemma<L, F, K>): FixedCatalog<Reading<L, F, K>> | undefined {
		const route = {
			language: lemma.language,
			family: lemma.family,
			kind: lemma.kind,
		} as LemmaRoute;
		const catalog = readingCatalogs.find(({ route: candidate }) =>
			sameRoute(candidate, route),
		);
		if (!catalog) return undefined;
		return Object.freeze({
			scope: catalog.scope,
			coverage: catalog.coverage,
			members: Object.freeze(
				catalog.members.filter((reading) =>
					sameCanonicalValue(reading.lemma, lemma),
				),
			),
		}) as FixedCatalog<Reading<L, F, K>>;
	},
});

/** Fixed-population lookup, independent of whole-route closure. */
export const fixedPopulationFor = fixedMembersFor;

function sameRoute(left: LemmaRoute, right: LemmaRoute): boolean {
	return (
		left.language === right.language &&
		left.family === right.family &&
		left.kind === right.kind
	);
}

function sameCanonicalValue(left: unknown, right: unknown): boolean {
	if (left === right) return true;
	if (
		left === null ||
		right === null ||
		typeof left !== "object" ||
		typeof right !== "object" ||
		Array.isArray(left) !== Array.isArray(right)
	) {
		return false;
	}
	const leftRecord = left as Readonly<Record<string, unknown>>;
	const rightRecord = right as Readonly<Record<string, unknown>>;
	const leftKeys = Object.keys(leftRecord);
	const rightKeys = Object.keys(rightRecord);
	return (
		leftKeys.length === rightKeys.length &&
		leftKeys.every(
			(key) =>
				Object.hasOwn(rightRecord, key) &&
				sameCanonicalValue(leftRecord[key], rightRecord[key]),
		)
	);
}

// Compile-time proof that the public constant remains tied to the catalog.
FIXED_CATALOG_SCOPE_DE_LEXEME_DET_V1 satisfies typeof DE_LEXEME_DET_FIXED_LEMMA_CATALOG.scope;
FIXED_CATALOG_SCOPE_DE_LEXEME_AUX_V1 satisfies typeof DE_LEXEME_AUX_FIXED_LEMMA_CATALOG.scope;
FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1 satisfies typeof DE_LEXEME_PRON_PERSONAL_FIXED_LEMMA_CATALOG.scope;
