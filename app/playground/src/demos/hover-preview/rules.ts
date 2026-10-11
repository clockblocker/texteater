/**
 * Obsidian's page preview, as its 1.14.4 bundle has it (`HoverPopover` in
 * app.js, `.hover-popover` in app.css), and the chain of previews it keeps.
 * Pure, so the rules can be tested without a browser.
 */
export const obsidian = {
	/** `waitTime`: hovering this long shows a preview. */
	hoverDelayMs: 300,
	/** The same `waitTime`: off the link and its chain this long hides it. */
	graceMs: 300,
	/** Opacity 0 → 1. */
	fadeMs: 80,
	/** Between the link and the preview. */
	gap: 10,
	/** Kept inside the viewport by this much. */
	edge: 10,
	/** `--popover-width`. */
	width: 450,
	/** `max-width: 80vw`, here 80% of the frame. */
	maxWidthShare: 0.8,
	/** `--popover-height`, the content's `max-height`; it scrolls past it. */
	maxHeight: 400,
	/** A link hovered without ⌘ stays armed for ⌘ this long after a move. */
	armMs: 2000,
} as const;

/** Not Obsidian's: it shows no preview on touch at all. */
export const longPressMs = 500;

/** A rect in logical px within the frame: `start` from its inline start. */
export type Rect = {
	readonly start: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
};

export type PreviewBox = {
	readonly start: number;
	readonly top: number;
	readonly width: number;
	/** The content's `max-height`: 400, or less where the room is less. */
	readonly maxHeight: number;
	readonly side: "below" | "above";
};

/**
 * Below the link with a 10 px gap if the preview fits there, else above
 * if it fits there, else on whichever side has more room with its height
 * clamped to it. Its inline-start edge lines up with the link's, kept
 * 10 px inside the view. `height` is the preview's natural height.
 */
export function placePreview(
	link: Rect,
	height: number,
	view: { readonly width: number; readonly height: number },
): PreviewBox {
	const { gap, edge } = obsidian;
	const width = Math.max(
		0,
		Math.min(
			obsidian.width,
			view.width * obsidian.maxWidthShare,
			view.width - 2 * edge,
		),
	);
	const start = Math.min(
		Math.max(link.start, edge),
		Math.max(edge, view.width - edge - width),
	);
	const wanted = Math.min(height, obsidian.maxHeight);
	const below = view.height - edge - (link.top + link.height + gap);
	const above = link.top - gap - edge;
	const placeBelow = (room: number): PreviewBox => ({
		start,
		top: link.top + link.height + gap,
		width,
		maxHeight: Math.min(obsidian.maxHeight, room),
		side: "below",
	});
	const placeAbove = (room: number): PreviewBox => ({
		start,
		top: link.top - gap - Math.min(wanted, room),
		width,
		maxHeight: Math.min(obsidian.maxHeight, room),
		side: "above",
	});
	if (wanted <= below) return placeBelow(below);
	if (wanted <= above) return placeAbove(above);
	return below >= above
		? placeBelow(Math.max(below, 0))
		: placeAbove(Math.max(above, 0));
}

/** Where a preview's links lead when followed: a Card's Deck or a Sheet. */
export type PreviewHost =
	| { readonly kind: "deck"; readonly subject: string }
	| { readonly kind: "sheet" };

export type Preview = {
	readonly id: string;
	readonly word: string;
	/** The preview whose link spawned it; null for a link in a host. */
	readonly parentId: string | null;
	readonly host: PreviewHost;
	/** The words hovered from the host to here, this one last. */
	readonly path: readonly string[];
	/** The link's rect when it spawned. */
	readonly anchor: Rect;
	/** Hover Editor's pin: off its parent's chain, and never hidden. */
	readonly pinned: boolean;
	/**
	 * Clicked into, as Obsidian's `.is-editing`, or opened by a long
	 * press: it ignores the pointer leaving and closes on a click outside.
	 */
	readonly engaged: boolean;
	/** Where a drag left it; it is placed by its link until dragged. */
	readonly dragged: { readonly start: number; readonly top: number } | null;
};

function descendantsOf(previews: readonly Preview[], id: string): Set<string> {
	const found = new Set<string>();
	let grew = true;
	while (grew) {
		grew = false;
		for (const preview of previews)
			if (
				preview.parentId !== null &&
				(preview.parentId === id || found.has(preview.parentId)) &&
				!found.has(preview.id)
			) {
				found.add(preview.id);
				grew = true;
			}
	}
	return found;
}

function withAncestors(
	previews: readonly Preview[],
	id: string | null,
	into: Set<string>,
) {
	let current = id;
	while (current !== null && !into.has(current)) {
		into.add(current);
		const preview = previews.find((candidate) => candidate.id === current);
		current = preview?.parentId ?? null;
	}
}

/**
 * Hides `ids` and, as Obsidian's `hide()` does, every unpinned preview
 * below them. A pinned one has left the chain and stays.
 */
export function hide(
	previews: readonly Preview[],
	ids: readonly string[],
): Preview[] {
	const named = new Set(ids);
	const below = new Set<string>();
	for (const id of ids)
		for (const descendant of descendantsOf(previews, id))
			below.add(descendant);
	return previews.filter(
		(preview) =>
			!named.has(preview.id) &&
			!(below.has(preview.id) && !preview.pinned),
	);
}

/**
 * Adds `next`. Each owner (a host, or a preview) has one preview at a
 * time, so an unpinned sibling and everything below it goes.
 */
export function open(previews: readonly Preview[], next: Preview): Preview[] {
	const siblings = previews
		.filter(
			(preview) => preview.parentId === next.parentId && !preview.pinned,
		)
		.map((preview) => preview.id);
	return [...hide(previews, siblings), next];
}

/**
 * The previews the pointer keeps showing: the one it is over and the one
 * whose link it is over, with every ancestor of each (a parent stays while
 * a child is active), and the engaged ones with theirs. Pinned previews
 * need no keeping.
 */
export function kept(
	previews: readonly Preview[],
	pointer: {
		/** The preview the pointer is over. */
		readonly inPreview: string | null;
		/** The preview whose link the pointer is over. */
		readonly onLinkOf: string | null;
	},
): Set<string> {
	const keep = new Set<string>();
	withAncestors(previews, pointer.inPreview, keep);
	withAncestors(previews, pointer.onLinkOf, keep);
	for (const preview of previews)
		if (preview.engaged) withAncestors(previews, preview.id, keep);
	return keep;
}

/**
 * A click or right-click at a point inside `inPreview` (null: outside
 * every preview) closes each unpinned preview the click is not inside, nor
 * inside one of its descendants.
 */
export function clickAt(
	previews: readonly Preview[],
	inPreview: string | null,
): Preview[] {
	const keep = new Set<string>();
	withAncestors(previews, inPreview, keep);
	return hide(
		previews,
		previews
			.filter((preview) => !preview.pinned && !keep.has(preview.id))
			.map((preview) => preview.id),
	);
}
