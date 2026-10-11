import { cn } from "lego";
import { ChevronLeft, ChevronRight, Pin, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useRef, useState } from "react";
import { germanText, langAttrs } from "@/fixtures";
import { usePlaygroundEnv } from "@/shell";
import { resolveEntry } from "./entries";
import { type Tab, titleOf } from "./tabs";

/**
 * Obsidian mobile's navigation bar at the frame's bottom: back and
 * forward for the tab on show, and the tab count in a box, which opens the
 * tab switcher.
 */
export function PhoneNavBar({
	tab,
	count,
	onGo,
	onSwitcher,
}: {
	readonly tab: Tab;
	readonly count: number;
	readonly onGo: (index: number) => void;
	readonly onSwitcher: () => void;
}) {
	const at = tab.kind === "sheet" ? tab.at : 0;
	const length = tab.kind === "sheet" ? tab.trail.length : 1;
	return (
		<nav
			aria-label="Navigation"
			className="flex h-12 shrink-0 items-center justify-around border-t border-line bg-paper pb-[env(safe-area-inset-bottom)]"
		>
			<BarButton
				label="Back"
				disabled={at === 0}
				onClick={() => onGo(at - 1)}
			>
				<ChevronLeft className="size-5 rtl:-scale-x-100" />
			</BarButton>
			<BarButton
				label="Forward"
				disabled={at >= length - 1}
				onClick={() => onGo(at + 1)}
			>
				<ChevronRight className="size-5 rtl:-scale-x-100" />
			</BarButton>
			<BarButton label={`${count} tabs`} onClick={onSwitcher}>
				<span className="grid size-5 place-items-center rounded-[0.3rem] border-[1.5px] border-current text-[0.65rem] leading-none font-semibold tabular-nums">
					{count}
				</span>
			</BarButton>
		</nav>
	);
}

function BarButton({
	label,
	disabled,
	onClick,
	children,
}: {
	readonly label: string;
	readonly disabled?: boolean;
	readonly onClick: () => void;
	readonly children: ReactNode;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			title={label}
			disabled={disabled}
			onClick={onClick}
			className="grid size-11 cursor-pointer place-items-center rounded-lg text-ink-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
		>
			{children}
		</button>
	);
}

/**
 * Obsidian mobile's tab switcher: every tab as a bordered preview, the
 * reader first, the one on show outlined. A tap shows a tab; × or a swipe
 * sideways closes a Sheet. The pinned reader carries a pin and stays.
 */
