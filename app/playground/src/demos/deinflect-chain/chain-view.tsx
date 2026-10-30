import { cn } from "lego";
import { X } from "lucide-react";
import { Fragment } from "react";
import { langAttrs } from "@/fixtures";
import type { Step } from "./cases";
import {
	aboutRuns,
	type ChainOrder,
	type ChainStyle,
	nameOf,
	ordered,
	plainAbout,
	type StepNames,
	separator,
} from "./chain";

/**
 * The steps from the clicked words to the lemma, drawn two ways. Folded,
 * as Yomitan and 10ten draw a form's reasons: one quiet line of named
 * steps, each a button whose description is its tooltip and, clicked,
 * opens in a note at the foot of the Card (Yomitan's notification).
 * Unfolded, as a short list: each step's change and its name, and in
 * the explained register what the change means.
 */

type ChainProps = {
	readonly steps: readonly Step[];
	readonly order: ChainOrder;
	readonly names: StepNames;
	/** The step whose note is open, if any. */
	readonly open: string | null;
	readonly onOpen: (id: string | null) => void;
};

/** A step's description: English, its target-language words in italics. */
function About({ about }: { readonly about: string }) {
	return (
		<span {...langAttrs("en")}>
			{aboutRuns(about).map((run, index) =>
				run.target ? (
					<i key={`${index}:${run.text}`} {...langAttrs("de")}>
						{run.text}
					</i>
				) : (
					<Fragment key={`${index}:${run.text}`}>{run.text}</Fragment>
				),
			)}
		</span>
	);
}

/**
 * The folded chain. `yomitan` sets it on its own line, `«` between steps;
 * `tenten` sets it inline in parentheses after what comes before it,
 * opening with the separator: `(< zu-infinitive < …)`.
 */
export function ChainLine({
	steps,
	order,
	names,
	style,
	cues,
	open,
	onOpen,
}: ChainProps & {
	readonly style: ChainStyle;
	/** Whether each step names its word first: `hatte past · 3rd sg.` */
	readonly cues: boolean;
}) {
	const mark = separator(style, order);
	const shown = ordered(steps, order);
	const sign = (
		<span aria-hidden="true" className="text-ink-faint">
			{mark}
		</span>
	);
	const links = shown.map((step, index) => {
		const cue = step.cue === undefined ? step.from : step.cue;
		const isOpen = open === step.id;
		// A step keeps the separator after it, so no line starts with one;
		// lines break only in the spaces between steps.
		return (
			<Fragment key={step.id}>
				{index > 0 ? " " : null}
				<span className="whitespace-nowrap">
					{index === 0 && style === "tenten" ? <>{sign} </> : null}
					<button
						type="button"
						title={plainAbout(step.about)}
						aria-expanded={isOpen}
						onClick={() => onOpen(isOpen ? null : step.id)}
						className={cn(
							"cursor-pointer rounded-sm decoration-current/40 underline-offset-[0.2em] hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-link",
							isOpen && "text-ink underline",
						)}
					>
						{cues && cue ? (
							<span
								{...langAttrs("de")}
								className="font-medium text-ink-soft"
							>
								{cue}{" "}
							</span>
						) : null}
						<span {...langAttrs("en")}>{nameOf(step, names)}</span>
					</button>
					{index < shown.length - 1 ? <> {sign}</> : null}
				</span>
			</Fragment>
		);
	});
	return style === "yomitan" ? (
		<p className="text-sm leading-relaxed text-ink-muted">{links}</p>
	) : (
		<span className="text-sm text-ink-muted">({links})</span>
	);
}

/**
 * Yomitan's notification, inside the Card: the open step's change, its
 * name and what it means, with a close button. It stays until closed or
 * another step opens.
 */
export function StepNote({
	step,
	order,
	names,
	onClose,
}: {
	readonly step: Step;
	readonly order: ChainOrder;
	readonly names: StepNames;
	readonly onClose: () => void;
}) {
	return (
		<aside
			aria-live="polite"
			className="relative grid gap-1 rounded-lg bg-canvas px-3 py-2.5 pe-8 text-sm"
		>
			<button
				type="button"
				aria-label="Close"
				onClick={onClose}
				className="absolute end-1.5 top-1.5 grid size-6 cursor-pointer place-items-center rounded-md text-ink-faint hover:text-ink"
			>
				<X aria-hidden="true" className="size-3.5" />
			</button>
			<p className="flex flex-wrap items-baseline gap-x-2">
				<Change step={step} order={order} />
				<span {...langAttrs("en")} className="text-ink-muted">
					{nameOf(step, names)}
				</span>
			</p>
			<p className="text-ink-soft">
				<About about={step.about} />
			</p>
		</aside>
	);
}

/**
 * `hatte → haben`, `es → left out`, or `zu tun` alone when it stays. From
 * the lemma, the arrow still points at it, as the chain's `«` does, so
 * the lemma's side comes first: `haben ← hatte`.
 */
function Change({
	step,
	order,
}: {
	readonly step: Step;
	readonly order: ChainOrder;
}) {
	const from = (
		<span {...langAttrs("de")} className="font-medium">
			{step.from}
		</span>
	);
	if (step.to === step.from) return from;
	const to =
		step.to === null ? (
			<span {...langAttrs("en")} className="text-ink-faint italic">
				left out
			</span>
		) : (
			<span {...langAttrs("de")} className="font-medium">
				{step.to}
			</span>
		);
	const arrow = (
		<span aria-hidden="true" className="px-1 text-ink-faint">
			{order === "lemma" ? "←" : "→"}
		</span>
	);
	return (
		<span className="whitespace-nowrap">
			{order === "lemma" ? (
				<>
					{to}
					{arrow}
					{from}
				</>
			) : (
				<>
					{from}
					{arrow}
					{to}
				</>
			)}
		</span>
	);
}

/**
 * The unfolded chain: one row per step, its change and its name. In the
 * explained register each row says what the change means; otherwise a
 * row opens to say it.
 */
export function StepList({
	steps,
	order,
	names,
	explained,
	open,
	onOpen,
}: ChainProps & { readonly explained: boolean }) {
	return (
		<ol className="grid gap-2.5 text-sm">
			{ordered(steps, order).map((step) => {
				const isOpen = explained || open === step.id;
				const row = (
					<span className="flex flex-wrap items-baseline gap-x-2 text-start">
						<Change step={step} order={order} />
						<span {...langAttrs("en")} className="text-ink-muted">
							{nameOf(step, names)}
						</span>
					</span>
				);
				return (
					<li key={step.id} className="grid gap-0.5">
						{explained ? (
							row
						) : (
							<button
								type="button"
								aria-expanded={isOpen}
								title={plainAbout(step.about)}
								onClick={() =>
									onOpen(open === step.id ? null : step.id)
								}
								className="cursor-pointer rounded-sm text-start hover:[&_span]:text-ink focus-visible:outline-2 focus-visible:outline-link"
							>
								{row}
							</button>
						)}
						{isOpen ? (
							<p className="text-ink-soft">
								<About about={step.about} />
							</p>
						) : null}
					</li>
				);
			})}
		</ol>
	);
}
