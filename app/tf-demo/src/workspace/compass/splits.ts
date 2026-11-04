/**
 * Splits are parked (tf-demo ADR 0013): tf-demo shows one Pane at every
 * width, and no drop, key or control spawns another. The battery's Split,
 * Floating Pane and layout-tree machinery stays, so turning this off
 * brings splits back as tf-demo ADR 0008 decides them.
 */
export const SPLITS_PARKED: boolean = true;

/**
 * Whether a Pane's side edges take a drop and spawn a Floating Pane
 * there: never on a narrow screen, below `md` (tf-demo ADR 0008), and
 * never while splits are parked. Without splits the renderer draws one
 * Pane, the Active Pane.
 */
export function splitsAt(narrow: boolean): boolean {
	return !(SPLITS_PARKED || narrow);
}
