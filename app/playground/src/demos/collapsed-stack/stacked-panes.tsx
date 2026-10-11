import { cn } from "lego";
import { ArrowLeft, X } from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { type FixtureWord, germanText } from "@/fixtures";
import { useFrameSize, usePlaygroundEnv } from "@/shell";
import {
	EntryLine,
	IconButton,
	LookupCards,
	newestWordId,
	ReaderText,
} from "./lookup";
import { type Stack, stackKey } from "./stack";

/** How opening a lookup from a pane changes the panes after it. */
export type OpenMode = "append" | "trail";

/** Quartz turns stacked pages off below this width. */
export const quartzMinWidth = 800;
/** A covered pane's visible strip: its spine. */
const spine = 40;
const textPaneWidth = 560;
const textKey = "text";

/**
 * Quartz's stacked pages, after Andy Matuschak's notes: the text and each
 * lookup are panes in a row that scrolls to the inline end. Every pane is
 * sticky at its spine offset, so when the row overflows the older panes
 * slide under the newer ones until only a spine with the title shows.
 * Clicking a spine scrolls its pane back into view.
 */
export function StackedPanes({
	stack,
	openMode,
	paneWidth,
	stackWhenNarrow,
}: {
	readonly stack: Stack;
	readonly openMode: OpenMode;
	readonly paneWidth: number;
	readonly stackWhenNarrow: boolean;
}) {
	const { inlineSize } = useFrameSize();
	const stacking =
		stackWhenNarrow || inlineSize === 0 || inlineSize >= quartzMinWidth;
	const keys = stack.entries.map((entry) => entry.key);

	// The pane to bring into view once it is in the URL; null means the
	// newest, as after back or forward.
	const pendingFocus = useRef<string | null>(null);
	const [focusRequest, setFocusRequest] = useState(0);
	const focus = (key: string) => {
		pendingFocus.current = key;
		setFocusRequest((count) => count + 1);
	};

	/** Opens `target` from pane `from` (0 is the text). */
	const open = (from: number, target: FixtureWord | string) => {
		const key = stackKey(target);
		const existing = keys.indexOf(key);
		if (openMode === "append" && existing !== -1) return focus(key);
		if (openMode === "trail" && existing !== -1 && existing <= from)
			return focus(key);
		const kept = openMode === "append" ? keys : keys.slice(0, from);
		focus(key);
		stack.write([...kept.filter((other) => other !== key), key], {
			dealt: key,
		});
	};
	const close = (key: string) =>
		stack.write(keys.filter((other) => other !== key));

	return stacking ? (
		<PaneRow
			stack={stack}
			paneWidth={paneWidth}
			pendingFocus={pendingFocus}
			focusRequest={focusRequest}
			onFocus={focus}
			onOpen={open}
			onClose={close}
		/>
	) : (
		<SinglePage stack={stack} onOpen={open} />
	);
}

function PaneRow({
	stack,
	paneWidth,
	pendingFocus,
	focusRequest,
	onFocus,
	onOpen,
	onClose,
}: {
	readonly stack: Stack;
	readonly paneWidth: number;
	readonly pendingFocus: { current: string | null };
	readonly focusRequest: number;
	readonly onFocus: (key: string) => void;
	readonly onOpen: (from: number, target: FixtureWord | string) => void;
	readonly onClose: (key: string) => void;
}) {
	const env = usePlaygroundEnv();
	const { inlineSize } = useFrameSize();
	const rowRef = useRef<HTMLDivElement>(null);
	const paneRefs = useRef<(HTMLElement | null)[]>([]);
	const [covered, setCovered] = useState<readonly boolean[]>([]);

	const textWidth = Math.min(textPaneWidth, inlineSize || textPaneWidth);
	const lookupWidth = inlineSize
		? Math.min(paneWidth, Math.max(inlineSize - spine, 240))
		: paneWidth;
	const widths = [textWidth, ...stack.entries.map(() => lookupWidth)];
	const paneKeys = [textKey, ...stack.entries.map((entry) => entry.key)];
	const rtl = env.dir === "rtl";

	/** Which panes are covered down to their spine, from where they sit. */
	const measure = useCallback(() => {
		const row = rowRef.current;
		if (!row) return;
		const box = row.getBoundingClientRect();
		const panes = paneRefs.current.slice(0, paneKeys.length);
		const starts = panes.map((pane) => {
			const rect = pane?.getBoundingClientRect();
			if (!rect) return 0;
			return rtl ? box.right - rect.right : rect.left - box.left;
		});
		const next = starts.map(
			(start, index) =>
				Math.min(
					starts[index + 1] ?? row.clientWidth,
					row.clientWidth,
				) -
					start <
				spine * 2,
		);
		setCovered((previous) =>
			previous.join() === next.join() ? previous : next,
		);
	}, [rtl, paneKeys.length]);

	useLayoutEffect(measure, [measure, inlineSize, lookupWidth]);

	/** Scrolls as little as it takes to show pane `index` whole. */
	const scrollToPane = (index: number) => {
		const row = rowRef.current;
		const width = widths[index];
		if (!row || width === undefined) return;
		const start = widths.slice(0, index).reduce((sum, w) => sum + w, 0);
		const view = row.clientWidth;
		const least =
			start + width - view + (widths.length - 1 - index) * spine;
		const most = start - index * spine;
		const current = Math.abs(row.scrollLeft);
		const target = Math.max(
			0,
			Math.min(row.scrollWidth - view, most, Math.max(least, current)),
		);
		row.scrollTo({
			left: rtl ? -target : target,
			behavior: env.reducedMotion ? "instant" : "smooth",
		});
	};

	useEffect(() => {
		const key = pendingFocus.current;
		const index =
			key === null ? paneKeys.length - 1 : paneKeys.indexOf(key);
		// A new lookup's key reaches the URL a moment after the click.
		if (index === -1) return;
		pendingFocus.current = null;
		scrollToPane(index);
		measure();
	}, [focusRequest, stack.entries]);

	return (
		<div
			ref={rowRef}
			onScroll={measure}
			className="flex h-full overflow-x-auto overflow-y-hidden bg-canvas"
		>
			{paneKeys.map((key, index) => {
				const entry = stack.entries[index - 1];
				const width = widths[index] ?? lookupWidth;
				return (
					<Pane
						key={key}
						ref={(pane) => {
							paneRefs.current[index] = pane;
						}}
						index={index}
						count={paneKeys.length}
						width={width}
						rtl={rtl}
						covered={covered[index] ?? false}
						spineTitle={entry ? entry.title : germanText.title}
						spineEmoji={entry?.emoji ?? "📄"}
						onSpineClick={() => onFocus(key)}
					>
						{entry ? (
							<>
								<header className="sticky top-0 z-[1] flex items-center gap-2 border-b border-line bg-paper py-2 ps-4 pe-2 text-sm">
									<EntryLine
										entry={entry}
										className="flex-1"
									/>
									<IconButton
										label={`Close ${entry.title}`}
										onClick={() => onClose(entry.key)}
									>
										<X size={14} />
									</IconButton>
								</header>
								<div className="p-3">
									<LookupCards
										entry={entry}
										dealing={stack.dealing === entry.key}
										onDealt={stack.settle}
										onLinkClick={(link) =>
											onOpen(index, link.word)
										}
									/>
								</div>
							</>
						) : (
							<ReaderText
								className="p-6"
								selectedWordId={newestWordId(stack.entries)}
								onWordClick={({ word }) => onOpen(0, word)}
							/>
						)}
					</Pane>
				);
			})}
			{stack.entries.length === 0 ? (
				<p
					className="shrink-0 self-center p-6 text-sm text-ink-muted"
					style={{ width: lookupWidth }}
				>
					Click a word: its lookup opens as a pane here, at the inline
					end.
				</p>
			) : null}
		</div>
	);
}

