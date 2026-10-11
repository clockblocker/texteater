import {
	clickAt,
	hide,
	kept,
	longPressMs,
	obsidian,
	open,
	type Preview,
	type PreviewHost,
	type Rect,
} from "./rules";
import { isMac, type OpenHow, openHowOf } from "./tabs";

export type PreviewSettings = {
	/** Obsidian's per-source "Require Ctrl/Cmd": links in Cards and Sheets. */
	readonly requireInHosts: boolean;
	/** The same, for links inside a preview (Obsidian's reading view). */
	readonly requireInPreviews: boolean;
	readonly hoverDelayMs: number;
	readonly graceMs: number;
};

/** What the controller reads and writes in the React layer. */
export type ControllerHost = {
	readonly frame: HTMLElement;
	readonly read: () => {
		readonly previews: readonly Preview[];
		readonly settings: PreviewSettings;
		readonly dir: "ltr" | "rtl";
	};
	readonly write: (previews: readonly Preview[]) => void;
	/** Opens `path` from `host` as the click's modifiers say. */
	readonly follow: (
		host: PreviewHost,
		path: readonly string[],
		how: OpenHow,
	) => void;
};

const modKey = isMac ? "Meta" : "Control";
const modHeld = (event: MouseEvent | KeyboardEvent) =>
	isMac ? event.metaKey : event.ctrlKey;

const linkOf = (target: EventTarget | null) =>
	target instanceof Element
		? target.closest<HTMLElement>("[data-hp-link]")
		: null;
const previewIdOf = (target: EventTarget | null) =>
	target instanceof Element
		? (target.closest<HTMLElement>("[data-hp-preview]")?.dataset
				.hpPreview ?? null)
		: null;

type Route = {
	readonly host: PreviewHost;
	readonly path: readonly string[];
	readonly parentId: string | null;
};

/**
 * Obsidian's page preview over every `[data-hp-link]` in the frame. It
 * listens on the frame, so links need no handlers of their own. Hovering a
 * link (with ⌘, or Ctrl off a Mac, where its source requires it) for the
 * hover delay spawns a preview; a link hovered without ⌘ is armed, and ⌘
 * pressed within 2 s of the last move shows it. The pointer off a preview,
 * its link and its descendants for the grace period hides it; a click
 * outside closes it. A click on any link follows it, opening it as its
 * modifiers say (`openHowOf`); a middle click opens a new tab.
 *
 * Copied from the hover-preview demo without its Path of Exile model and
 * safe-zone overlay.
 */
export class PreviewController {
	private readonly host: ControllerHost;
	private readonly anchors = new Map<string, HTMLElement>();
	private readonly deadlines = new Map<string, number>();
	private nextId = 0;
	private pointer: Element | null = null;
	/** Whether ⌘ (Ctrl) is down, from keys and pointer events. */
	private modDown = false;
	private hovered: HTMLElement | null = null;
	private armed: HTMLElement | null = null;
	private lastMove = 0;
	private showing: HTMLElement | null = null;
	private showTimer = 0;
	private hideTimer = 0;
	private press: {
		readonly x: number;
		readonly y: number;
		readonly timer: number;
	} | null = null;
	/** A long press showed a preview; the click it ends with is spent. */
	private pressSpent = false;

	constructor(host: ControllerHost) {
		this.host = host;
	}

	/** Listens on the frame and the document; returns the undo. */
	attach(): () => void {
		const { frame } = this.host;
		const listeners: [
			EventTarget,
			string,
			(event: never) => void,
			boolean,
		][] = [
			[frame, "pointerover", this.onPointerOver, false],
			[frame, "pointermove", this.onPointerMove, false],
			[frame, "pointerleave", this.onPointerLeave, false],
			[frame, "pointerdown", this.onPointerDown, true],
			[frame, "pointerup", this.endPress, false],
			[frame, "pointercancel", this.endPress, false],
			[frame, "contextmenu", this.onContextMenu, false],
			[frame, "click", this.onClick, true],
			[frame, "auxclick", this.onAuxClick, true],
			[document, "keydown", this.onKeyDown, true],
			[document, "keyup", this.onKeyUp, true],
			[window, "blur", this.onKeyUp, false],
		];
		for (const [target, type, listener, capture] of listeners)
			target.addEventListener(type, listener as EventListener, capture);
		return () => {
			window.clearTimeout(this.showTimer);
			window.clearTimeout(this.hideTimer);
			this.endPress();
			for (const [target, type, listener, capture] of listeners)
				target.removeEventListener(
					type,
					listener as EventListener,
					capture,
				);
		};
	}

	// The buttons in a preview.

	change(id: string, patch: Partial<Preview>) {
		this.commit(
			this.previews.map((preview) =>
				preview.id === id ? { ...preview, ...patch } : preview,
			),
		);
	}

	close(id: string) {
		this.commit(hide(this.previews, [id]));
	}

