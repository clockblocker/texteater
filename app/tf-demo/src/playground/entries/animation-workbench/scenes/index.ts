import type { SceneGroup } from "../scene";
import { CHROME } from "./chrome";
import { DRAG } from "./drag";
import { READING } from "./reading";
import { SHEET } from "./sheet";

/**
 * Every animation that ships in tf-demo, other than the deck tap (which
 * keeps its own tap-driven variants in `../variants.ts`). Add a scene to
 * the group it belongs to; add a group here to get a new tab.
 */
export const SCENE_GROUPS: readonly SceneGroup[] = [
	DRAG,
	SHEET,
	READING,
	CHROME,
];
