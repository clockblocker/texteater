import type { CSSProperties } from "react";
import type { RegisteredSplit } from "../../components/split/types";
import {
	CURSOR_FLAG_HORIZONTAL_MAX,
	CURSOR_FLAG_HORIZONTAL_MIN,
	CURSOR_FLAG_VERTICAL_MAX,
	CURSOR_FLAG_VERTICAL_MIN,
} from "../../constants";
import type { InteractionState } from "../mutable-state/types";
import { supportsAdvancedCursorStyles } from "./supportsAdvancedCursorStyles";

type Cursor = CSSProperties["cursor"];

const ORIENTATION_CURSORS = {
	advanced: { both: "move", horizontal: "ew-resize", vertical: "ns-resize" },
	basic: { both: "grab", horizontal: "col-resize", vertical: "row-resize" },
} as const;

export function getCursorStyle({
	cursorFlags,
	splits,
	state,
}: {
	cursorFlags: number;
	splits: RegisteredSplit[];
	state: InteractionState["state"];
}): Cursor {
	if (state === "inactive") {
		return undefined;
	}

	const cursorSplits = splits.filter(
		(split) => !split.mutableState.disableCursor,
	);
	const horizontal = cursorSplits.some(
		(split) => split.orientation === "horizontal",
	);
	const vertical = cursorSplits.some(
		(split) => split.orientation === "vertical",
	);
	if (!horizontal && !vertical) {
		return undefined;
	}

	const advanced = supportsAdvancedCursorStyles();
	if (state === "active" && advanced) {
		const cursor = limitCursor(cursorFlags);
		if (cursor) {
			return cursor;
		}
	}

	const cursors = advanced
		? ORIENTATION_CURSORS.advanced
		: ORIENTATION_CURSORS.basic;
	if (horizontal && vertical) {
		return cursors.both;
	}
	return horizontal ? cursors.horizontal : cursors.vertical;
}

/**
 * The resize cursor pointing the only way a Split at a limit can still go:
 * at the horizontal minimum it points east, at the vertical minimum south, and
 * both together make "se-resize". A minimum flag wins over its maximum.
 */
function limitCursor(cursorFlags: number): Cursor {
	const direction =
		limitEdge(
			cursorFlags,
			CURSOR_FLAG_VERTICAL_MIN,
			CURSOR_FLAG_VERTICAL_MAX,
			"s",
			"n",
		) +
		limitEdge(
			cursorFlags,
			CURSOR_FLAG_HORIZONTAL_MIN,
			CURSOR_FLAG_HORIZONTAL_MAX,
			"e",
			"w",
		);
	return direction ? `${direction}-resize` : undefined;
}

function limitEdge(
	cursorFlags: number,
	minFlag: number,
	maxFlag: number,
	atMin: string,
	atMax: string,
): string {
	if (cursorFlags & minFlag) {
		return atMin;
	}
	if (cursorFlags & maxFlag) {
		return atMax;
	}
	return "";
}
