/**
 * Obsidian's tabs, with the reader as a tab pinned first in the first tab
 * group. Pure, so the rules can be tested without a browser; the sources
 * for each rule are listed in the inspector.
 */

/** How a click opens its link, as Obsidian's `Keymap.isModEvent` says. */
export type OpenHow = "here" | "tab" | "split" | "window";

export const isMac =
	typeof navigator !== "undefined" &&
	/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

type ClickLike = {
	readonly button: number;
	readonly metaKey: boolean;
	readonly ctrlKey: boolean;
	readonly altKey: boolean;
	readonly shiftKey: boolean;
};

/**
 * ⌘ (Ctrl off a Mac) + ⌥ + ⇧ opens a window, ⌘ + ⌥ a split, ⌘ or a
 * middle click a tab; anything else opens it here.
 */
export function openHowOf(event: ClickLike, mac = isMac): OpenHow {
	const mod = mac ? event.metaKey : event.ctrlKey;
	if (mod && event.altKey && event.shiftKey) return "window";
	if (mod && event.altKey) return "split";
	if (mod || event.button === 1) return "tab";
	return "here";
}

/** One stop on a Sheet's trail. */
export type SheetEntry = {
	readonly key: string;
	readonly word: string;
};

export type ReaderTab = { readonly id: "reader"; readonly kind: "reader" };

/** A Sheet in History mode: its own trail, as an Obsidian tab keeps one. */
export type SheetTab = {
	readonly id: string;
	readonly kind: "sheet";
	readonly trail: readonly SheetEntry[];
	readonly at: number;
	/** How the last move went, so content slides the matching way. */
	readonly move: "push" | "back" | "forward";
};

export type Tab = ReaderTab | SheetTab;

/** A tab group: a tab bar over one pane, side by side with the others. */
export type Group = {
	readonly id: string;
	readonly tabs: readonly Tab[];
	readonly active: string;
	/** Its share of the width, as a flex-grow weight. */
	readonly size: number;
};

export type Workspace = {
	readonly groups: readonly Group[];
	/** The group holding the active tab, where ⌘W and ⌘⇧T act. */
	readonly focused: string;
	/** Closed Sheet tabs, newest last, for "Reopen closed tab". */
	readonly closed: readonly {
		readonly tab: SheetTab;
		readonly group: string;
		readonly index: number;
	}[];
	readonly nextId: number;
};

export type OpenSettings = {
	/** Obsidian's "Always focus new tabs". */
	readonly alwaysFocusNewTabs: boolean;
	/**
	 * Where a plain click in the pinned reader opens: `visible`, as
	 * Obsidian has done since 1.3.4, in a visible unpinned tab when there
	 * is one (a split's), else in a new tab; `new`, always in a new tab.
	 */
	readonly pinnedOpens: "visible" | "new";
	/** Off: every click opens as a plain click does. */
	readonly modifiers: boolean;
	/** A phone has no splits or windows: they open as tabs. */
	readonly phone: boolean;
};

export const readerTab: ReaderTab = { id: "reader", kind: "reader" };

export const emptyWorkspace: Workspace = {
	groups: [{ id: "g0", tabs: [readerTab], active: "reader", size: 1 }],
	focused: "g0",
	closed: [],
	nextId: 1,
};

/** At most this many tab groups side by side, so each stays readable. */
const maxGroups = 3;
/** Closed tabs kept for reopening. */
const maxClosed = 20;

export const tabsOf = (workspace: Workspace) =>
	workspace.groups.flatMap((group) => group.tabs);

const groupOf = (workspace: Workspace, tabId: string) =>
	workspace.groups.find((group) =>
		group.tabs.some((tab) => tab.id === tabId),
	);

/** The tab ⌘W and back/forward act on. */
export function activeTab(workspace: Workspace): Tab {
	const group =
		workspace.groups.find((each) => each.id === workspace.focused) ??
		workspace.groups[0];
	return group?.tabs.find((tab) => tab.id === group.active) ?? readerTab;
}