function Pane({
	ref,
	index,
	count,
	width,
	rtl,
	covered,
	spineTitle,
	spineEmoji,
	onSpineClick,
	children,
}: {
	readonly ref: (pane: HTMLElement | null) => void;
	readonly index: number;
	readonly count: number;
	readonly width: number;
	readonly rtl: boolean;
	readonly covered: boolean;
	readonly spineTitle: string;
	readonly spineEmoji: string;
	readonly onSpineClick: () => void;
	readonly children: ReactNode;
}) {
	return (
		<section
			ref={ref}
			aria-label={spineTitle}
			className="sticky top-0 h-full shrink-0 overflow-hidden border-s border-line bg-paper"
			style={{
				width,
				// Stuck at its spine offset from either end, so covered
				// panes leave their spines showing on both sides.
				insetInlineStart: index * spine,
				insetInlineEnd: (count - index) * spine - width,
				zIndex: index,
				boxShadow:
					index > 0
						? `${rtl ? 10 : -10}px 0 18px -14px oklch(0% 0 0 / 0.6)`
						: undefined,
			}}
		>
			<div className="isolate h-full overflow-y-auto">{children}</div>
			{covered ? (
				<button
					type="button"
					onClick={onSpineClick}
					aria-label={`Expand ${spineTitle}`}
					title={spineTitle}
					className="absolute inset-y-0 start-0 z-[2] flex cursor-pointer flex-col items-center gap-2 border-e border-line bg-paper py-3 text-sm text-ink-soft hover:bg-canvas hover:text-ink"
					style={{ width: spine }}
				>
					<span aria-hidden="true">{spineEmoji}</span>
					<span
						dir="auto"
						className="font-medium whitespace-nowrap [writing-mode:vertical-rl]"
					>
						{spineTitle}
					</span>
				</button>
			) : null}
		</section>
	);
}

/**
 * Below 800px Quartz doesn't stack: a link replaces the page and back
 * returns. The stack is still in the URL; only its newest lookup shows.
 */
function SinglePage({
	stack,
	onOpen,
}: {
	readonly stack: Stack;
	readonly onOpen: (from: number, target: FixtureWord | string) => void;
}) {
	const newest = stack.entries.at(-1);
	return (
		<div className="flex h-full flex-col">
			<div className="flex min-h-11 items-center gap-2 border-b border-line bg-canvas px-2 text-sm">
				{newest ? (
					<button
						type="button"
						onClick={() => window.history.back()}
						className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-link hover:bg-paper"
					>
						<ArrowLeft size={15} className="rtl:-scale-x-100" />
						Back
					</button>
				) : null}
				{newest ? (
					<EntryLine entry={newest} className="min-w-0 flex-1" />
				) : (
					<span className="px-2 font-medium text-ink">
						{germanText.title}
					</span>
				)}
				<span className="shrink-0 px-2 text-ink-muted tabular-nums">
					{stack.entries.length} deep
				</span>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto">
				{newest ? (
					<div className="mx-auto max-w-[32rem] p-4">
						<LookupCards
							key={newest.key}
							entry={newest}
							dealing={stack.dealing === newest.key}
							onDealt={stack.settle}
							onLinkClick={(link) =>
								onOpen(stack.entries.length, link.word)
							}
						/>
					</div>
				) : (
					<ReaderText
						className={cn("mx-auto max-w-[38rem] p-5")}
						selectedWordId={null}
						onWordClick={({ word }) => onOpen(0, word)}
					/>
				)}
			</div>
		</div>
	);
}
