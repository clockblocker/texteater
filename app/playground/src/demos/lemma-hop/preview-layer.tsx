import { cn, DensityScope, Ipa, NoteTitle } from "lego";
import { Maximize2, Pin, PinOff, X } from "lucide-react";
import { motion } from "motion/react";
import {
	type ReactNode,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { cardLang, langAttrs } from "@/fixtures";
import { useFrameSize, usePlaygroundEnv } from "@/shell";
import { Inflections } from "./cards";
import { PreviewController } from "./controller";
import { inflectionsOf } from "./inflections";
import {
	obsidian,
	type Preview,
	type PreviewBox,
	type PreviewHost,
	placePreview,
} from "./rules";
import { lookUp } from "./words";

/**
 * hover-preview's preview layer, copied because demos don't import each
 * other: the previews over the frame, portalled into it, with the
 * `PreviewController` that spawns, keeps and hides them. Pin, drag (which
 * pins, as in Hover Editor) and ⤢ sit in each preview's top inline-end
 * corner; ⤢ calls `onExpand` with the host and the hovered path.
 */
export function PreviewLayer({
	marked,
	onExpand,
}: {
	/** With a form, the preview shows the lemma's table with it marked. */
	readonly marked: string | null;
	readonly onExpand: (host: PreviewHost, path: readonly string[]) => void;
}) {
	const { frame, dir } = usePlaygroundEnv();
	const [previews, setPreviews] = useState<readonly Preview[]>([]);
	const latest = useRef({ previews, onExpand, dir });
	latest.current = { previews, onExpand, dir };
	const [controller, setController] = useState<PreviewController | null>(
		null,
	);

	useEffect(() => {
		if (!frame) return;
		const created = new PreviewController({
			frame,
			read: () => latest.current,
			write: (next) => {
				latest.current.previews = next;
				setPreviews(next);
			},
			follow: (host, path) => latest.current.onExpand(host, path),
		});
		setController(created);
		const detach = created.attach();
		return () => {
			detach();
			setController(null);
		};
	}, [frame]);

	if (!frame || !controller) return null;
	return createPortal(
		<div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
			{previews.map((preview) => (
				<PreviewCard
					key={preview.id}
					preview={preview}
					marked={marked}
					onPin={(pinned) =>
						controller.change(preview.id, {
							pinned,
							// A pinned preview leaves its parent's chain.
							...(pinned ? { parentId: null } : {}),
						})
					}
					onDrag={(dragged) =>
						controller.change(preview.id, {
							dragged,
							pinned: true,
							parentId: null,
						})
					}
					onClose={() => controller.close(preview.id)}
					onExpand={() => controller.expand(preview)}
				/>
			))}
		</div>,
		frame,
	);
}

/** One preview: placed by its link, or where a drag left it. */
function PreviewCard({
	preview,
	marked,
	onPin,
	onDrag,
	onClose,
	onExpand,
}: {
	readonly preview: Preview;
	readonly marked: string | null;
	readonly onPin: (pinned: boolean) => void;
	readonly onDrag: (to: { start: number; top: number }) => void;
	readonly onClose: () => void;
	readonly onExpand: () => void;
}) {
	const { reducedMotion, dir } = usePlaygroundEnv();
	const view = useFrameSize();
	const contentRef = useRef<HTMLDivElement>(null);
	const [height, setHeight] = useState(0);
	useLayoutEffect(() => {
		const content = contentRef.current;
		if (content) setHeight(content.scrollHeight + 2);
	}, []);
	const box: PreviewBox | null =
		height > 0 && view.inlineSize > 0
			? placePreview(preview.anchor, height, {
					width: view.inlineSize,
					height: view.blockSize,
				})
			: null;
	const start = preview.dragged?.start ?? box?.start ?? 0;
	const top = preview.dragged?.top ?? box?.top ?? 0;
	const { cards } = lookUp(preview.word);
	const lemma = cards.find((card) => card.kind === "Lemma");
	const reading = cards.find((card) => card.kind === "Reading");
	const lang = lemma ? cardLang(lemma) : "de";
	const table =
		marked !== null && lemma ? inflectionsOf(lemma.title) : undefined;

	const drag = useRef<{
		x: number;
		y: number;
		start: number;
		top: number;
		moved: boolean;
	} | null>(null);

	return (
		<motion.section
			data-lh-preview={preview.id}
			aria-label={`Preview: ${preview.word}`}
			// Focusable, so a click in it keeps focus in the frame and Esc
			// stays the demo's rather than the inspector's.
			tabIndex={-1}
			initial={reducedMotion ? false : { opacity: 0 }}
			animate={{ opacity: box ? 1 : 0 }}
			transition={{
				duration: reducedMotion ? 0 : obsidian.fadeMs / 1000,
				ease: [0.25, 0.1, 0.25, 1],
			}}
			className={cn(
				"pointer-events-auto absolute flex flex-col rounded-lg border border-line-strong bg-paper text-ink shadow-[0_1px_2px_oklch(0%_0_0/0.06),0_3px_7px_oklch(0%_0_0/0.09),0_15px_30px_oklch(0%_0_0/0.16)] focus:outline-none",
				preview.engaged && "outline-2 outline-link/60",
				!box && "invisible",
			)}
			style={{
				insetInlineStart: start,
				top,
				width: box?.width ?? obsidian.width,
			}}
		>
			<div
				ref={contentRef}
				className="overflow-y-auto overscroll-contain"
				style={{ maxHeight: box?.maxHeight ?? obsidian.maxHeight }}
			>
				<header className="flex items-start gap-1 ps-3 pe-1 pt-1.5">
					<div
						data-lh-grip=""
						title="Drag to move (pins it)"
						className="flex min-w-0 flex-1 cursor-grab touch-none flex-wrap items-baseline gap-x-2.5 gap-y-0.5 pt-1 select-none active:cursor-grabbing"
						onPointerDown={(event) => {
							if (event.button !== 0) return;
							event.currentTarget.setPointerCapture(
								event.pointerId,
							);
							drag.current = {
								x: event.clientX,
								y: event.clientY,
								start,
								top,
								moved: false,
							};
						}}
						onPointerMove={(event) => {
							const from = drag.current;
							if (!from) return;
							const dx = event.clientX - from.x;
							const dy = event.clientY - from.y;
							if (!from.moved && Math.hypot(dx, dy) < 4) return;
							from.moved = true;
							onDrag({
								start: from.start + (dir === "rtl" ? -dx : dx),
								top: from.top + dy,
							});
						}}
						onPointerUp={() => {
							drag.current = null;
						}}
						onPointerCancel={() => {
							drag.current = null;
						}}
					>
						{lemma ? (
							<>
								<span aria-hidden="true" className="text-lg">
									{lemma.emoji}
								</span>
								<NoteTitle
									{...langAttrs(lang)}
									className="text-base"
								>
									{lemma.title}
								</NoteTitle>
								<Ipa
									lang={`${lang}-fonipa`}
									dir="ltr"
									transcription={lemma.ipa}
								/>
							</>
						) : null}
					</div>
					<CornerButton
						label={preview.pinned ? "Unpin" : "Pin"}
						pressed={preview.pinned}
						onClick={() => onPin(!preview.pinned)}
					>
						{preview.pinned ? (
							<PinOff className="size-3.5" />
						) : (
							<Pin className="size-3.5" />
						)}
					</CornerButton>
					<CornerButton
						label="Expand into a Sheet"
						onClick={onExpand}
					>
						<Maximize2 className="size-3.5 rtl:-scale-x-100" />
					</CornerButton>
					{preview.pinned || preview.engaged ? (
						<CornerButton label="Close" onClick={onClose}>
							<X className="size-3.5" />
						</CornerButton>
					) : null}
				</header>
				<DensityScope
					density="compact"
					className="grid gap-2 px-3 pt-1 pb-3 text-sm"
				>
					{table ? (
						<p className="text-xs text-ink-muted">
							<span {...langAttrs("en")}>{table.wordClass}</span>
						</p>
					) : null}
					{reading ? (
						<>
							<p className="text-ink-soft">
								<span {...langAttrs("en")}>
									{reading.translations.join(", ")}
								</span>
							</p>
							<p>
								<span {...langAttrs("en")}>
									{reading.definition}
								</span>
							</p>
						</>
					) : null}
					{/* The table says what the Lemma's summary would. */}
					{lemma && !table ? (
						<p className="text-ink-muted">
							<span {...langAttrs("en")}>{lemma.definition}</span>
						</p>
					) : null}
					{table && marked !== null ? (
						<div className="pt-1">
							<Inflections
								table={table}
								marked={marked}
								compact
							/>
						</div>
					) : null}
				</DensityScope>
			</div>
		</motion.section>
	);
}

function CornerButton({
	label,
	pressed,
	onClick,
	children,
}: {
	readonly label: string;
	readonly pressed?: boolean;
	readonly onClick: () => void;
	readonly children: ReactNode;
}) {
	return (
		<button
			type="button"
			title={label}
			aria-label={label}
			aria-pressed={pressed}
			onClick={onClick}
			className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-ink-faint hover:bg-canvas hover:text-ink aria-pressed:text-link"
		>
			{children}
		</button>
	);
}