const patchGroup = (
	workspace: Workspace,
	id: string,
	patch: (group: Group) => Group,
): Workspace => ({
	...workspace,
	groups: workspace.groups.map((group) =>
		group.id === id ? patch(group) : group,
	),
});

const patchSheet = (
	workspace: Workspace,
	tabId: string,
	patch: (tab: SheetTab) => SheetTab,
): Workspace => ({
	...workspace,
	groups: workspace.groups.map((group) => ({
		...group,
		tabs: group.tabs.map((tab) =>
			tab.kind === "sheet" && tab.id === tabId ? patch(tab) : tab,
		),
	})),
});

/** A fresh Sheet tab on `word`, with no history: a new tab has none. */
function newSheet(workspace: Workspace, word: string): [Workspace, SheetTab] {
	const next = workspace.nextId + 1;
	const tab: SheetTab = {
		id: `t${next}`,
		kind: "sheet",
		trail: [{ key: `e${next}`, word }],
		at: 0,
		move: "push",
	};
	return [{ ...workspace, nextId: next }, tab];
}

/**
 * The unpinned tab a plain click in the pinned reader reuses: the active
 * Sheet of the nearest other group, the only kind on show beside the
 * reader. None on a phone, which shows one tab.
 */
function visibleUnpinned(
	workspace: Workspace,
	source: Group,
	phone: boolean,
): SheetTab | null {
	if (phone) return null;
	const at = workspace.groups.indexOf(source);
	const others = [
		...workspace.groups.slice(at + 1),
		...workspace.groups.slice(0, at).toReversed(),
	];
	for (const group of others) {
		const tab = group.tabs.find((each) => each.id === group.active);
		if (tab?.kind === "sheet") return tab;
	}
	return null;
}

/**
 * Opens `word` from the tab `sourceId` as `how` asks. In a Sheet, a plain
 * click navigates in place and pushes the trail. The reader is pinned, so
 * a plain click there opens a visible unpinned tab or a new tab, focused
 * either way, as a link in an Obsidian pinned tab does. ⌘ opens a new tab
 * right after the source, focused only with "Always focus new tabs"; ⌘⌥ a
 * new tab group at the source group's inline end, focused; ⌘⌥⇧ would open
 * a window, here a focused tab. A phone has neither: both open a tab.
 */
export function openFrom(
	workspace: Workspace,
	sourceId: string,
	word: string,
	how: OpenHow,
	settings: OpenSettings,
): Workspace {
	const source = groupOf(workspace, sourceId);
	if (!source) return workspace;
	let mode: OpenHow = settings.modifiers ? how : "here";
	if (settings.phone && mode !== "here") mode = "tab";
	if (mode === "window") mode = "tab";
	if (mode === "split" && workspace.groups.length >= maxGroups) mode = "tab";

	if (mode === "here" && sourceId !== readerTab.id)
		return navigate(workspace, sourceId, word);
	if (mode === "here" && settings.pinnedOpens === "visible") {
		const reused = visibleUnpinned(workspace, source, settings.phone);
		if (reused)
			return activate(navigate(workspace, reused.id, word), reused.id);
	}

	const [withId, tab] = newSheet(workspace, word);
	if (mode === "split") {
		const groupId = `g${withId.nextId}`;
		const at = withId.groups.findIndex((group) => group.id === source.id);
		const groups = [...withId.groups];
		groups.splice(at + 1, 0, {
			id: groupId,
			tabs: [tab],
			active: tab.id,
			size: source.size / 2,
		});
		return {
			...withId,
			groups: groups.map((group) =>
				group.id === source.id
					? { ...group, size: source.size / 2 }
					: group,
			),
			focused: groupId,
		};
	}

	// A plain click from the pinned reader focuses its new tab; ⌘ does
	// only when "Always focus new tabs" is on.
	const focus = mode === "here" || settings.alwaysFocusNewTabs;
	const placed = patchGroup(withId, source.id, (group) => {
		const tabs = [...group.tabs];
		tabs.splice(tabs.findIndex((each) => each.id === sourceId) + 1, 0, tab);
		return { ...group, tabs, active: focus ? tab.id : group.active };
	});
	return focus ? { ...placed, focused: source.id } : placed;
}

