import {
	findPane,
	type PaneId,
	type SheetWorkspace,
	type WorkspaceSubject,
} from "./sheet-workspace";

export type CardCandidate = {
	/** Unique only within one request; the workspace scopes it to its Pane. */
	readonly key: string;
	readonly subject: WorkspaceSubject;
};

export type LayerCard = CardCandidate & {
	readonly id: string;
};

export type CardLayer = {
	readonly paneId: PaneId;
	readonly originSheetId: string;
	/** User-facing order, foremost Card first. */
	readonly cards: readonly LayerCard[];
};

export function replaceCardLayer(
	layers: readonly CardLayer[],
	request: {
		readonly paneId: PaneId;
		readonly originSheetId: string;
		readonly cards: readonly CardCandidate[];
	},
): readonly CardLayer[] {
	const layer: CardLayer = {
		paneId: request.paneId,
		originSheetId: request.originSheetId,
		cards: request.cards.map((card) => ({
			...card,
			id: `${request.paneId}:${request.originSheetId}:${card.key}`,
		})),
	};
	return [
		...layers.filter((candidate) => candidate.paneId !== request.paneId),
		...(layer.cards.length > 0 ? [layer] : []),
	];
}

export function dismissCardLayer(
	layers: readonly CardLayer[],
	paneId: PaneId,
): readonly CardLayer[] {
	return layers.filter((layer) => layer.paneId !== paneId);
}

export function removeLayerCard(
	layers: readonly CardLayer[],
	paneId: PaneId,
	cardId: string,
): readonly CardLayer[] {
	return layers.flatMap((layer) => {
		if (layer.paneId !== paneId) return [layer];
		const cards = layer.cards.filter((card) => card.id !== cardId);
		return cards.length > 0 ? [{ ...layer, cards }] : [];
	});
}

export function replaceLayerCardSubject(
	layers: readonly CardLayer[],
	paneId: PaneId,
	cardId: string,
	subject: WorkspaceSubject,
): readonly CardLayer[] {
	return layers.map((layer) =>
		layer.paneId === paneId
			? {
					...layer,
					cards: layer.cards.map((card) =>
						card.id === cardId ? { ...card, subject } : card,
					),
				}
			: layer,
	);
}

/** Dismiss a layer as soon as its originating Sheet is no longer foremost. */
export function reconcileCardLayers(
	layers: readonly CardLayer[],
	workspace: SheetWorkspace,
): readonly CardLayer[] {
	return layers.filter((layer) => {
		const pane = findPane(workspace, layer.paneId);
		return pane?.sheets.at(-1)?.instanceId === layer.originSheetId;
	});
}