	/** The preview opens as a Sheet; the fleeting ones go. */
	expand(preview: Preview, how: OpenHow) {
		this.commit(
			hide(
				this.previews,
				this.previews
					.filter((other) => other.id === preview.id || !other.pinned)
					.map((other) => other.id),
			),
		);
		this.host.follow(preview.host, preview.path, how);
	}

	// State.

	private get previews() {
		return this.host.read().previews;
	}

	private commit(next: readonly Preview[]) {
		for (const id of this.anchors.keys())
			if (!next.some((preview) => preview.id === id)) {
				this.anchors.delete(id);
				this.deadlines.delete(id);
			}
		this.host.write(next);
		this.refresh();
	}

	private frameRect(element: Element): Rect {
		const outer = this.host.frame.getBoundingClientRect();
		const rect = element.getBoundingClientRect();
		return {
			start:
				this.host.read().dir === "rtl"
					? outer.right - rect.right
					: rect.left - outer.left,
			top: rect.top - outer.top,
			width: rect.width,
			height: rect.height,
		};
	}

	private requiresModifier(link: HTMLElement) {
		const { settings } = this.host.read();
		return previewIdOf(link)
			? settings.requireInPreviews
			: settings.requireInHosts;
	}

	private isOpenFor(link: HTMLElement) {
		return this.previews.some(
			(preview) => this.anchors.get(preview.id) === link,
		);
	}

	/** Where a link leads: its preview's host and path, or its own host's. */
	private routeOf(link: HTMLElement): Route | null {
		const word = link.dataset.hpLink ?? "";
		const parentId = previewIdOf(link);
		if (parentId) {
			const parent = this.previews.find(
				(preview) => preview.id === parentId,
			);
			return parent
				? { host: parent.host, path: [...parent.path, word], parentId }
				: null;
		}
		const element = link.closest<HTMLElement>("[data-hp-host]");
		if (!element) return null;
		const host: PreviewHost =
			element.dataset.hpHost === "sheet"
				? { kind: "sheet", tabId: element.dataset.hpTab ?? "" }
				: { kind: "reader" };
		return { host, path: [word], parentId: null };
	}

	private spawn(link: HTMLElement, engaged: boolean) {
		const route = this.routeOf(link);
		const word = link.dataset.hpLink;
		if (!route || !word || this.isOpenFor(link)) return;
		this.nextId += 1;
		const id = `p${this.nextId}`;
		this.anchors.set(id, link);
		this.commit(
			open(this.previews, {
				id,
				word,
				parentId: route.parentId,
				host: route.host,
				path: route.path,
				anchor: this.frameRect(link),
				pinned: false,
				engaged,
				dragged: null,
			}),
		);
	}

	private cancelShow() {
		window.clearTimeout(this.showTimer);
		this.showing = null;
	}

	private scheduleShow(link: HTMLElement) {
		this.armed = null;
		if (this.showing === link || this.isOpenFor(link)) return;
		this.cancelShow();
		this.showing = link;
		this.showTimer = window.setTimeout(() => {
			this.showing = null;
			if (this.hovered === link) this.spawn(link, false);
		}, this.showDelay());
	}

	/** The preview whose link the pointer is over, if any. */
	private onLinkOf(): string | null {
		const link = this.pointer ? linkOf(this.pointer) : null;
		if (!link) return null;
		for (const [id, anchor] of this.anchors) if (anchor === link) return id;
		return null;
	}

	private showDelay() {
		return this.host.read().settings.hoverDelayMs;
	}

	/** Starts or stops each preview's grace period from where the pointer is. */
	private refresh() {
		const { previews, settings } = this.host.read();
		const grace = settings.graceMs;
		const keep = kept(previews, {
			inPreview: this.pointer ? previewIdOf(this.pointer) : null,
			onLinkOf: this.onLinkOf(),
		});
		const now = performance.now();
		for (const preview of previews) {
			if (preview.pinned || keep.has(preview.id))
				this.deadlines.delete(preview.id);
			else if (!this.deadlines.has(preview.id))
				this.deadlines.set(preview.id, now + grace);
		}
		window.clearTimeout(this.hideTimer);
		if (this.deadlines.size === 0) return;
		const soonest = Math.min(...this.deadlines.values());
		this.hideTimer = window.setTimeout(
			this.expire,
			Math.max(0, soonest - now),
		);
	}

	private readonly expire = () => {
		const now = performance.now();
		const due = [...this.deadlines]
			.filter(([, until]) => until <= now + 1)
			.map(([id]) => id);
		if (due.length > 0) this.commit(hide(this.previews, due));
		else this.refresh();
	};

	// Events.

	private readonly onPointerOver = (event: PointerEvent) => {
		this.pointer = event.target as Element;
		this.modDown = modHeld(event);
		if (event.pointerType === "mouse") {
			const link = linkOf(event.target);
			if (link !== this.hovered) this.hover(link, modHeld(event));
		}
		this.refresh();
	};

