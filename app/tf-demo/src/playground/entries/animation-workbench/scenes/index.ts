import type { SceneGroup } from "../scene";
import { CHROME } from "./chrome";
import { DRAG } from "./drag";
import { NOTE } from "./note";
import { READING } from "./reading";
import { SHEET } from "./sheet";

/**
 * Every animation that ships in tf-demo, other than the deck tap (which
 * keeps its own tap-driven move and spec in `../swap.ts`). A group is a
 * section of the workbench's index; add a scene to the one it belongs to.
 */
export const SCENE_GROUPS: readonly SceneGroup[] = [
	DRAG,
	SHEET,
	NOTE,
	READING,
	CHROME,
];
