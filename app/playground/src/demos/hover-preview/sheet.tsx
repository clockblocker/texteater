import { cn } from "lego";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useLayoutEffect, useRef } from "react";
import { usePlaygroundEnv } from "@/shell";
import { resolveEntry } from "./entries";
import { LinkedCard } from "./notes";

/** One stop on a Sheet's trail. */
export type SheetEntry = {
	readonly key: string;
	readonly word: string;
};

export type SheetHistory = {
	/** The Cover stack, bottom first; the last stop is the one shown. */
	readonly trail: readonly SheetEntry[];
	/** How the last move went, so content slides the matching way. */
	readonly move: "push" | "back";
};

/**
 * A Sheet in History mode, as tf-demo's Covers stack over their Ground
 * (tf-demo ADR 0008): following a link pushes a Cover, back pops one, and
 * there is no forward. The breadcrumb shows the stack; a crumb pops back
 * to its level. Back on the bottom Cover closes the Sheet. It covers the
 * reader; the links in it are a preview host, so Cmd-hover works here as
 * in a Card.
 */
export function HistorySheet({
	history,
	onPop,
	onClose,
}: {
	readonly history: SheetHistory;
	/** Pops the stack down to `index`; -1 pops the bottom Cover too. */
	readonly onPop: (index: number) => void;
	readonly onClose: () => void;
}) {
	const { dir, reducedMotion } = usePlaygroundEnv();
	const { trail, move } = history;
	const at = trail.length - 1;
	const current = trail[at];
	const bodyRef = useRef<HTMLDivElement>(null);
	// A new stop starts at its top.
	useLayoutEffect(() => {
		if (current && bodyRef.current) bodyRef.current.scrollTop = 0;
	}, [current]);
	if (!current) return null;
	const cards = resolveEntry(current.word)
		.cards.filter((card) => card.kind !== "Attestation" || card.quote)
		.toReversed();
	// Pushed content comes in from the inline end, popped from the start.
	const inward = (dir === "rtl" ? -1 : 1) * (move === "back" ? -1 : 1);
	const shift = reducedMotion ? 0 : 24 * inward;

	return (
		<motion.section
			aria-label={`Sheet: ${current.word}`}
			data-hp-host="sheet"
			initial={reducedMotion ? false : { opacity: 0, y: 16 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
			transition={{ type: "spring", duration: 0.3, bounce: 0 }}
			className="absolute inset-0 z-20 flex flex-col bg-canvas text-ink"
		>
			<header className="flex min-h-11 shrink-0 items-center gap-1 border-b border-line px-2 py-1">
				<SheetButton label="Back" onClick={() => onPop(at - 1)}>
					<ChevronLeft className="size-4 rtl:-scale-x-100" />
				</SheetButton>
				<Breadcrumb trail={trail} onPop={onPop} />
				<SheetButton label="Close the Sheet" onClick={onClose}>
					<X className="size-4" />
				</SheetButton>
			</header>
			<div
				ref={bodyRef}
				className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
			>
				<AnimatePresence mode="wait" initial={false}>
					<motion.div
						key={current.key}
						initial={{ opacity: 0, x: shift }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: -shift }}
						transition={{
							duration: reducedMotion ? 0 : 0.14,
							ease: "easeOut",
						}}
						className="mx-auto grid max-w-[36rem] gap-3 px-4 py-5 @min-[640px]/frame:px-6"
					>
						{cards.map((card) => (
							<LinkedCard
								key={card.id}
								card={card}
								scope={`sheet~${current.key}`}
							/>
						))}
					</motion.div>
				</AnimatePresence>
			</div>
		</motion.section>
	);
}

function SheetButton({
	label,
	onClick,
	children,
}: {
	readonly label: string;
	readonly onClick: () => void;
	readonly children: ReactNode;
}) {
	return (
		<button
			type="button"
			title={label}
			aria-label={label}
			onClick={onClick}
			className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-ink-soft hover:bg-paper hover:text-ink"
		>
			{children}
		</button>
	);
}

/** The Cover stack; the top stop stands out, a crumb below pops to it. */
function Breadcrumb({
	trail,
	onPop,
}: {
	readonly trail: readonly SheetEntry[];
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
		<nav aria-label="Sheet trail" className="min-w-0 flex-1">
			<ol
				ref={listRef}
				className="flex items-center gap-0.5 overflow-x-auto text-sm whitespace-nowrap [scrollbar-width:none]"
			>
				{trail.map((item, index) => (
					<li key={item.key} className="flex items-center gap-0.5">
						{index > 0 ? (
							<ChevronRight
								aria-hidden="true"
								className="size-3 shrink-0 text-ink-faint rtl:-scale-x-100"
							/>
						) : null}
						<button
							type="button"
							lang="de"
							dir="ltr"
							aria-current={index === at ? "page" : undefined}
							onClick={() => onPop(index)}
							className={cn(
								"cursor-pointer rounded px-1 py-0.5 hover:bg-paper",
								index < at
									? "text-ink-soft"
									: "font-semibold text-ink",
							)}
						>
							{item.word}
						</button>
					</li>
				))}
			</ol>
		</nav>
	);
}