export function TabSwitcher({
	open,
	tabs,
	activeId,
	onPick,
	onClose,
	onDismiss,
}: {
	readonly open: boolean;
	readonly tabs: readonly Tab[];
	readonly activeId: string;
	readonly onPick: (tabId: string) => void;
	readonly onClose: (tabId: string) => void;
	readonly onDismiss: () => void;
}) {
	const { reducedMotion } = usePlaygroundEnv();
	return (
		<AnimatePresence>
			{open ? (
				<motion.div
					key="switcher"
					role="dialog"
					aria-label="Tabs"
					initial={
						reducedMotion ? false : { opacity: 0, scale: 1.03 }
					}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0, scale: reducedMotion ? 1 : 1.03 }}
					transition={{ duration: 0.16, ease: "easeOut" }}
					className="absolute inset-0 z-40 flex flex-col bg-canvas text-ink"
				>
					<div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
						<ul className="grid grid-cols-2 gap-3 p-3">
							<AnimatePresence initial={false}>
								{tabs.map((tab) => (
									<SwitcherCard
										key={tab.id}
										tab={tab}
										active={tab.id === activeId}
										onPick={() => onPick(tab.id)}
										onClose={() => onClose(tab.id)}
									/>
								))}
							</AnimatePresence>
						</ul>
					</div>
					<div className="flex h-12 shrink-0 items-center justify-end border-t border-line bg-paper px-3">
						<button
							type="button"
							onClick={onDismiss}
							className="cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium text-link"
						>
							Done
						</button>
					</div>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}

/** Swiped this far sideways, a Sheet's card closes it. */
const swipeClose = 72;

function SwitcherCard({
	tab,
	active,
	onPick,
	onClose,
}: {
	readonly tab: Tab;
	readonly active: boolean;
	readonly onPick: () => void;
	readonly onClose: () => void;
}) {
	const { reducedMotion } = usePlaygroundEnv();
	const pinned = tab.kind === "reader";
	const [dx, setDx] = useState(0);
	const swipe = useRef<{ x: number; y: number; moved: boolean } | null>(null);
	return (
		<motion.li
			layout={!reducedMotion}
			initial={false}
			exit={{ opacity: 0, x: reducedMotion ? 0 : Math.sign(dx) * 160 }}
			transition={{ duration: 0.18, ease: "easeOut" }}
			style={{
				transform: dx === 0 ? undefined : `translateX(${dx}px)`,
				opacity: 1 - Math.min(Math.abs(dx) / 240, 0.6),
			}}
			className="touch-pan-y"
			onPointerDown={(event) => {
				if (event.button !== 0) return;
				if ((event.target as Element).closest("[data-tab-close]"))
					return;
				swipe.current = {
					x: event.clientX,
					y: event.clientY,
					moved: false,
				};
				event.currentTarget.setPointerCapture(event.pointerId);
			}}
			onPointerMove={(event) => {
				const from = swipe.current;
				if (!from) return;
				const moveX = event.clientX - from.x;
				if (!from.moved && Math.abs(moveX) < 8) return;
				from.moved = true;
				// The pinned reader doesn't swipe away.
				if (!pinned) setDx(moveX);
			}}
			onPointerUp={() => {
				const from = swipe.current;
				swipe.current = null;
				if (!from) return;
				if (!from.moved) onPick();
				else if (Math.abs(dx) >= swipeClose) onClose();
				else setDx(0);
			}}
			onPointerCancel={() => {
				swipe.current = null;
				setDx(0);
			}}
		>
			<div
				data-switcher-tab={tab.id}
				className={cn(
					"flex h-44 flex-col overflow-hidden rounded-xl border bg-paper shadow-sm",
					active ? "border-link ring-2 ring-link/40" : "border-line",
				)}
			>
				<div className="flex h-8 shrink-0 items-center gap-1 border-b border-line ps-2.5 pe-1 text-xs">
					<button
						type="button"
						onClick={onPick}
						{...langAttrs(pinned ? "en" : "de")}
						className="min-w-0 flex-1 cursor-pointer truncate text-start font-medium"
					>
						{titleOf(tab)}
					</button>
					{pinned ? (
						<span
							title="Pinned"
							className="grid size-6 place-items-center"
						>
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
							onClick={onClose}
							className="grid size-6 cursor-pointer place-items-center rounded text-ink-faint hover:text-ink"
						>
							<X className="size-3.5" />
						</button>
					)}
				</div>
				<Thumbnail tab={tab} />
			</div>
		</motion.li>
	);
}

/** What a tab shows, small: the text's opening, or the Sheet's Reading. */
function Thumbnail({ tab }: { readonly tab: Tab }) {
	if (tab.kind === "reader") {
		const opening = germanText.paragraphs[0]?.sentences
			.map((sentence) =>
				sentence.tokens.map((token) => token.text).join(""),
			)
			.join(" ");
		return (
			<p
				{...langAttrs("de")}
				className="p-2.5 text-[0.7rem] leading-snug text-ink-soft"
			>
				{opening}
			</p>
		);
	}
	const word = tab.trail[tab.at]?.word ?? "";
	const reading = resolveEntry(word).cards.find(
		(card) => card.kind === "Reading",
	);
	return (
		<div className="grid gap-1 p-2.5 text-[0.7rem] leading-snug">
			<p className="text-base">
				<span aria-hidden="true">{reading?.emoji}</span>{" "}
				<span {...langAttrs("de")} className="font-semibold">
					{reading?.title}
				</span>
			</p>
			<p {...langAttrs("en")} className="text-ink-soft">
				{reading?.translations.join(", ")}
			</p>
			<p {...langAttrs("de")} className="text-ink-muted">
				{reading?.definition}
			</p>
		</div>
	);
}
