import { cn } from "lego";
import {
	ChevronDown,
	ChevronsDownUp,
	GripVertical,
	Layers,
	PanelRightClose,
	X,
} from "lucide-react";
import {
	AnimatePresence,
	motion,
	Reorder,
	useDragControls,
} from "motion/react";
import { useRef, useState } from "react";
import type { FakeCardLink, FixtureWord } from "@/fixtures";
import { useFrameSize, usePlaygroundEnv } from "@/shell";
import { ItemMenu, type MenuAction } from "./item-menu";
import {
	EntryLine,
	IconButton,
	LookupCards,
	newestWordId,
	ReaderText,
} from "./lookup";
import { type Stack, type StackEntry, stackKey } from "./stack";

/** Below this frame width the stack is a panel over the text, as on a phone. */
const panelBelow = 640;

/**
 * Logseq's right sidebar: each lookup joins a stack beside the text,
 * newest on top. Opening one folds the others to their header lines when
 * `foldOlder` is on. Headers expand and collapse, drag to reorder, and
 * close; ⋯ collapses or closes the others.
 */
export function SidebarStack({
	stack,
	foldOlder,
}: {
	readonly stack: Stack;
	readonly foldOlder: boolean;
}) {
	const env = usePlaygroundEnv();
	const { inlineSize } = useFrameSize();
	const narrow = inlineSize > 0 && inlineSize < panelBelow;
	const keys = stack.entries.map((entry) => entry.key);
	const top = keys.at(-1) ?? null;

	const [expanded, setExpanded] = useState<ReadonlySet<string>>(
		() => new Set(top ? [top] : []),
	);
	const [panelOpen, setPanelOpen] = useState(false);
	const [dragOrder, setDragOrder] = useState<readonly string[] | null>(null);
	const dragOrderRef = useRef(dragOrder);
	dragOrderRef.current = dragOrder;

	// Back, forward or a close changed the newest lookup: open it, so each
	// step of the stack shows the lookup it lands on.
	const [seenTop, setSeenTop] = useState(top);
	if (top !== seenTop) {
		setSeenTop(top);
		if (top && !expanded.has(top))
			setExpanded(
				foldOlder ? new Set([top]) : new Set([...expanded, top]),
			);
	}

	const open = (target: FixtureWord | string) => {
		const key = stackKey(target);
		const rest = keys.filter((other) => other !== key);
		stack.write(
			[...rest, key],
			rest.length === keys.length ? { dealt: key } : {},
		);
		setExpanded(foldOlder ? new Set([key]) : new Set([...expanded, key]));
		if (narrow) setPanelOpen(true);
	};
	const close = (closing: readonly string[]) =>
		stack.write(keys.filter((key) => !closing.includes(key)));
	const setOpen = (key: string, isOpen: boolean) => {
		const next = new Set(expanded);
		if (isOpen) next.add(key);
		else next.delete(key);
		setExpanded(next);
	};
	const commitDrag = () => {
		const order = dragOrderRef.current;
		setDragOrder(null);
		if (!order) return;
		const oldestFirst = [...order].reverse();
		setSeenTop(oldestFirst.at(-1) ?? null);
		stack.write(oldestFirst, { replace: true });
	};

	const newestFirst = [...stack.entries].reverse();
	const order =
		dragOrder && dragOrder.length === keys.length
			? dragOrder
			: newestFirst.map((entry) => entry.key);
	const byKey = new Map(stack.entries.map((entry) => [entry.key, entry]));

	const panel = (
		<div className="flex h-full flex-col bg-canvas">
			<div className="flex items-center gap-1 border-b border-line px-3 py-2 text-sm">
				<span className="font-medium text-ink">Lookups</span>
				<span className="text-ink-muted tabular-nums">
					{keys.length}
				</span>
				<span className="flex-1" />
				<IconButton
					label="Collapse all"
					onClick={() => setExpanded(new Set())}
				>
					<ChevronsDownUp size={15} />
				</IconButton>
				<IconButton label="Close all" onClick={() => close(keys)}>
					<X size={15} />
				</IconButton>
				{narrow ? (
					<IconButton
						label="Back to the text"
						onClick={() => setPanelOpen(false)}
					>
						<PanelRightClose
							size={15}
							className="rtl:-scale-x-100"
						/>
					</IconButton>
				) : null}
			</div>
			<motion.div
				layoutScroll
				className="min-h-0 flex-1 overflow-y-auto p-2"
			>
				{keys.length === 0 ? (
					<p className="p-3 text-sm text-ink-muted">
						No lookups yet.
					</p>
				) : (
					<Reorder.Group
						axis="y"
						values={[...order]}
						onReorder={setDragOrder}
						className="grid grid-cols-1 gap-1.5"
					>
						{order.map((key) => {
							const entry = byKey.get(key);
							if (!entry) return null;
							const others = keys.filter((k) => k !== key);
							return (
								<SidebarItem
									key={key}
									entry={entry}
									expanded={expanded.has(key)}
									dealing={stack.dealing === key}
									onDealt={stack.settle}
									onToggle={() =>
										setOpen(key, !expanded.has(key))
									}
									onDragEnd={commitDrag}
									onClose={() => close([key])}
									onLinkClick={(link) => open(link.word)}
									actions={[
										{
											label: expanded.has(key)
												? "Collapse"
												: "Expand",
											run: () =>
												setOpen(
													key,
													!expanded.has(key),
												),
										},
										{
											label: "Collapse others",
											run: () =>
												setExpanded(
													new Set(
														expanded.has(key)
															? [key]
															: [],
													),
												),
											disabled: others.every(
												(k) => !expanded.has(k),
											),
										},
										{
											label: "Close",
											run: () => close([key]),
										},
										{
											label: "Close others",
											run: () => close(others),
											disabled: others.length === 0,
										},
									]}
									reducedMotion={env.reducedMotion}
								/>
							);
						})}
					</Reorder.Group>
				)}
			</motion.div>
		</div>
	);

	const reader = (
		<div className="h-full min-w-0 flex-1 overflow-y-auto">
			<ReaderText
				className="mx-auto max-w-[38rem] p-5 pb-24 @min-[640px]/frame:p-8"
				selectedWordId={newestWordId(stack.entries)}
				onWordClick={({ word }) => open(word)}
			/>
		</div>
	);

	if (!narrow)
		return (
			<div className="flex h-full">
				{reader}
				<aside className="h-full w-[min(24rem,46cqi)] shrink-0 border-s border-line">
					{panel}
				</aside>
			</div>
		);

	const offstage = env.dir === "rtl" ? "-100%" : "100%";
	return (
		<div className="relative h-full">
			{reader}
			{keys.length > 0 && !panelOpen ? (
				<button
					type="button"
					onClick={() => setPanelOpen(true)}
					className="absolute end-4 bottom-4 flex cursor-pointer items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-sm text-ink shadow-[0_8px_24px_-12px_oklch(0%_0_0/0.6)]"
				>
					<Layers size={15} />
					Lookups
					<span className="text-ink-muted tabular-nums">
						{keys.length}
					</span>
				</button>
			) : null}
			<AnimatePresence>
				{panelOpen ? (
					<motion.aside
						key="panel"
						initial={{ x: offstage }}
						animate={{ x: 0 }}
						exit={{ x: offstage }}
						transition={{
							type: "spring",
							duration: 0.35,
							bounce: 0,
						}}
						className="absolute inset-0 z-20"
					>
						{panel}
					</motion.aside>
				) : null}
			</AnimatePresence>
		</div>
	);
}

