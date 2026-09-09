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

/**
 * Layout preferences contain presentation order and visibility only. The Note
 * renderer registry decides which Blocks are available for a grammatical route.
 */
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

export function reconcileReadingBlockLayout(
	layout: SerializedReadingBlockLayout,
	available: readonly ReadingBlockKind[] = DEFAULT_DE_READING_LANGUAGE_LAYOUT.order,
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
	const hidden = [...new Set(layout.hidden)].filter((blockKind) =>
		supported.has(blockKind),
	);
	return { order, hidden };
}

export function assertReadingBlockOrder(
	order: readonly ReadingBlockKind[],
): void {
	if (
		order.length === 0 ||
		new Set(order).size !== order.length ||
		order.some(
			(blockKind) => !READING_BLOCK_KIND_VALUES.includes(blockKind),
		)
	) {
		throw new Error(
			"Reading Block order must contain configured Blocks at most once.",
		);
	}
}

export function assertReadingBlockSupported(
	blockKind: ReadingBlockKind,
	available: readonly ReadingBlockKind[] = READING_BLOCK_KIND_VALUES,
): void {
	if (!available.includes(blockKind)) {
		throw new Error(`Unsupported Reading Block: ${blockKind}.`);
	}
}

export function routeKey(route: ReadingBlockRoute): string {
	return `${route.targetLanguage}/${route.family}/${route.kind}`;
}