	private hover(link: HTMLElement | null, withModifier: boolean) {
		this.hovered = link;
		this.armed = null;
		if (this.showing && this.showing !== link) this.cancelShow();
		if (!link) return;
		if (withModifier || !this.requiresModifier(link))
			this.scheduleShow(link);
		else this.armed = link;
	}

	private readonly onPointerMove = (event: PointerEvent) => {
		if (
			this.press &&
			Math.hypot(
				event.clientX - this.press.x,
				event.clientY - this.press.y,
			) > 8
		)
			this.endPress();
		if (event.pointerType !== "mouse") return;
		this.lastMove = performance.now();
		this.noteModifier(modHeld(event));
		// ⌘ pressed before the pointer arrived shows on the next move.
		if (this.hovered && this.armed === this.hovered && modHeld(event))
			this.scheduleShow(this.hovered);
	};

	private readonly onPointerLeave = () => {
		this.pointer = null;
		this.hovered = null;
		this.armed = null;
		this.cancelShow();
		this.refresh();
	};

	private noteModifier(down: boolean) {
		if (down === this.modDown) return;
		this.modDown = down;
		this.refresh();
	}

	/** Leaving the window releases ⌘. */
	private readonly onKeyUp = (event: Event) => {
		if (!(event instanceof KeyboardEvent) || event.key === modKey)
			this.noteModifier(false);
	};

	private readonly onKeyDown = (event: KeyboardEvent) => {
		if (event.key === modKey) {
			this.noteModifier(true);
			// Obsidian arms a link hovered without ⌘; pressing ⌘ within
			// 2 s of the last move shows its preview.
			if (
				this.armed &&
				this.armed === this.hovered &&
				performance.now() - this.lastMove <= obsidian.armMs
			)
				this.scheduleShow(this.armed);
			return;
		}
		if (event.key.startsWith("Arrow") || event.key.length === 1) {
			this.armed = null;
			return;
		}
		if (event.key === "Escape") this.escape(event);
	};

	/**
	 * Not Obsidian's, which has no key for a preview: Esc closes the
	 * newest unpinned preview, so it walks a chain back. Esc with focus in
	 * the inspector or the toolbar is theirs.
	 */
	private escape(event: KeyboardEvent) {
		const focused = document.activeElement;
		if (
			focused &&
			focused !== document.body &&
			!this.host.frame.contains(focused)
		)
			return;
		const newest = this.previews.findLast((preview) => !preview.pinned);
		if (!newest) return;
		event.preventDefault();
		event.stopPropagation();
		this.commit(hide(this.previews, [newest.id]));
	}

	/**
	 * A click anywhere closes each unpinned preview it isn't inside, and
	 * drops a pending one. A long press on a link shows its preview,
	 * engaged, since no hover will keep it.
	 */
	private readonly onPointerDown = (event: PointerEvent) => {
		this.armed = null;
		this.cancelShow();
		// A middle press on a link opens a tab, not the browser's autoscroll.
		if (event.button === 1 && linkOf(event.target)) event.preventDefault();
		const next = clickAt(this.previews, previewIdOf(event.target));
		if (next.length !== this.previews.length) this.commit(next);
		const link = linkOf(event.target);
		if (event.pointerType === "mouse" || !link) return;
		this.press = {
			x: event.clientX,
			y: event.clientY,
			timer: window.setTimeout(() => {
				this.press = null;
				this.pressSpent = true;
				this.spawn(link, true);
			}, longPressMs),
		};
	};

	private readonly endPress = () => {
		if (this.press) window.clearTimeout(this.press.timer);
		this.press = null;
	};

	private readonly onContextMenu = (event: MouseEvent) => {
		if (this.pressSpent || this.press) event.preventDefault();
	};

	/**
	 * A click on a link follows it, as its modifiers say. A click on a
	 * preview's own text engages it, as a click into an Obsidian preview
	 * starts editing.
	 */
	private readonly onClick = (event: MouseEvent) => {
		if (this.pressSpent) {
			this.pressSpent = false;
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		const link = linkOf(event.target);
		const route = link ? this.routeOf(link) : null;
		if (route) {
			event.preventDefault();
			event.stopPropagation();
			this.host.follow(route.host, route.path, openHowOf(event));
			return;
		}
		const inside = previewIdOf(event.target);
		if (
			inside &&
			!link &&
			!(event.target as Element).closest("button, [data-hp-grip]")
		)
			this.change(inside, { engaged: true });
	};

	/** A middle click on a link opens it in a new tab, as Obsidian's does. */
	private readonly onAuxClick = (event: MouseEvent) => {
		if (event.button !== 1) return;
		const link = linkOf(event.target);
		const route = link ? this.routeOf(link) : null;
		if (!route) return;
		event.preventDefault();
		event.stopPropagation();
		this.host.follow(route.host, route.path, openHowOf(event));
	};
}
