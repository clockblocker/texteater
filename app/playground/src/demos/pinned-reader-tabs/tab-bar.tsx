import { cn } from "lego";
import { Check, ChevronDown, Pin, X } from "lucide-react";
import { motion } from "motion/react";
import {
	type PointerEvent,
	type ReactNode,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { langAttrs } from "@/fixtures";
import { type Group, type Tab, titleOf } from "./tabs";

/** The language a tab's title is in: German for a Sheet's word. */
const titleLang = (tab: Tab) => langAttrs(tab.kind === "reader" ? "en" : "de");

export type TabActions = {
	readonly onActivate: (tabId: string) => void;
	readonly onClose: (tabId: string) => void;
	readonly onMove: (tabId: string, index: number) => void;
};

/**
 * A tab group's header, as Obsidian draws it: a tab per leaf, the pinned
 * reader first with its pin where the others have ×, and the group's menu
 * at the inline end. Tabs shrink, then the strip scrolls. A tab activates
 * on press; dragging it along the strip reorders it, a middle click or ×
 * closes it. In stacked mode the tabs move onto the panes' spines and the
 * header keeps only the menu.
 */
export function TabBar({
	group,
	focused,
	stacked,
	onToggleStack,
	onCloseAll,
	actions,
}: {
	readonly group: Group;
	/** Whether this group holds the active tab. */
	readonly focused: boolean;
	readonly stacked: boolean;
	readonly onToggleStack: () => void;
	readonly onCloseAll: () => void;
	readonly actions: TabActions;
}) {
	const stripRef = useRef<HTMLDivElement>(null);
	const [dragging, setDragging] = useState<string | null>(null);
	const drag = useRef<{ id: string; x: number; moved: boolean } | null>(null);

	// Keeps the active tab in view when the strip overflows.
	useLayoutEffect(() => {
		const strip = stripRef.current;
		const tab = strip?.querySelector<HTMLElement>(
			`[data-tab-id="${CSS.escape(group.active)}"]`,
		);
		if (!strip || !tab) return;
		const outer = strip.getBoundingClientRect();
		const inner = tab.getBoundingClientRect();
		if (inner.right > outer.right)
			strip.scrollLeft += inner.right - outer.right;
		else if (inner.left < outer.left)
			strip.scrollLeft -= outer.left - inner.left;
	}, [group.active, group.tabs.length]);

	const onPointerDown = (event: PointerEvent, tab: Tab) => {
		if (event.button === 1) {
			// A middle press closes on release, not the browser's autoscroll.
			event.preventDefault();
			return;
		}
		if (event.button !== 0) return;
		if ((event.target as Element).closest("[data-tab-close]")) return;
		actions.onActivate(tab.id);
		if (tab.kind === "reader") return;
		event.currentTarget.setPointerCapture(event.pointerId);
		drag.current = { id: tab.id, x: event.clientX, moved: false };
	};
	const onPointerMove = (event: PointerEvent) => {
		const from = drag.current;
		const strip = stripRef.current;
		if (!from || !strip) return;
		if (!from.moved && Math.abs(event.clientX - from.x) < 5) return;
		from.moved = true;
		setDragging(from.id);
		const over = [
			...strip.querySelectorAll<HTMLElement>("[data-tab-id]"),
		].findIndex((element) => {
			const rect = element.getBoundingClientRect();
			return event.clientX >= rect.left && event.clientX < rect.right;
		});
		const at = group.tabs.findIndex((tab) => tab.id === from.id);
		if (over >= 0 && over !== at) actions.onMove(from.id, over);
	};
	const endDrag = () => {
		drag.current = null;
		setDragging(null);
	};

	return (
		<div className="flex h-10 shrink-0 items-end gap-1 border-b border-line bg-paper ps-1.5 pe-1">
			<div
				ref={stripRef}
				role="tablist"
				aria-label="Tabs"
				className="flex min-w-0 flex-1 items-end gap-px overflow-x-auto [scrollbar-width:none]"
			>
				{stacked
					? null
					: group.tabs.map((tab) => {
							const active = tab.id === group.active;
							const pinned = tab.kind === "reader";
							return (
								<motion.div
									key={tab.id}
									layout="position"
									transition={{
										type: "spring",
										duration: 0.25,
										bounce: 0,
									}}
									role="tab"
									tabIndex={active ? 0 : -1}
									aria-selected={active}
									data-tab-id={tab.id}
									data-pinned={pinned || undefined}
									onPointerDown={(event) =>
										onPointerDown(event, tab)
									}
									onPointerMove={onPointerMove}
									onPointerUp={endDrag}
									onPointerCancel={endDrag}
									onAuxClick={(event) => {
										if (event.button === 1 && !pinned)
											actions.onClose(tab.id);
									}}
									onKeyDown={(event) => {
										if (event.key === "Enter")
											actions.onActivate(tab.id);
									}}
									className={cn(
										"group/tab relative flex h-8 min-w-24 flex-[0_1_12rem] cursor-default touch-none items-center gap-1 rounded-t-lg ps-3 pe-1 text-[0.8rem] select-none",
										active
											? "z-10 -mb-px border border-b-0 border-line bg-canvas"
											: "text-ink-soft hover:bg-canvas/60 hover:text-ink",
										active &&
											(focused
												? "text-ink"
												: "text-ink-soft"),
										dragging === tab.id &&
											"opacity-80 shadow-lg",
									)}
								>
									<span
										{...titleLang(tab)}
										className="min-w-0 flex-1 truncate"
									>
										{titleOf(tab)}
									</span>
									{pinned ? (
										<span
											title="Pinned"
											className="grid size-6 shrink-0 place-items-center text-ink-faint"
										>
											<Pin
												aria-label="Pinned"
												className="size-3.5 rotate-45"
											/>
										</span>
									) : (
										<button
											type="button"
											data-tab-close=""
											aria-label={`Close ${titleOf(tab)}`}
											title="Close"
											onClick={() =>
												actions.onClose(tab.id)
											}
											className={cn(
												"grid size-6 shrink-0 cursor-pointer place-items-center rounded text-ink-faint hover:bg-paper hover:text-ink",
												!active &&
													"opacity-0 group-hover/tab:opacity-100 focus-visible:opacity-100",
											)}
										>
											<X className="size-3.5" />
										</button>
									)}
								</motion.div>
							);
						})}
			</div>
			<GroupMenu
				group={group}
				stacked={stacked}
				onActivate={actions.onActivate}
				onToggleStack={onToggleStack}
				onCloseAll={onCloseAll}
			/>
		</div>
	);
}

/**
 * The ⌄ at a tab group's inline end: every tab in the group, then "Stack
 * tabs" and "Close all", as Obsidian's tab-group menu has them.
 */
function GroupMenu({
	group,
	stacked,
	onActivate,
	onToggleStack,
	onCloseAll,
}: {
	readonly group: Group;
	readonly stacked: boolean;
	readonly onActivate: (tabId: string) => void;
	readonly onToggleStack: () => void;
	readonly onCloseAll: () => void;
}) {
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!open) return;
		const onDown = (event: globalThis.PointerEvent) => {
			if (!rootRef.current?.contains(event.target as Node))
				setOpen(false);
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			event.preventDefault();
			setOpen(false);
		};
		document.addEventListener("pointerdown", onDown, true);
		document.addEventListener("keydown", onKey, true);
		return () => {
			document.removeEventListener("pointerdown", onDown, true);
			document.removeEventListener("keydown", onKey, true);
		};
	}, [open]);
	const pick = (run: () => void) => () => {
		run();
		setOpen(false);
	};
	return (
		<div ref={rootRef} className="relative mb-1 shrink-0">
			<button
				type="button"
				aria-label="Tab group menu"
				aria-haspopup="menu"
				aria-expanded={open}
				title="Tabs"
				onClick={() => setOpen((was) => !was)}
				className="grid size-7 cursor-pointer place-items-center rounded-md text-ink-faint hover:bg-canvas hover:text-ink"
			>
				<ChevronDown className="size-4" />
			</button>
			{open ? (
				<div
					role="menu"
					className="absolute end-0 top-full z-40 mt-1 grid w-56 gap-px rounded-lg border border-line bg-paper p-1 text-sm text-ink shadow-xl"
				>
					{group.tabs.map((tab) => (
						<MenuItem
							key={tab.id}
							onClick={pick(() => onActivate(tab.id))}
							icon={
								tab.id === group.active ? (
									<Check className="size-3.5" />
								) : null
							}
						>
							<span
								{...titleLang(tab)}
								className="min-w-0 flex-1 truncate"
							>
								{titleOf(tab)}
							</span>
							{tab.kind === "reader" ? (
								<Pin
									aria-label="Pinned"
									className="size-3 rotate-45 text-ink-faint"
								/>
							) : null}
						</MenuItem>
					))}
					<hr className="my-1 border-line" />
					<MenuItem
						onClick={pick(onToggleStack)}
						icon={stacked ? <Check className="size-3.5" /> : null}
					>
						Stack tabs
					</MenuItem>
					<MenuItem onClick={pick(onCloseAll)} icon={null}>
						Close all
					</MenuItem>
				</div>
			) : null}
		</div>
	);
}

