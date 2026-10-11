import type { FixtureWord } from "@/fixtures";

/** The three levels a lookup can be promoted through. */
export type Level = "peek" | "pane" | "sheet";

/** One lookup: what is resolved, and from which word in the text. */
export type Lookup = {
	readonly key: number;
	readonly query: FixtureWord | string;
	/** The word the lookup hangs from. A lemma hop keeps it. */
	readonly wordId: string;
	/** `performance.now()` when the Cards started to arrive. */
	readonly startedAt: number;
	/** The Card in front, or null for the newest. */
	readonly front: number | null;
};

/**
 * One lookup surface. A surface keeps its id as it moves between levels,
 * and the id is its Motion `layoutId`, so a move morphs it in place.
 */
export type Surface = { readonly id: number; readonly lookup: Lookup };

export type PromoteState = {
	readonly peek: Surface | null;
	readonly pane: Surface | null;
	readonly sheet: {
		readonly surface: Surface;
		/** Where the sheet came from, and where ← takes it back. */
		readonly from: "peek" | "pane";
	} | null;
	/** Whether the pane follows each click or stays frozen. */
	readonly follow: boolean;
	readonly nextId: number;
};

export type PromoteAction =
	| {
			readonly type: "click";
			readonly word: FixtureWord;
			readonly at: number;
	  }
	| {
			readonly type: "hop";
			readonly level: Level;
			readonly query: string;
			readonly at: number;
	  }
	| { readonly type: "front"; readonly level: Level; readonly index: number }
	| { readonly type: "pin" }
	| { readonly type: "unpin" }
	| { readonly type: "expand"; readonly from: "peek" | "pane" }
	| { readonly type: "collapse" }
	| { readonly type: "close"; readonly level: Level }
	| { readonly type: "escape" }
	| { readonly type: "follow"; readonly follow: boolean };

export const initialState: PromoteState = {
	peek: null,
	pane: null,
	sheet: null,
	follow: true,
	nextId: 1,
};

function surfaceAt(state: PromoteState, level: Level): Surface | null {
	return level === "sheet"
		? (state.sheet?.surface ?? null)
		: level === "pane"
			? state.pane
			: state.peek;
}

function withSurface(
	state: PromoteState,
	level: Level,
	surface: Surface,
): PromoteState {
	if (level === "sheet")
		return state.sheet
			? { ...state, sheet: { ...state.sheet, surface } }
			: state;
	return level === "pane"
		? { ...state, pane: surface }
		: { ...state, peek: surface };
}

/**
 * A word click: a following pane shows the word; otherwise a new peek
 * opens by it. Clicking the word already shown changes nothing.
 */
function click(
	state: PromoteState,
	word: FixtureWord,
	at: number,
): PromoteState {
	const following = state.pane !== null && state.follow;
	const target = following ? state.pane : state.peek;
	if (target?.lookup.query === word) return state;
	const lookup: Lookup = {
		key: state.nextId,
		query: word,
		wordId: word.id,
		startedAt: at,
		front: null,
	};
	const nextId = state.nextId + 1;
	if (following && state.pane)
		return {
			...state,
			peek: null,
			pane: { ...state.pane, lookup },
			nextId,
		};
	return { ...state, peek: { id: state.nextId, lookup }, nextId };
}

/**
 * Every move keeps the surface's id, so the surface morphs from one level
 * to the next; only a click outside a following pane makes a new one.
 */
export function promote(
	state: PromoteState,
	action: PromoteAction,
): PromoteState {
	switch (action.type) {
		case "click":
			return click(state, action.word, action.at);
		case "hop": {
			const surface = surfaceAt(state, action.level);
			if (!surface) return state;
			return {
				...withSurface(state, action.level, {
					...surface,
					lookup: {
						...surface.lookup,
						key: state.nextId,
						query: action.query,
						startedAt: action.at,
						front: null,
					},
				}),
				nextId: state.nextId + 1,
			};
		}
		case "front": {
			const surface = surfaceAt(state, action.level);
			if (!surface) return state;
			return withSurface(state, action.level, {
				...surface,
				lookup: { ...surface.lookup, front: action.index },
			});
		}
		case "pin":
			return state.peek
				? { ...state, pane: state.peek, peek: null }
				: state;
		case "unpin":
			return state.pane
				? { ...state, peek: state.pane, pane: null }
				: state;
		case "expand": {
			const surface = action.from === "pane" ? state.pane : state.peek;
			if (!surface) return state;
			return {
				...state,
				[action.from]: null,
				sheet: { surface, from: action.from },
			};
		}
		case "collapse":
			return state.sheet
				? {
						...state,
						sheet: null,
						[state.sheet.from]: state.sheet.surface,
					}
				: state;
		case "close":
			return state[action.level] === null
				? state
				: { ...state, [action.level]: null };
		case "escape":
			if (state.peek) return { ...state, peek: null };
			return promote(state, { type: "collapse" });
		case "follow":
			return { ...state, follow: action.follow };
	}
}
