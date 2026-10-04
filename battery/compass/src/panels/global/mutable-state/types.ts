import type { RegisteredHandle } from "../../components/handle/types";
import type { RegisteredRegion } from "../../components/region/types";
import type { Layout, RegisteredSplit } from "../../components/split/types";
import type { Point } from "../../types";
import type { HitArea } from "../dom/calculateHitAreas";

type InteractionInactive = {
	cursorFlags: 0;
	state: "inactive";
};

type InteractionHover = {
	cursorFlags: 0;
	hitAreas: HitArea[];
	state: "hover";
};

type InteractionActive = {
	cursorFlags: number;
	hitAreas: HitArea[];
	initialLayoutMap: Map<RegisteredSplit, Layout>;
	pointerDownAtPoint: Point;
	state: "active";
};

export type InteractionState =
	| InteractionInactive
	| InteractionHover
	| InteractionActive;

export type HandleToRegionsMap = Map<
	RegisteredHandle,
	[primaryRegion: RegisteredRegion, secondaryRegion: RegisteredRegion]
>;
