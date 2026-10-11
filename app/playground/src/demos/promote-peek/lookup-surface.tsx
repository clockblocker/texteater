import { cn } from "lego";
import {
	ArrowLeftIcon,
	CrosshairIcon,
	Maximize2Icon,
	PinIcon,
	PinOffIcon,
	XIcon,
} from "lucide-react";
import { motion } from "motion/react";
import {
	type CSSProperties,
	type Dispatch,
	memo,
	type ReactNode,
	type Ref,
} from "react";
import { CardSkeleton, CardStack } from "@/fixtures";
import { usePlaygroundEnv } from "@/shell";
import type { Level, Lookup, PromoteAction, Surface } from "./state";
import { useDealtCards } from "./use-dealt-cards";

/** One spring for every move between levels. */
const morph = { type: "spring", duration: 0.42, bounce: 0 } as const;

const levelClass: Record<Level, string> = {
	peek: "border border-line-strong shadow-[0_18px_40px_-16px_oklch(0%_0_0/0.55)]",
	pane: "border-line",
	sheet: "",
};

/**
 * A lookup at one level. Its `layoutId` is the surface's id, so the
 * surface morphs when it moves from peek to pane to sheet and back.
 * Header and body move by position only, so the morph never stretches
 * the words in them.
 */
export function LookupSurface({
	surface,
	level,
	fresh,
	follow,
	dispatch,
	backTo,
	surfaceRef,
	className,
	style,
}: {
	readonly surface: Surface;
	readonly level: Level;
	/** A new surface fades in; one that moved here morphs instead. */
	readonly fresh: boolean;
	readonly follow: boolean;
	readonly dispatch: Dispatch<PromoteAction>;
	/** Where the sheet's ← goes. */
	readonly backTo?: "peek" | "pane";
	readonly surfaceRef?: Ref<HTMLElement>;
	readonly className?: string;
	readonly style?: CSSProperties;
}) {
	const { resolution } = useDealtCards(surface.lookup);
	// Motion's reduced motion stops moves but keeps fades; under it a
	// surface appears and goes at once too, so no ghost lingers.
	const { reducedMotion } = usePlaygroundEnv();
	return (
		<motion.section
			ref={surfaceRef}
			layoutId={`promote-peek-${surface.id}`}
			layout
			transition={morph}
			initial={
				fresh && !reducedMotion
					? { opacity: 0, y: 6, scale: 0.98 }
					: false
			}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{
				opacity: 0,
				transition: { duration: reducedMotion ? 0 : 0.15 },
			}}
			aria-label={`${resolution.word}, ${level}`}
			data-level={level}
			className={cn(
				"flex flex-col overflow-hidden bg-paper text-ink",
				levelClass[level],
				className,
			)}
			style={{ borderRadius: level === "peek" ? 14 : 0, ...style }}
		>
			<motion.header
				layout="position"
				transition={morph}
				className={cn(
					"flex shrink-0 items-center gap-1 border-b border-line",
					level === "sheet" ? "px-2 py-2" : "py-1 ps-3 pe-1",
				)}
			>
				{level === "sheet" ? (
					<SheetHeading
						title={resolution.word}
						backTo={backTo ?? "pane"}
						dispatch={dispatch}
					/>
				) : (
					<>
						<h2 className="min-w-0 flex-1 truncate font-semibold">
							{resolution.word}
						</h2>
						{level === "peek" ? (
							<PeekControls dispatch={dispatch} />
						) : (
							<PaneControls follow={follow} dispatch={dispatch} />
						)}
					</>
				)}
			</motion.header>
			<motion.div
				layout="position"
				transition={morph}
				className="min-h-0 flex-1 overflow-auto overscroll-contain p-3"
			>
				<LookupBody
					lookup={surface.lookup}
					level={level}
					dispatch={dispatch}
				/>
			</motion.div>
		</motion.section>
	);
}

