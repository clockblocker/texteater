import { cn } from "lego";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import type { FixtureWord } from "@/fixtures";
import { DemoInspector, InspectorSection, usePlaygroundEnv } from "@/shell";
import type { CardWordClick } from "./clickable-words";
import { type Lookup, LookupDeck } from "./lookup-deck";
import {
	IconButton,
	ReaderStage,
	Surface,
	useAnchoredBox,
	useEscape,
} from "./stage";

type Entry = {
	readonly lookup: Lookup;
	/** The word clicked in this entry to reach the next one. */
	readonly via: string | null;
};

type Move = "push" | "back";

/**
 * History inside one surface, as tf-demo's Covers stack over their Ground
 * (tf-demo ADR 0008): a word clicked inside the lookup replaces its
 * content and pushes the trail, back pops it, and there is no forward. The
 * breadcrumb shows the trail; a crumb pops back to its level.
 */
export function HistorySurface() {
	const { dir } = usePlaygroundEnv();
	const contentRef = useRef<HTMLDivElement>(null);
	const nextKey = useRef(0);
	const [anchorId, setAnchorId] = useState<string | null>(null);
	const [trail, setTrail] = useState<readonly Entry[]>([]);
	const [move, setMove] = useState<Move>("push");
	const { box, containerWidth } = useAnchoredBox(contentRef, anchorId);
	const at = trail.length - 1;
	const current = trail[at];

	const entry = (word: FixtureWord | string): Entry => {
		nextKey.current += 1;
		return {
			lookup: {
				key: `h${nextKey.current}`,
				word,
				label: typeof word === "string" ? word : word.text,
			},
			via: null,
		};
	};
	const openFromText = (word: FixtureWord) => {
		setAnchorId(word.id);
		setTrail([entry(word)]);
		setMove("push");
	};
	const push = (click: CardWordClick) => {
		const from = trail[at];
		if (!from) return;
		setTrail([
			...trail.slice(0, at),
			{ ...from, via: click.anchorId },
			entry(click.word),
		]);
		setMove("push");
	};
	/** Pops the trail down to `index`, as pressing back that many times. */
	const pop = (index: number) => {
		if (index < 0 || index >= at) return;
		setMove("back");
		setTrail(trail.slice(0, index + 1));
	};
	const close = () => {
		setAnchorId(null);
		setTrail([]);
	};
	useEscape(close);

	// Pushed content comes in from the inline end, popped from the start.
	const inward = (dir === "rtl" ? -1 : 1) * (move === "back" ? -1 : 1);

	return (
		<>
			<DemoInspector>
				<InspectorSection title="Readout">
					<p className="text-xs text-ink-soft">
						{current
							? `Trail of ${trail.length}; back pops ${at === 0 ? "nothing" : `to ${trail[at - 1]?.lookup.label}`}.`
							: "No lookup open"}
					</p>
				</InspectorSection>
			</DemoInspector>
			<ReaderStage
				contentRef={contentRef}
				selectedWordId={current ? anchorId : null}
				onWord={openFromText}
				onDismiss={close}
			>
				<AnimatePresence>
					{current && box ? (
						<Surface
							key="surface"
							id="surface"
							label={`Lookup of ${current.lookup.label}`}
							box={box}
							containerWidth={containerWidth}
							zIndex={10}
							header={
								<>
									<IconButton
										label="Back"
										disabled={at === 0}
										onClick={() => pop(at - 1)}
									>
										<ChevronLeft className="size-4 rtl:-scale-x-100" />
									</IconButton>
									<Breadcrumb trail={trail} onPop={pop} />
									<IconButton label="Close" onClick={close}>
										<X className="size-4" />
									</IconButton>
								</>
							}
						>
							<AnimatePresence mode="wait" initial={false}>
								<motion.div
									key={current.lookup.key}
									initial={{ opacity: 0, x: 20 * inward }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -20 * inward }}
									transition={{
										duration: 0.14,
										ease: "easeOut",
									}}
								>
									<LookupDeck
										lookup={current.lookup}
										instant={move !== "push"}
										selectedId={current.via}
										onWord={push}
									/>
								</motion.div>
							</AnimatePresence>
						</Surface>
					) : null}
				</AnimatePresence>
			</ReaderStage>
		</>
	);
}

/** The trail; the current entry stands out, a crumb below pops to it. */
function Breadcrumb({
	trail,
	onPop,
}: {
	readonly trail: readonly Entry[];
	readonly onPop: (index: number) => void;
}) {
	const at = trail.length - 1;
	const listRef = useRef<HTMLOListElement>(null);
	// Keeps the current crumb in view when the trail outgrows the header.
	useLayoutEffect(() => {
		const list = listRef.current;
		const crumb = list?.querySelector("[aria-current]");
		if (!list || !crumb) return;
		const outer = list.getBoundingClientRect();
		const inner = crumb.getBoundingClientRect();
		if (inner.right > outer.right)
			list.scrollLeft += inner.right - outer.right;
		else if (inner.left < outer.left)
			list.scrollLeft -= outer.left - inner.left;
	}, [at, trail.length]);
	return (
		<nav aria-label="Lookup trail" className="min-w-0 flex-1">
			<ol
				ref={listRef}
				className="flex items-center gap-0.5 overflow-x-auto text-sm whitespace-nowrap [scrollbar-width:none]"
			>
				{trail.map((item, index) => (
					<li
						key={item.lookup.key}
						className="flex items-center gap-0.5"
					>
						{index > 0 ? (
							<ChevronRight
								aria-hidden="true"
								className="size-3 shrink-0 text-ink-faint rtl:-scale-x-100"
							/>
						) : null}
						<button
							type="button"
							aria-current={index === at ? "page" : undefined}
							onClick={(event) => {
								event.stopPropagation();
								onPop(index);
							}}
							className={cn(
								"cursor-pointer rounded px-1 py-0.5 hover:bg-paper",
								index < at
									? "text-ink-soft"
									: "font-semibold text-ink",
							)}
						>
							{item.lookup.label}
						</button>
					</li>
				))}
			</ol>
		</nav>
	);
}
