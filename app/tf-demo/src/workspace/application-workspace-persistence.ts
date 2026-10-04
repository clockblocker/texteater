import type {
	Cover,
	Deck,
	LayoutNode,
	PaneNode,
	Presentation,
	Rung,
	WorkspaceState,
} from "compass";
import { findPane, panesOf } from "compass";
import { isWorkspaceSubject, type WorkspaceSubject } from "./workspace-subject";

/**
 * Workspace Persistence (tf-demo ADR 0003): the Panes with their Ground lines,
 * Covers and Decks, the Active Pane, and the id counter. A held gesture is
 * never saved; while a Card is in hand, the workspace as the Lift found it
 * is. Anything stored under an older key or in another shape is ignored.
 */
const STORAGE_KEY = "tf-demo.workspace.compass.v1";

export type ApplicationWorkspaceStorage = Pick<Storage, "getItem" | "setItem">;

type Saved = {
	readonly layout: LayoutNode<WorkspaceSubject>;
	readonly activePaneId: string;
	readonly nextId: number;
};

export function loadApplicationWorkspace(
	fallback: () => WorkspaceState<WorkspaceSubject>,
	menuItems: ReadonlySet<string>,
	storage: ApplicationWorkspaceStorage | null = browserStorage(),
): WorkspaceState<WorkspaceSubject> {
	if (!storage) return fallback();
	try {
		const raw = storage.getItem(STORAGE_KEY);
		const saved = raw ? parseSaved(JSON.parse(raw), menuItems) : null;
		return saved ? { ...saved, held: null } : fallback();
	} catch {
		return fallback();
	}
}

export function saveApplicationWorkspace(
	state: WorkspaceState<WorkspaceSubject>,
	storage: ApplicationWorkspaceStorage | null = browserStorage(),
): void {
	if (!storage) return;
	const before = state.held?.checkpoint ?? state;
	const saved: Saved = {
		layout: before.layout,
		activePaneId: before.activePaneId,
		/* the counter never runs backwards, even past a cancelled Lift */
		nextId: state.nextId,
	};
	try {
		storage.setItem(STORAGE_KEY, JSON.stringify(saved));
	} catch {
		// Browser storage can be unavailable while the in-memory workspace remains valid.
	}
}

function browserStorage(): ApplicationWorkspaceStorage | null {
	try {
		return typeof window === "undefined" ? null : window.localStorage;
	} catch {
		return null;
	}
}

/* --- reading it back: every shape checked, anything off discards it all --- */

function parseSaved(value: unknown, menuItems: ReadonlySet<string>) {
	if (!isRecord(value)) return null;
	const { layout, activePaneId, nextId } = value;
	if (
		typeof activePaneId !== "string" ||
		typeof nextId !== "number" ||
		!Number.isSafeInteger(nextId)
	)
		return null;
	const parsed = parseLayout(layout, menuItems);
	if (!parsed) return null;
	return {
		layout: parsed,
		activePaneId: findPane(parsed, activePaneId)
			? activePaneId
			: (panesOf(parsed)[0]?.id ?? activePaneId),
		nextId,
	} satisfies Saved;
}

function parseLayout(
	value: unknown,
	menuItems: ReadonlySet<string>,
): LayoutNode<WorkspaceSubject> | null {
	if (!isRecord(value) || typeof value.id !== "string") return null;
	if (value.kind === "Pane") return parsePane(value, menuItems);
	if (value.kind !== "Split") return null;
	if (value.direction !== "horizontal" && value.direction !== "vertical")
		return null;
	if (!Array.isArray(value.children) || value.children.length !== 2)
		return null;
	const a = parseLayout(value.children[0], menuItems);
	const b = parseLayout(value.children[1], menuItems);
	if (!a || !b) return null;
	const fresh = parseFresh(value.fresh);
	return {
		kind: "Split",
		id: value.id,
		direction: value.direction,
		children: [a, b],
		...(fresh ? { fresh } : {}),
	};
}

/** The size a split opened at; dropped, not fatal, when it is off. */
function parseFresh(value: unknown) {
	if (!isRecord(value) || typeof value.paneId !== "string") return null;
	const { paneId, size } = value;
	return typeof size === "number" || typeof size === "string"
		? { paneId, size }
		: null;
}

function parsePane(
	value: Record<string, unknown>,
	menuItems: ReadonlySet<string>,
): PaneNode<WorkspaceSubject> | null {
	if (!Array.isArray(value.line) || !Array.isArray(value.covers)) return null;
	const line = value.line.map((rung) => parseRung(rung, menuItems));
	const covers = value.covers.map(parseCover);
	if (
		line.length === 0 ||
		!line.every((rung) => rung !== null) ||
		!covers.every((cover) => cover !== null)
	)
		return null;
	return { kind: "Pane", id: value.id as string, line, covers };
}

function parseRung(
	value: unknown,
	menuItems: ReadonlySet<string>,
): Rung<WorkspaceSubject> | null {
	if (!isRecord(value) || typeof value.id !== "string") return null;
	const deck = parseDeck(value.deck);
	if (deck === undefined) return null;
	const { id } = value;
	switch (value.kind) {
		case "Menu":
			return { id, kind: "Menu", deck };
		case "MenuItem":
			return typeof value.item === "string" && menuItems.has(value.item)
				? { id, kind: "MenuItem", item: value.item, deck }
				: null;
		case "Sheet": {
			const presentation = parsePresentation(value.presentation);
			return presentation
				? { id, kind: "Sheet", presentation, deck }
				: null;
		}
		default:
			return null;
	}
}

function parseCover(value: unknown): Cover<WorkspaceSubject> | null {
	if (!isRecord(value) || typeof value.id !== "string") return null;
	const presentation = parsePresentation(value.presentation);
	const deck = parseDeck(value.deck);
	return presentation && deck !== undefined
		? { id: value.id, presentation, deck }
		: null;
}

/** A Deck, `null` for none, or `undefined` when it is malformed. */
function parseDeck(value: unknown): Deck<WorkspaceSubject> | null | undefined {
	if (value === null) return null;
	if (
		!isRecord(value) ||
		typeof value.id !== "string" ||
		typeof value.selection !== "string" ||
		!Array.isArray(value.cards) ||
		(value.frontId !== null && typeof value.frontId !== "string")
	)
		return undefined;
	const cards = value.cards.map(parsePresentation);
	if (!cards.every((card) => card !== null)) return undefined;
	return {
		id: value.id,
		selection: value.selection,
		cards,
		frontId: value.frontId,
	};
}

function parsePresentation(
	value: unknown,
): Presentation<WorkspaceSubject> | null {
	if (
		!isRecord(value) ||
		typeof value.id !== "string" ||
		!isWorkspaceSubject(value.subject) ||
		(value.key !== undefined && typeof value.key !== "string")
	)
		return null;
	return typeof value.key === "string"
		? { id: value.id, subject: value.subject, key: value.key }
		: { id: value.id, subject: value.subject };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
