import { XIcon } from "lucide-react";
import {
	AnimatePresence,
	type MotionValue,
	motion,
	type Transition,
} from "motion/react";
import type { CoverCard } from "./cover-deck";

/** The two forms of one element. */
export type Form = "card" | "cover";

/**
 * What the Cover-only parts fade and rise on, one pair per part: the ×
 * first, then each extra Source context.
 */
export type Reveal = {
	readonly opacity: readonly MotionValue<number>[];
	readonly y: readonly MotionValue<number>[];
};

/** Motion's measured page box for a part. */
type AxisBox = {
	readonly x: { readonly min: number; readonly max: number };
	readonly y: { readonly min: number; readonly max: number };
};

/**
 * The face of a Card that grows into its Cover. Its content column has one
 * width in every form, centred in the box, so its text never rewraps. The
 * title row, the Source contexts and the lines keep their identity across
 * the forms and move to their new places (Motion `layout="position"`, keyed
 * to the form); the Cover reads the lines first and lists every Source
 * context after them, with room above its title. The × and the extra
 * Source contexts are the Cover's alone: they wait at opacity 0 and the
 * hook fades and raises them in. The Card's clip fade is the Card's alone.
 */
export function CoverFace({
	card,
	form,
	column,
	parts,
	leave,
	cardFade,
	reveal,
	rtl,
	onClose,
	onMeasure,
}: {
	readonly card: CoverCard;
	readonly form: Form;
	/** The content column's width in px. */
	readonly column: number;
	/** What the parts ride to their new places on this change of form. */
	readonly parts: Transition;
	/** How content the other form lacks fades out. */
	readonly leave: Transition;
	/** How the Card's clip fade comes back after a close. */
	readonly cardFade: Transition;
	readonly reveal: Reveal;
	readonly rtl: boolean;
	readonly onClose: () => void;
	readonly onMeasure: (part: string, box: AxisBox) => void;
}) {
	const cover = form === "cover";
	const part = (name: string) => ({
		"data-part": name,
		layout: "position" as const,
		layoutDependency: form,
		transition: { layout: parts },
		onLayoutMeasure: (box: AxisBox) => onMeasure(name, box),
	});
	return (
		<>
			<div className={`shrink-0 ${cover ? "pt-4" : ""}`}>
				<motion.div
					{...part("heading")}
					className="mx-auto flex h-12 items-end gap-4 pb-3"
					style={{ width: column }}
				>
					<h2
						dir="auto"
						className="min-w-0 flex-1 truncate font-serif text-[1rem] leading-tight font-normal text-ink"
					>
						{card.title}
					</h2>
					<span className="shrink-0 pb-[0.15rem] text-[0.72rem] text-ink-muted">
						{card.caption}
					</span>
				</motion.div>
			</div>
			<div
				data-scroller=""
				className={`relative min-h-0 flex-1 ${cover ? "overflow-y-auto" : "overflow-hidden"}`}
			>
				<div
					className="mx-auto flex flex-col gap-3 pb-4"
					style={{ width: column }}
				>
					<motion.section
						{...part("contexts")}
						aria-label="Source contexts"
						className="flex flex-col gap-1"
						style={{ order: cover ? 2 : 1 }}
					>
						<div className="flex items-baseline justify-between font-mono text-[0.58rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
							<span>Source contexts</span>
							<span>
								{(1 + card.coverContexts.length).toString()}
							</span>
						</div>
						<ul className="relative flex flex-col gap-0.5 text-[0.8rem] leading-relaxed text-ink-soft">
							<li dir="auto">{card.contexts[0]}</li>
							<AnimatePresence
								mode="popLayout"
								anchorX={rtl ? "right" : "left"}
							>
								{cover
									? card.coverContexts.map(
											(context, index) => (
												<motion.li
													key={context}
													dir="auto"
													data-part={`context-${(index + 1).toString()}`}
													data-cover-only=""
													style={{
														opacity:
															reveal.opacity[
																index + 1
															],
														y: reveal.y[index + 1],
													}}
													exit={{
														opacity: 0,
														transition: leave,
													}}
												>
													{context}
												</motion.li>
											),
										)
									: null}
							</AnimatePresence>
						</ul>
					</motion.section>
					<motion.div
						{...part("lines")}
						className="space-y-1.5 text-[0.85rem] leading-relaxed text-ink-soft"
						style={{ order: cover ? 1 : 2 }}
					>
						{card.lines.map((line) => (
							<p key={line} dir="auto">
								{line}
							</p>
						))}
					</motion.div>
				</div>
			</div>
			<AnimatePresence initial={false}>
				{cover ? null : (
					<motion.div
						key="clip"
						aria-hidden="true"
						className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-paper to-transparent"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1, transition: cardFade }}
						exit={{ opacity: 0, transition: leave }}
					/>
				)}
			</AnimatePresence>
			<AnimatePresence initial={false}>
				{cover ? (
					<motion.button
						key="close"
						type="button"
						aria-label="Close"
						data-part="close"
						data-cover-only=""
						onClick={onClose}
						style={{ opacity: reveal.opacity[0], y: reveal.y[0] }}
						exit={{ opacity: 0, transition: leave }}
						className="absolute end-2 top-2 grid size-8 place-items-center rounded-md text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link/50 [&_svg]:size-4"
					>
						<XIcon aria-hidden="true" />
					</motion.button>
				) : null}
			</AnimatePresence>
		</>
	);
}
