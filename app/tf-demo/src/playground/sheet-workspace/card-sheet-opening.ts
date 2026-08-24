import type {
	CardDemoOpenRequest,
	CardDemoViewportPoint,
} from "../card-demo/card-demo-interaction";
import type {
	PaneId,
	SheetInstanceId,
	SheetOpeningOrigin,
} from "./sheet-workspace";

export type PaneDropRegion = {
	readonly paneId: PaneId;
	readonly bounds: {
		readonly left: number;
		readonly top: number;
		readonly right: number;
		readonly bottom: number;
	};
};

export function cardSheetOpeningOrigin(
	request: CardDemoOpenRequest,
	sourceSheetId: SheetInstanceId,
	regions: readonly PaneDropRegion[],
): SheetOpeningOrigin | null {
	if (request.origin === "direct") {
		return { kind: "Sheet", sheetId: sourceSheetId };
	}

	const destinationPaneId = cardSheetDropPaneId(request.point, regions);
	return destinationPaneId
		? { kind: "Placement", paneId: destinationPaneId }
		: null;
}

export function cardSheetDropPaneId(
	point: CardDemoViewportPoint,
	regions: readonly PaneDropRegion[],
): PaneId | null {
	const destination = regions.find(
		(region) =>
			region.paneId.length > 0 &&
			point.x >= region.bounds.left &&
			point.x <= region.bounds.right &&
			point.y >= region.bounds.top &&
			point.y <= region.bounds.bottom,
	);
	return destination?.paneId ?? null;
}