/** Pushes `word` onto a Sheet's trail, dropping what lay ahead. */
function navigate(
	workspace: Workspace,
	tabId: string,
	word: string,
): Workspace {
	const next = workspace.nextId + 1;
	return patchSheet({ ...workspace, nextId: next }, tabId, (tab) => {
		const trail = [
			...tab.trail.slice(0, tab.at + 1),
			{ key: `e${next}`, word },
		];
		return { ...tab, trail, at: trail.length - 1, move: "push" };
	});
}

/** Back, forward or a breadcrumb jump within a Sheet's trail. */
export function go(
	workspace: Workspace,
	tabId: string,
	index: number,
): Workspace {
	return patchSheet(workspace, tabId, (tab) =>
		index >= 0 && index < tab.trail.length && index !== tab.at
			? { ...tab, at: index, move: index < tab.at ? "back" : "forward" }
			: tab,
	);
}

export function activate(workspace: Workspace, tabId: string): Workspace {
	const group = groupOf(workspace, tabId);
	if (!group) return workspace;
	return {
		...patchGroup(workspace, group.id, (each) => ({
			...each,
			active: tabId,
		})),
		focused: group.id,
	};
}

/** Makes `groupId` the focused group, as a click into its pane does. */
export function focusGroup(workspace: Workspace, groupId: string): Workspace {
	return workspace.focused === groupId ||
		!workspace.groups.some((group) => group.id === groupId)
		? workspace
		: { ...workspace, focused: groupId };
}

/**
 * Closes a Sheet tab; the pinned reader can't be closed. Closing the
 * active tab activates its right neighbour, else its left one (logical:
 * the next or previous in the bar). A group left empty goes, and the
 * group before it takes its width.
 */
export function close(workspace: Workspace, tabId: string): Workspace {
	const group = groupOf(workspace, tabId);
	if (!group || tabId === readerTab.id) return workspace;
	const index = group.tabs.findIndex((tab) => tab.id === tabId);
	const tab = group.tabs[index];
	if (tab?.kind !== "sheet") return workspace;
	const closed = [...workspace.closed, { tab, group: group.id, index }].slice(
		-maxClosed,
	);
	const tabs = group.tabs.filter((each) => each.id !== tabId);
	if (tabs.length === 0) {
		const at = workspace.groups.indexOf(group);
		const groups = workspace.groups.filter((each) => each !== group);
		const heir = groups[Math.max(0, at - 1)];
		return {
			...workspace,
			closed,
			groups: groups.map((each) =>
				each === heir
					? { ...each, size: each.size + group.size }
					: each,
			),
			focused:
				workspace.focused === group.id
					? (heir?.id ?? "g0")
					: workspace.focused,
		};
	}
	const active =
		group.active === tabId
			? (tabs[Math.min(index, tabs.length - 1)]?.id ?? readerTab.id)
			: group.active;
	return {
		...patchGroup(workspace, group.id, (each) => ({
			...each,
			tabs,
			active,
		})),
		closed,
	};
}

/**
 * Obsidian's "Reopen closed tab": the newest closed tab comes back where
 * it was, focused, or in the focused group when its group has gone. As in
 * Obsidian, it comes back without its history.
 */
export function reopen(workspace: Workspace): Workspace {
	const last = workspace.closed.at(-1);
	if (!last) return workspace;
	const rest = { ...workspace, closed: workspace.closed.slice(0, -1) };
	const home =
		workspace.groups.find((group) => group.id === last.group) ??
		workspace.groups.find((group) => group.id === workspace.focused) ??
		workspace.groups[0];
	if (!home) return workspace;
	const placed = patchGroup(rest, home.id, (group) => {
		const tabs = [...group.tabs];
		const { tab } = last;
		const entry = tab.trail[tab.at];
		const bare: SheetTab = entry
			? { ...tab, trail: [entry], at: 0, move: "push" }
			: tab;
		tabs.splice(Math.max(1, Math.min(last.index, tabs.length)), 0, bare);
		return { ...group, tabs, active: tab.id };
	});
	return { ...placed, focused: home.id };
}

