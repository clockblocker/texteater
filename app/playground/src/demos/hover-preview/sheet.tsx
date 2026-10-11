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
	readonly trail: readonly SheetEntry[];
	readonly at: number;
	/** How the last move went, so content slides the matching way. */
	readonly move: "push" | "back" | "forward";
};

/**
 * A Sheet in History mode, as an Obsidian tab keeps it: following a link
 * replaces the Sheet's content and pushes the trail; back and forward walk
 * it, and the breadcrumb jumps anywhere along it. A push from the middle
 * of the trail drops what lay ahead, as a browser does. It covers the
 * reader as a Cover covers its Ground; the links in it are a preview
 * host, so Cmd-hover works here as in a Card.
 */
export function HistorySheet({
	history,
	onGo,
	onClose,
}: {
	readonly history: SheetHistory;
	readonly onGo: (index: number) => void;
	readonly onClose: () => void;
}) {
	const { dir, reducedMotion } = usePlaygroundEnv();
	const { trail, at, move } = history;
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
	// Forward content comes in from the inline end, back from the start.
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
				<SheetButton
					label="Back"
					disabled={at === 0}
					onClick={() => onGo(at - 1)}
				>
					<ChevronLeft className="size-4 rtl:-scale-x-100" />
				</SheetButton>
				<SheetButton
					label="Forward"
					disabled={at === trail.length - 1}
					onClick={() => onGo(at + 1)}
				>
					<ChevronRight className="size-4 rtl:-scale-x-100" />
				</SheetButton>
				<Breadcrumb trail={trail} at={at} onGo={onGo} />
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
	disabled,
	children,
}: {
	readonly label: string;
	readonly onClick: () => void;
	readonly disabled?: boolean;
	readonly children: ReactNode;
}) {
	return (
		<button
			type="button"
			title={label}
			aria-label={label}
			disabled={disabled}
			onClick={onClick}
			className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-ink-soft hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
		>
			{children}
		</button>
	);
}

/** The whole trail; the current stop stands out, the ones ahead fade. */
function Breadcrumb({
	trail,
	at,
	onGo,
}: {
	readonly trail: readonly SheetEntry[];
	readonly at: number;
	readonly onGo: (index: number) => void;
}) {
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
							onClick={() => onGo(index)}
							className={cn(
								"cursor-pointer rounded px-1 py-0.5 hover:bg-paper",
								index < at && "text-ink-soft",
								index === at && "font-semibold text-ink",
								index > at && "text-ink-faint italic",
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