function MenuItem({
	onClick,
	icon,
	children,
}: {
	readonly onClick: () => void;
	readonly icon: ReactNode;
	readonly children: ReactNode;
}) {
	return (
		<button
			type="button"
			role="menuitem"
			onClick={onClick}
			className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-start hover:bg-canvas"
		>
			<span className="grid size-4 shrink-0 place-items-center">
				{icon}
			</span>
			{children}
		</button>
	);
}

/**
 * A stacked pane's spine at its inline start: its tab, turned on its side.
 * Pressing it shows the pane; the reader's carries its pin, a Sheet's ×.
 */
export function Spine({
	tab,
	active,
	actions,
}: {
	readonly tab: Tab;
	readonly active: boolean;
	readonly actions: TabActions;
}) {
	const pinned = tab.kind === "reader";
	return (
		<div
			role="tab"
			tabIndex={active ? 0 : -1}
			aria-selected={active}
			data-tab-id={tab.id}
			onPointerDown={(event) => {
				if (event.button === 1) event.preventDefault();
				else if (
					event.button === 0 &&
					!(event.target as Element).closest("[data-tab-close]")
				)
					actions.onActivate(tab.id);
			}}
			onAuxClick={(event) => {
				if (event.button === 1 && !pinned) actions.onClose(tab.id);
			}}
			onKeyDown={(event) => {
				if (event.key === "Enter") actions.onActivate(tab.id);
			}}
			className={cn(
				"flex w-9 shrink-0 cursor-default flex-col items-center gap-2 border-e border-line bg-paper py-1.5 text-[0.8rem] select-none",
				active ? "text-ink" : "text-ink-soft hover:text-ink",
			)}
		>
			{pinned ? (
				<span title="Pinned" className="grid size-6 place-items-center">
					<Pin
						aria-label="Pinned"
						className="size-3.5 rotate-45 text-ink-faint"
					/>
				</span>
			) : (
				<button
					type="button"
					data-tab-close=""
					aria-label={`Close ${titleOf(tab)}`}
					title="Close"
					onClick={() => actions.onClose(tab.id)}
					className="grid size-6 cursor-pointer place-items-center rounded text-ink-faint hover:bg-canvas hover:text-ink"
				>
					<X className="size-3.5" />
				</button>
			)}
			<span
				{...titleLang(tab)}
				className="min-h-0 truncate [writing-mode:vertical-rl]"
			>
				{titleOf(tab)}
			</span>
		</div>
	);
}
