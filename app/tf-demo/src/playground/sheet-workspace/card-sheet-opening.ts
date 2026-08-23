import type { CardDemoOpenRequest } from "../card-demo/card-demo-interaction";
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

	const destination = regions.find(
		(region) =>
			region.paneId.length > 0 &&
			request.point.x >= region.bounds.left &&
			request.point.x <= region.bounds.right &&
			request.point.y >= region.bounds.top &&
			request.point.y <= region.bounds.bottom,
	);
	return destination
		? { kind: "Placement", paneId: destination.paneId }
		: null;
}