/**
 * Drags a tab to `index` within its group. The reader stays first: a
 * Sheet dropped before it lands just after it, and the reader itself
 * doesn't move.
 */
export function move(
	workspace: Workspace,
	tabId: string,
	index: number,
): Workspace {
	const group = groupOf(workspace, tabId);
	if (!group || tabId === readerTab.id) return workspace;
	const tab = group.tabs.find((each) => each.id === tabId);
	if (!tab) return workspace;
	const tabs = group.tabs.filter((each) => each.id !== tabId);
	const pinned = tabs[0]?.id === readerTab.id ? 1 : 0;
	tabs.splice(Math.max(pinned, Math.min(index, tabs.length)), 0, tab);
	return patchGroup(workspace, group.id, (each) => ({ ...each, tabs }));
}

/** Sets the widths of two neighbouring groups from a divider drag. */
export function resize(
	workspace: Workspace,
	before: string,
	after: string,
	share: number,
): Workspace {
	const first = workspace.groups.find((group) => group.id === before);
	const second = workspace.groups.find((group) => group.id === after);
	if (!first || !second) return workspace;
	const total = first.size + second.size;
	const clamped = Math.min(0.85, Math.max(0.15, share));
	return {
		...workspace,
		groups: workspace.groups.map((group) =>
			group.id === before
				? { ...group, size: total * clamped }
				: group.id === after
					? { ...group, size: total * (1 - clamped) }
					: group,
		),
	};
}

/** The title a tab shows: the word its Sheet is on, or "Reader". */
export function titleOf(tab: Tab): string {
	return tab.kind === "reader" ? "Reader" : (tab.trail[tab.at]?.word ?? "");
}

/**
 * Ctrl+Tab and Ctrl+Shift+Tab: the next or previous tab in the focused
 * group, wrapping. `n` from Cmd+1 to Cmd+8: that tab; Cmd+9: the last.
 */
function cycle(workspace: Workspace, by: number): Workspace {
	const group = workspace.groups.find(
		(each) => each.id === workspace.focused,
	);
	if (!group) return workspace;
	const at = group.tabs.findIndex((tab) => tab.id === group.active);
	const count = group.tabs.length;
	const next = group.tabs[(((at + by) % count) + count) % count];
	return next ? activate(workspace, next.id) : workspace;
}

function activateNth(workspace: Workspace, n: number): Workspace {
	const group = workspace.groups.find(
		(each) => each.id === workspace.focused,
	);
	if (!group) return workspace;
	const tab = n >= 9 ? group.tabs.at(-1) : group.tabs[n - 1];
	return tab ? activate(workspace, tab.id) : workspace;
}

type KeyLike = Omit<ClickLike, "button"> & {
	readonly key: string;
	readonly code: string;
};

/**
 * Obsidian's tab hotkeys: ⌘W closes the active tab and ⌘⇧T reopens the
 * last closed one (⌥W and ⌥⇧T too, since a browser keeps ⌘W and ⌘⇧T);
 * ⌘⌥← and → go back and forward; Ctrl+Tab and Ctrl+⇧Tab cycle; ⌘1 to ⌘8
 * pick a tab and ⌘9 the last. Null when the key isn't one of them.
 */
export function hotkey(
	workspace: Workspace,
	event: KeyLike,
	mac = isMac,
): Workspace | null {
	const mod = mac ? event.metaKey : event.ctrlKey;
	const current = activeTab(workspace);
	const either = mod || event.altKey;
	if (event.code === "KeyW" && !event.shiftKey && either)
		return close(workspace, current.id);
	if (event.code === "KeyT" && event.shiftKey && either)
		return reopen(workspace);
	const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
	if (mod && event.altKey && step !== undefined)
		return current.kind === "sheet"
			? go(workspace, current.id, current.at + step)
			: workspace;
	if (event.ctrlKey && event.key === "Tab")
		return cycle(workspace, event.shiftKey ? -1 : 1);
	if (mod && !event.altKey && /^Digit[1-9]$/.test(event.code))
		return activateNth(workspace, Number(event.code.slice(5)));
	return null;
}
