import { cn } from "lego";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useLayoutEffect, useRef } from "react";
import { langAttrs, type RunLanguage } from "@/fixtures";
import { usePlaygroundEnv } from "@/shell";

/** One Cover on the Pane's Cover stack. */
export type Cover = {
	readonly key: string;
	/** What the stop shows: the clicked form's Cards, or its lemma's. */
	readonly kind: "form" | "lemma";
	/** Its crumb. */
	readonly label: string;
	readonly lang: RunLanguage;
};

export type CoverStack = {
	/** Bottom first; the last Cover is the one shown. */
	readonly covers: readonly Cover[];
	/** How the last move went, so content slides the matching way. */
	readonly move: "push" | "back";
};

/**
 * hover-preview's Sheet, copied because demos don't import each other: a
 * Sheet in History mode, as tf-demo's Covers stack over their Ground
 * (tf-demo ADR 0008). Following a link pushes a Cover, Back pops one, and
 * there is no forward. The breadcrumb only displays the stack, the reader
 * (the Ground) first; a crumb pops back to its level. Back on the bottom
 * Cover reveals the reader, Deck and all, unchanged.
 */
export function Sheet({
	stack,
	ground,
	onPop,
	children,
}: {
	readonly stack: CoverStack;
	/** The reader's crumb: the Text's title and language. */
	readonly ground: { readonly title: string; readonly lang: RunLanguage };
	/** Pops the stack down to `index`; -1 pops every Cover. */
	readonly onPop: (index: number) => void;
	/** The top Cover's content. */
	readonly children: ReactNode;
}) {
	const { dir, reducedMotion } = usePlaygroundEnv();
	const { covers, move } = stack;
	const at = covers.length - 1;
	const current = covers[at];
	const bodyRef = useRef<HTMLDivElement>(null);
	// A new Cover starts at its top.
	useLayoutEffect(() => {
		if (current && bodyRef.current) bodyRef.current.scrollTop = 0;
	}, [current]);
	if (!current) return null;
	// Pushed content comes in from the inline end, popped from the start.
	const inward = (dir === "rtl" ? -1 : 1) * (move === "back" ? -1 : 1);
	const shift = reducedMotion ? 0 : 24 * inward;

	return (
		<motion.section
			aria-label={`Sheet: ${current.label}`}
			data-lh-host="sheet"
			initial={reducedMotion ? false : { opacity: 0, y: 16 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
			transition={{ type: "spring", duration: 0.3, bounce: 0 }}
			className="absolute inset-0 z-20 flex flex-col bg-canvas text-ink"
		>
			<header className="flex min-h-11 shrink-0 items-center gap-1 border-b border-line px-2 py-1">
				<button
					type="button"
					title="Back"
					aria-label="Back"
					onClick={() => onPop(at - 1)}
					className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-ink-soft hover:bg-paper hover:text-ink"
				>
					<ChevronLeft className="size-4 rtl:-scale-x-100" />
				</button>
				<Breadcrumb ground={ground} covers={covers} onPop={onPop} />
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
						{children}
					</motion.div>
				</AnimatePresence>
			</div>
		</motion.section>
	);
}

/** The Cover stack after the reader; the top Cover stands out. */
function Breadcrumb({
	ground,
	covers,
	onPop,
}: {
	readonly ground: { readonly title: string; readonly lang: RunLanguage };
	readonly covers: readonly Cover[];
	readonly onPop: (index: number) => void;
}) {
	const at = covers.length - 1;
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
	}, [at, covers.length]);
	const crumbs = [
		{ key: "ground", label: ground.title, lang: ground.lang },
		...covers,
	];
	return (
		<nav aria-label="Cover stack" className="min-w-0 flex-1">
			<ol
				ref={listRef}
				className="flex items-center gap-0.5 overflow-x-auto text-sm whitespace-nowrap [scrollbar-width:none]"
			>
				{crumbs.map((crumb, index) => {
					const level = index - 1;
					return (
						<li
							key={crumb.key}
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
								{...langAttrs(crumb.lang)}
								aria-current={level === at ? "page" : undefined}
								onClick={() => onPop(level)}
								className={cn(
									"cursor-pointer rounded px-1 py-0.5 hover:bg-paper",
									level < at
										? "text-ink-soft"
										: "font-semibold text-ink",
								)}
							>
								{crumb.label}
							</button>
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
