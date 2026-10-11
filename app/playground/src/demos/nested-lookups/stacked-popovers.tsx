import { cn } from "lego";
import { Pin, X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { type FixtureWord, rectWithin } from "@/fixtures";
import { useFrameSize, usePlaygroundEnv } from "@/shell";
import type { CardWordClick } from "./clickable-words";
import { type Lookup, LookupDeck } from "./lookup-deck";
import { type Box, placeBeside, placeUnder } from "./placement";
import {
	IconButton,
	ReaderStage,
	revealBox,
	Surface,
	useEscape,
} from "./stage";

type Popover = {
	readonly id: string;
	readonly lookup: Lookup;
	/** The popover it was opened from; null when opened from the text. */
	readonly parentId: string | null;
	/** 1 when opened from the text, one more for each nesting. */
	readonly level: number;
	/** The `data-word-id` of the word it was opened from. */
	readonly anchorId: string;
	readonly pinned: boolean;
};

type Placement = "over" | "beside";

const placementLabels: Record<Placement, string> = {
	over: "Over the word",
	beside: "Beside its parent",
};

/**
 * Stacked child popovers, by SiYuan's rule: a lookup opened at a level
 * replaces the unpinned popovers at that level and deeper; opened from
 * inside a popover, it nests one level deeper; a pinned popover survives
 * both, until it is closed on its own or with Close all.
 */
export function StackedPopovers() {
	const { dir, reducedMotion } = usePlaygroundEnv();
	const { inlineSize } = useFrameSize();
	const contentRef = useRef<HTMLDivElement>(null);
	const nextId = useRef(0);
	const [placement, setPlacement] = useState<Placement>("over");
	const [popovers, setPopovers] = useState<readonly Popover[]>([]);
	const [layout, setLayout] = useState<{
		boxes: ReadonlyMap<string, Box>;
		containerWidth: number;
	}>({ boxes: new Map(), containerWidth: 0 });
	const revealId = useRef<string | null>(null);

	const open = (
		parent: Popover | null,
		word: FixtureWord | string,
		anchorId: string,
	) => {
		const level = parent ? parent.level + 1 : 1;
		nextId.current += 1;
		const id = `pop${nextId.current}`;
		revealId.current = id;
		const label = typeof word === "string" ? word : word.text;
		setPopovers((current) => [
			...current.filter((p) => p.pinned || p.level < level),
			{
				id,
				lookup: { key: id, word, label },
				parentId: parent?.id ?? null,
				level,
				anchorId,
				pinned: false,
			},
		]);
	};

	/** Closes one popover and the unpinned popovers opened from it. */
	const close = (id: string) =>
		setPopovers((current) => {
			const gone = new Set([id]);
			for (const p of current)
				if (p.parentId && gone.has(p.parentId) && !p.pinned)
					gone.add(p.id);
			return current.filter((p) => !gone.has(p.id));
		});
	const togglePin = (id: string) =>
		setPopovers((current) =>
			current.map((p) => (p.id === id ? { ...p, pinned: !p.pinned } : p)),
		);
	const closeUnpinned = () =>
		setPopovers((current) => current.filter((p) => p.pinned));

	useEscape(() => {
		const last = popovers.findLast((p) => !p.pinned);
		if (last) close(last.id);
	});

	useLayoutEffect(() => {
		const content = contentRef.current;
		if (!content) return;
		const next = layoutPopovers(
			content,
			popovers,
			layout.boxes,
			placement,
			dir,
		);
		setLayout(next);
		const revealed = revealId.current
			? next.boxes.get(revealId.current)
			: undefined;
		if (revealed) {
			revealId.current = null;
			revealBox(content, revealed, reducedMotion);
		}
	}, [popovers, placement, dir, inlineSize]);

	const childAnchor = (id: string | null) =>
		popovers.findLast((p) => p.parentId === id)?.anchorId ?? null;
	const deepest = popovers.reduce((max, p) => Math.max(max, p.level), 0);

	return (
		<>
			<div className="grid gap-2 border-b border-line px-4 py-2 text-xs">
				<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
					<fieldset className="flex items-center gap-2">
						<legend className="float-start text-ink-muted">
							Child opens
						</legend>
						<div className="flex rounded-md border border-line bg-canvas p-0.5">
							{(["over", "beside"] as const).map((option) => (
								<button
									key={option}
									type="button"
									aria-pressed={option === placement}
									onClick={() => setPlacement(option)}
									className="cursor-pointer rounded px-2 py-0.5 text-ink-soft aria-pressed:bg-paper aria-pressed:text-ink aria-pressed:shadow-sm"
								>
									{placementLabels[option]}
								</button>
							))}
						</div>
					</fieldset>
					<span className="ms-auto text-ink-muted">
						depth {deepest}
					</span>
					<button
						type="button"
						disabled={popovers.length === 0}
						onClick={() => setPopovers([])}
						className="cursor-pointer rounded-md border border-line px-2 py-0.5 text-ink-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
					>
						Close all
					</button>
				</div>
				<ol
					aria-label="Open popovers"
					className="flex min-h-6 flex-wrap items-center gap-1 text-ink-soft"
				>
					{popovers.length === 0 ? (
						<li className="text-ink-muted">No popovers open</li>
					) : (
						popovers.map((p) => (
							<li
								key={p.id}
								className={cn(
									"flex items-center gap-1 rounded-full border border-line bg-canvas py-0.5 ps-1 pe-2",
									p.pinned && "border-link text-link",
								)}
							>
								<LevelBadge level={p.level} />
								{p.lookup.label}
								{p.pinned ? (
									<Pin
										aria-label="pinned"
										className="size-3"
									/>
								) : null}
							</li>
						))
					)}
				</ol>
			</div>
			<ReaderStage
				contentRef={contentRef}
				selectedWordId={childAnchor(null)}
				onWord={(word) => open(null, word, word.id)}
				onDismiss={closeUnpinned}
			>
				<AnimatePresence>
					{popovers.map((p, index) => {
						const box = layout.boxes.get(p.id);
						if (!box) return null;
						return (
							<Surface
								key={p.id}
								id={p.id}
								label={`Lookup of ${p.lookup.label}, level ${p.level}`}
								box={box}
								containerWidth={layout.containerWidth}
								zIndex={10 + index}
								className={cn(
									p.pinned &&
										"border-link ring-1 ring-link/40",
								)}
								header={
									<>
										<LevelBadge level={p.level} />
										<span className="min-w-0 flex-1 truncate text-sm text-ink">
											{p.lookup.label}
										</span>
										<IconButton
											label={p.pinned ? "Unpin" : "Pin"}
											pressed={p.pinned}
											onClick={() => togglePin(p.id)}
										>
											<Pin className="size-4" />
										</IconButton>
										<IconButton
											label="Close"
											onClick={() => close(p.id)}
										>
											<X className="size-4" />
										</IconButton>
									</>
								}
							>
								<LookupDeck
									lookup={p.lookup}
									selectedId={childAnchor(p.id)}
									onWord={(click: CardWordClick) =>
										open(p, click.word, click.anchorId)
									}
								/>
							</Surface>
						);
					})}
				</AnimatePresence>
			</ReaderStage>
		</>
	);
}

/**
 * Places each popover after its parent. A child's anchor is measured
 * inside its parent as drawn, then moved with the parent's new box. A
 * popover whose anchor is gone (its parent closed under a pin, or turned
 * to another Card) keeps its last box.
 */
function layoutPopovers(
	content: HTMLElement,
	popovers: readonly Popover[],
	previous: ReadonlyMap<string, Box>,
	placement: Placement,
	dir: "ltr" | "rtl",
): { boxes: ReadonlyMap<string, Box>; containerWidth: number } {
	const containerWidth = content.clientWidth;
	const boxes = new Map<string, Box>();
	const find = (selector: string) => content.querySelector(selector);
	for (const p of popovers) {
		const anchorElement = find(
			`[data-word-id="${CSS.escape(p.anchorId)}"]`,
		);
		const kept = previous.get(p.id);
		if (!anchorElement) {
			if (kept) boxes.set(p.id, kept);
			continue;
		}
		let anchor = rectWithin(anchorElement.getBoundingClientRect(), content);
		const parentBox = p.parentId ? boxes.get(p.parentId) : undefined;
		const parentElement = find(`[data-surface-id="${p.parentId}"]`);
		if (parentBox && parentElement) {
			const drawn = rectWithin(
				parentElement.getBoundingClientRect(),
				content,
			);
			anchor = new DOMRect(
				anchor.x - drawn.x + parentBox.left,
				anchor.y - drawn.y + parentBox.top,
				anchor.width,
				anchor.height,
			);
		}
		const beside =
			placement === "beside" && parentBox
				? placeBeside(parentBox, anchor, containerWidth, dir)
				: null;
		const placed = beside ?? placeUnder(anchor, containerWidth, dir);
		boxes.set(p.id, clearOf([...boxes.values()], placed, dir));
	}
	return { boxes, containerWidth };
}

/**
 * `box`, cascaded down and toward the inline end while it would land
 * almost exactly on an earlier box, so a pinned popover never hides
 * under the one that replaced its sibling.
 */
function clearOf(earlier: readonly Box[], box: Box, dir: "ltr" | "rtl"): Box {
	const step = dir === "rtl" ? -28 : 28;
	let placed = box;
	while (
		earlier.some(
			(other) =>
				Math.abs(other.left - placed.left) < 24 &&
				Math.abs(other.top - placed.top) < 24,
		)
	)
		placed = { ...placed, left: placed.left + step, top: placed.top + 32 };
	return placed;
}

/** The popover's nesting level as dots and a number: ●●○ 2. */
function LevelBadge({ level }: { readonly level: number }) {
	return (
		<span
			title={`Level ${level}`}
			className="flex shrink-0 items-center gap-0.5 rounded-full bg-paper px-1.5 py-0.5 font-mono text-[0.65rem] text-ink-muted"
		>
			{Array.from({ length: Math.min(level, 4) }, (_, dot) => (
				<span
					key={dot}
					aria-hidden="true"
					className="size-1.5 rounded-full bg-current"
				/>
			))}
			<span className="ms-0.5">L{level}</span>
		</span>
	);
}