/** The Deck: Cards as they arrive, the ones still on their way as tails. */
const LookupBody = memo(function LookupBody({
	lookup,
	level,
	dispatch,
}: {
	readonly lookup: Lookup;
	readonly level: Level;
	readonly dispatch: Dispatch<PromoteAction>;
}) {
	const { cards, pending } = useDealtCards(lookup);
	return (
		<div
			className={cn(
				"grid gap-2",
				level === "sheet" && "mx-auto w-full max-w-[36rem] py-4",
			)}
		>
			<CardStack
				key={lookup.key}
				cards={cards}
				frontIndex={lookup.front ?? cards.length - 1}
				onFront={(index) => dispatch({ type: "front", level, index })}
				onLinkClick={(link) =>
					dispatch({
						type: "hop",
						level,
						query: link.word,
						at: performance.now(),
					})
				}
			/>
			{pending.map((kind) => (
				<CardSkeleton key={kind} kind={kind} collapsed />
			))}
		</div>
	);
});

function PeekControls({
	dispatch,
}: {
	readonly dispatch: Dispatch<PromoteAction>;
}) {
	return (
		<>
			<IconButton
				label="Pin as a pane"
				onClick={() => dispatch({ type: "pin" })}
			>
				<PinIcon />
			</IconButton>
			<IconButton
				label="Open as a sheet"
				onClick={() => dispatch({ type: "expand", from: "peek" })}
			>
				<Maximize2Icon />
			</IconButton>
		</>
	);
}

function PaneControls({
	follow,
	dispatch,
}: {
	readonly follow: boolean;
	readonly dispatch: Dispatch<PromoteAction>;
}) {
	return (
		<>
			<button
				type="button"
				aria-pressed={follow}
				title={
					follow
						? "Following: each click shows here"
						: "Frozen: a click opens a new peek"
				}
				onClick={() => dispatch({ type: "follow", follow: !follow })}
				className={cn(
					"me-1 flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring [&_svg]:size-3.5",
					follow
						? "border-link/50 bg-link/12 text-link"
						: "border-line text-ink-muted hover:text-ink",
				)}
			>
				<CrosshairIcon aria-hidden="true" />
				{follow ? "Following" : "Frozen"}
			</button>
			<IconButton
				label="Unpin to a peek"
				onClick={() => dispatch({ type: "unpin" })}
			>
				<PinOffIcon />
			</IconButton>
			<IconButton
				label="Open as a sheet"
				onClick={() => dispatch({ type: "expand", from: "pane" })}
			>
				<Maximize2Icon />
			</IconButton>
			<IconButton
				label="Close the pane"
				onClick={() => dispatch({ type: "close", level: "pane" })}
			>
				<XIcon />
			</IconButton>
		</>
	);
}

/** tf-demo's Sheet chrome: ← at inline-start, the title, × at inline-end. */
function SheetHeading({
	title,
	backTo,
	dispatch,
}: {
	readonly title: string;
	readonly backTo: "peek" | "pane";
	readonly dispatch: Dispatch<PromoteAction>;
}) {
	return (
		<div className="mx-auto grid w-full max-w-[40rem] grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center">
			<IconButton
				label={`Back to the ${backTo}`}
				onClick={() => dispatch({ type: "collapse" })}
			>
				{/* Back points toward inline-start. */}
				<ArrowLeftIcon className="rtl:-scale-x-100" />
			</IconButton>
			<h2 className="truncate text-center text-lg font-semibold">
				{title}
			</h2>
			<IconButton
				label="Close the sheet"
				onClick={() => dispatch({ type: "close", level: "sheet" })}
				className="justify-self-end"
			>
				<XIcon />
			</IconButton>
		</div>
	);
}

function IconButton({
	label,
	onClick,
	className,
	children,
}: {
	readonly label: string;
	readonly onClick: () => void;
	readonly className?: string;
	readonly children: ReactNode;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			title={label}
			onClick={onClick}
			className={cn(
				"grid size-8 shrink-0 place-items-center rounded-md text-ink-soft transition-colors hover:bg-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-ring [&_svg]:size-4",
				className,
			)}
		>
			{children}
		</button>
	);
}
