import type { Layout, RegisteredGroup } from "../../components/group/types";
import type { RegisteredPanel } from "../../components/panel/types";
import type { RegisteredSeparator } from "../../components/separator/types";
import type { Point } from "../../types";
import type { HitRegion } from "../dom/calculateHitRegions";

type InteractionInactive = {
	cursorFlags: 0;
	state: "inactive";
};

type InteractionHover = {
	cursorFlags: 0;
	hitRegions: HitRegion[];
	state: "hover";
};

type InteractionActive = {
	cursorFlags: number;
	hitRegions: HitRegion[];
	initialLayoutMap: Map<RegisteredGroup, Layout>;
	pointerDownAtPoint: Point;
	state: "active";
};

export type InteractionState =
	| InteractionInactive
	| InteractionHover
	| InteractionActive;

export type SeparatorToPanelsMap = Map<
	RegisteredSeparator,
	[primaryPanel: RegisteredPanel, secondaryPanel: RegisteredPanel]
>;