function SidebarItem({
	entry,
	expanded,
	dealing,
	onDealt,
	onToggle,
	onDragEnd,
	onClose,
	onLinkClick,
	actions,
	reducedMotion,
}: {
	readonly entry: StackEntry;
	readonly expanded: boolean;
	readonly dealing: boolean;
	readonly onDealt: () => void;
	readonly onToggle: () => void;
	readonly onDragEnd: () => void;
	readonly onClose: () => void;
	readonly onLinkClick: (link: FakeCardLink) => void;
	readonly actions: readonly MenuAction[];
	readonly reducedMotion: boolean;
}) {
	const controls = useDragControls();
	return (
		<Reorder.Item
			value={entry.key}
			dragListener={false}
			dragControls={controls}
			onDragEnd={onDragEnd}
			className="list-none rounded-lg border border-line bg-paper"
			whileDrag={{
				boxShadow: "0 16px 32px -12px oklch(0% 0 0 / 0.5)",
				zIndex: 1,
			}}
		>
			<div className="flex items-center gap-0.5 p-1 text-sm">
				<button
					type="button"
					aria-label={`Drag ${entry.title} to reorder`}
					title="Drag to reorder"
					onPointerDown={(event) => controls.start(event)}
					className="grid size-7 shrink-0 cursor-grab touch-none place-items-center rounded-md text-ink-faint hover:text-ink active:cursor-grabbing"
				>
					<GripVertical size={15} />
				</button>
				<button
					type="button"
					aria-expanded={expanded}
					onClick={onToggle}
					className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-md px-1 py-1 text-start hover:bg-canvas"
				>
					<ChevronDown
						size={14}
						className={cn(
							"shrink-0 text-ink-muted transition-transform",
							!expanded && "-rotate-90 rtl:rotate-90",
						)}
					/>
					<EntryLine entry={entry} />
				</button>
				<ItemMenu label={`More for ${entry.title}`} actions={actions} />
				<IconButton label={`Close ${entry.title}`} onClick={onClose}>
					<X size={14} />
				</IconButton>
			</div>
			<AnimatePresence initial={false}>
				{expanded ? (
					<motion.div
						key="body"
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={
							reducedMotion
								? { duration: 0 }
								: { type: "spring", duration: 0.3, bounce: 0 }
						}
						className="overflow-hidden"
					>
						<div className="px-2 pt-1 pb-2">
							<LookupCards
								entry={entry}
								dealing={dealing}
								onDealt={onDealt}
								onLinkClick={onLinkClick}
							/>
						</div>
					</motion.div>
				) : null}
			</AnimatePresence>
		</Reorder.Item>
	);
}
