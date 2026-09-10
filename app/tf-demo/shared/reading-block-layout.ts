/**
 * @layoutdormant Retained for #408 direct-manipulation persistence. Remove this
 * Knip suppression when that interaction consumes the layout algebra.
 */
export const READING_BLOCK_KIND_VALUES = [
	"Header",
	"SourceContexts",
	"Definition",
	"Translations",
	"Relations",
	"MorphologicalTree",
	"LexicalBreakdown",
] as const;

/** @layoutdormant See {@link https://github.com/clockblocker/texteater/issues/408}. */
export type ReadingBlockKind = (typeof READING_BLOCK_KIND_VALUES)[number];

/** @layoutdormant See {@link https://github.com/clockblocker/texteater/issues/408}. */
export type ReadingBlockRoute = {
	readonly targetLanguage: SupportedTargetLanguage;
	readonly family: string;
	readonly kind: string;
};

/** @layoutdormant See {@link https://github.com/clockblocker/texteater/issues/408}. */
export type SerializedReadingBlockLayout = {
	readonly order: readonly ReadingBlockKind[];
	readonly hidden: readonly ReadingBlockKind[];
};

/**
 * Layout preferences contain presentation order and visibility only. The Note
 * renderer registry decides which Blocks are available for a grammatical route.
 */
/** @layoutdormant See {@link https://github.com/clockblocker/texteater/issues/408}. */
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

/** @layoutdormant See {@link https://github.com/clockblocker/texteater/issues/408}. */
export function reconcileReadingBlockLayout(
	layout: SerializedReadingBlockLayout,
	available: readonly ReadingBlockKind[] = DEFAULT_DE_READING_LANGUAGE_LAYOUT.order,
): SerializedReadingBlockLayout {
	return reconcileSerializedBlockLayout(
		layout,
		available,
		DEFAULT_DE_READING_LANGUAGE_LAYOUT.order,
	);
}

/** @layoutdormant See {@link https://github.com/clockblocker/texteater/issues/408}. */
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

/** @layoutdormant See {@link https://github.com/clockblocker/texteater/issues/408}. */
export function assertReadingBlockSupported(
	blockKind: ReadingBlockKind,
	available: readonly ReadingBlockKind[] = READING_BLOCK_KIND_VALUES,
): void {
	if (!available.includes(blockKind)) {
		throw new Error(`Unsupported Reading Block: ${blockKind}.`);
	}
}

/** @layoutdormant See {@link https://github.com/clockblocker/texteater/issues/408}. */
export function routeKey(route: ReadingBlockRoute): string {
	return `${route.targetLanguage}/${route.family}/${route.kind}`;
}

import { reconcileSerializedBlockLayout } from "./note-block-layout";
import type { SupportedTargetLanguage } from "./supported-target-language";
