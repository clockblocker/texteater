/**
 * Stored Reading Block layouts and their algebra, which the direct
 * manipulation in {@link https://github.com/clockblocker/texteater/issues/408}
 * will edit.
 */
export const READING_BLOCK_KIND_VALUES = [
	"Header",
	"SourceContexts",
	"Valency",
	"Definition",
	"Translations",
	"Relations",
	"PersonalAnnotation",
	"MorphologicalTree",
] as const;

export type ReadingBlockKind = (typeof READING_BLOCK_KIND_VALUES)[number];

export type ReadingBlockRoute = {
	readonly targetLanguage: SupportedTargetLanguage;
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
		"Valency",
		"Relations",
		"Translations",
		"Definition",
		"PersonalAnnotation",
	],
	hidden: [],
} as const satisfies SerializedReadingBlockLayout;

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

import { reconcileSerializedBlockLayout } from "./note-block-layout";
import type { SupportedTargetLanguage } from "./supported-target-language";
