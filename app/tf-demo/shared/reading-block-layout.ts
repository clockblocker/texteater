export const READING_BLOCK_KIND_VALUES = [
	"Header",
	"SourceContexts",
	"Definition",
	"Translations",
	"Relations",
	"MorphologicalTree",
	"LexicalBreakdown",
] as const;

export type ReadingBlockKind = (typeof READING_BLOCK_KIND_VALUES)[number];

export type ReadingBlockRoute = {
	readonly targetLanguage: "de";
	readonly family: string;
	readonly kind: string;
};

export type SerializedReadingBlockLayout = {
	readonly order: readonly ReadingBlockKind[];
	readonly hidden: readonly ReadingBlockKind[];
};

const BASE_BLOCKS = [
	"Header",
	"SourceContexts",
	"Definition",
	"Translations",
] as const satisfies readonly ReadingBlockKind[];

const RELATIONAL_BLOCKS = [
	...BASE_BLOCKS,
	"Relations",
] as const satisfies readonly ReadingBlockKind[];

export const DE_READING_BLOCKS_BY_FAMILY_KIND = {
	Lexeme: {
		ADJ: RELATIONAL_BLOCKS,
		ADP: RELATIONAL_BLOCKS,
		ADV: RELATIONAL_BLOCKS,
		AUX: RELATIONAL_BLOCKS,
		CCONJ: RELATIONAL_BLOCKS,
		DET: RELATIONAL_BLOCKS,
		INTJ: RELATIONAL_BLOCKS,
		NOUN: RELATIONAL_BLOCKS,
		NUM: RELATIONAL_BLOCKS,
		PART: RELATIONAL_BLOCKS,
		PRON: RELATIONAL_BLOCKS,
		PROPN: RELATIONAL_BLOCKS,
		PUNCT: BASE_BLOCKS,
		SCONJ: RELATIONAL_BLOCKS,
		SYM: RELATIONAL_BLOCKS,
		VERB: RELATIONAL_BLOCKS,
		X: BASE_BLOCKS,
	},
	Phraseme: {
		Aphorism: RELATIONAL_BLOCKS,
		Collocation: RELATIONAL_BLOCKS,
		DiscourseFormula: RELATIONAL_BLOCKS,
		Idiom: RELATIONAL_BLOCKS,
		Proverb: RELATIONAL_BLOCKS,
	},
	Morpheme: {
		Circumfix: BASE_BLOCKS,
		Clitic: BASE_BLOCKS,
		Duplifix: BASE_BLOCKS,
		Infix: BASE_BLOCKS,
		Interfix: BASE_BLOCKS,
		Prefix: BASE_BLOCKS,
		Root: BASE_BLOCKS,
		Suffix: BASE_BLOCKS,
		Suffixoid: BASE_BLOCKS,
		ToneMarking: BASE_BLOCKS,
		Transfix: BASE_BLOCKS,
	},
} as const;

export const DEFAULT_DE_READING_LANGUAGE_LAYOUT = {
	order: [
		"Header",
		"SourceContexts",
		"Relations",
		"Translations",
		"Definition",
	],
	hidden: [],
} as const satisfies SerializedReadingBlockLayout;

export function supportedReadingRoutes(
	targetLanguage: "de",
): readonly ReadingBlockRoute[] {
	return Object.entries(DE_READING_BLOCKS_BY_FAMILY_KIND).flatMap(
		([family, kinds]) =>
			Object.keys(kinds).map((kind) => ({
				targetLanguage,
				family,
				kind,
			})),
	);
}

export function availableReadingBlocksForRoute(
	route: ReadingBlockRoute,
): readonly ReadingBlockKind[] | null {
	if (route.targetLanguage !== "de") return null;
	const family = DE_READING_BLOCKS_BY_FAMILY_KIND[
		route.family as keyof typeof DE_READING_BLOCKS_BY_FAMILY_KIND
	] as Readonly<Record<string, readonly ReadingBlockKind[]>> | undefined;
	return family?.[route.kind] ?? null;
}

export function defaultReadingBlockLayoutForRoute(
	route: ReadingBlockRoute,
): SerializedReadingBlockLayout | null {
	const available = availableReadingBlocksForRoute(route);
	if (!available) return null;
	return projectReadingLanguageLayoutOntoRoute(
		DEFAULT_DE_READING_LANGUAGE_LAYOUT,
		route,
	);
}

export function projectReadingLanguageLayoutOntoRoute(
	layout: SerializedReadingBlockLayout,
	route: ReadingBlockRoute,
): SerializedReadingBlockLayout {
	const available = availableReadingBlocksForRoute(route);
	if (!available)
		throw new Error(`Unsupported Reading route: ${routeKey(route)}.`);
	return reconcileReadingBlockLayout(layout, available);
}

export function reconcileReadingBlockLayout(
	layout: SerializedReadingBlockLayout,
	available: readonly ReadingBlockKind[],
): SerializedReadingBlockLayout {
	const supported = new Set(available);
	const seen = new Set<ReadingBlockKind>();
	const order: ReadingBlockKind[] = [];
	for (const blockKind of layout.order) {
		if (!supported.has(blockKind) || seen.has(blockKind)) continue;
		seen.add(blockKind);
		order.push(blockKind);
	}
	for (const blockKind of DEFAULT_DE_READING_LANGUAGE_LAYOUT.order) {
		if (!supported.has(blockKind) || seen.has(blockKind)) continue;
		seen.add(blockKind);
		order.push(blockKind);
	}
	for (const blockKind of available) {
		if (seen.has(blockKind)) continue;
		seen.add(blockKind);
		order.push(blockKind);
	}
	const hidden = uniqueBlockKinds(layout.hidden).filter((blockKind) =>
		supported.has(blockKind),
	);
	return { order, hidden };
}

export function assertReadingBlockOrder(
	order: readonly ReadingBlockKind[],
	available: readonly ReadingBlockKind[],
): void {
	const reconciled = reconcileReadingBlockLayout(
		{ order, hidden: [] },
		available,
	).order;
	if (
		order.length !== available.length ||
		new Set(order).size !== order.length ||
		reconciled.some((blockKind, index) => blockKind !== order[index])
	) {
		throw new Error(
			"Reading Block order must contain every supported Block exactly once.",
		);
	}
}

export function assertReadingBlockSupported(
	blockKind: ReadingBlockKind,
	available: readonly ReadingBlockKind[],
): void {
	if (!available.includes(blockKind)) {
		throw new Error(`Unsupported Reading Block: ${blockKind}.`);
	}
}

export function routeKey(route: ReadingBlockRoute): string {
	return `${route.targetLanguage}/${route.family}/${route.kind}`;
}

function uniqueBlockKinds(
	blockKinds: readonly ReadingBlockKind[],
): ReadingBlockKind[] {
	return [...new Set(blockKinds)];
}
