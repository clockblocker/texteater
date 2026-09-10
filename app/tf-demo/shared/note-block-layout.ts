export type SerializedBlockLayout<B extends string> = {
	readonly order: readonly B[];
	readonly hidden: readonly B[];
};

/** Reconciles saved order and visibility against renderer-owned availability. */
export function reconcileSerializedBlockLayout<B extends string>(
	layout: SerializedBlockLayout<B>,
	available: readonly B[],
	preferredOrder: readonly B[],
): SerializedBlockLayout<B> {
	const supported = new Set(available);
	const seen = new Set<B>();
	const order: B[] = [];
	for (const blockKind of layout.order) {
		if (!supported.has(blockKind) || seen.has(blockKind)) continue;
		seen.add(blockKind);
		order.push(blockKind);
	}
	for (const blockKind of [...preferredOrder, ...available]) {
		if (!supported.has(blockKind) || seen.has(blockKind)) continue;
		seen.add(blockKind);
		order.push(blockKind);
	}
	return {
		order,
		hidden: [...new Set(layout.hidden)].filter((blockKind) =>
			supported.has(blockKind),
		),
	};
}
