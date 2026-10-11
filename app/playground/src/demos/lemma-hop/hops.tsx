import { cn } from "lego";
import {
	ArrowUpIcon,
	ChevronRightIcon,
	CornerDownLeftIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import {
	type CardKind,
	CardStack,
	CardView,
	type FakeCard,
	type FakeCardLink,
	type FakeResolution,
} from "@/fixtures";
import { type InflectionTable, inflectionsOf } from "./inflections";

/** The four ways from the clicked form to its lemma, and back. */
export type Variant = "tag" | "tails" | "crumbs" | "table";

export type HopProps = {
	readonly resolution: FakeResolution;
	/** The Card in view. */
	readonly front: CardKind;
	/** +1 when the last hop went towards the Reading, -1 back towards the form. */
	readonly direction: number;
	readonly onHop: (kind: CardKind) => void;
};

function cardOf(resolution: FakeResolution, kind: CardKind): FakeCard {
	const card = resolution.cards.find((candidate) => candidate.kind === kind);
	if (!card) throw new Error(`No ${kind} Card for ${resolution.word}`);
	return card;
}

/** The Card a lemma link lands on: the Lemma Card titled with its word. */
function lemmaKindOf(resolution: FakeResolution, link: FakeCardLink): CardKind {
	return (
		resolution.cards.find(
			(card) => card.kind === "Lemma" && card.title === link.word,
		)?.kind ?? "Lemma"
	);
}

/** The Card without its `lemma →` links, where a variant offers its own hop. */
function withoutLinks(card: FakeCard): FakeCard {
	return { ...card, links: [] };
}

/**
 * One Card at a time, sliding in from where the hop came from: down from
 * above on the way to the lemma, up from below on the way back.
 */
function HopSlide({
	id,
	direction,
	children,
}: {
	readonly id: string;
	readonly direction: number;
	readonly children: ReactNode;
}) {
	return (
		<div className="relative">
			<AnimatePresence
				mode="popLayout"
				initial={false}
				custom={direction}
			>
				<motion.div
					key={id}
					custom={direction}
					variants={{
						enter: (dir: number) => ({ opacity: 0, y: dir * -16 }),
						center: { opacity: 1, y: 0 },
						exit: (dir: number) => ({ opacity: 0, y: dir * 16 }),
					}}
					initial="enter"
					animate="center"
					exit="exit"
					transition={{ type: "spring", duration: 0.32, bounce: 0 }}
				>
					{children}
				</motion.div>
			</AnimatePresence>
		</div>
	);
}

function Hint({ children }: { readonly children: ReactNode }) {
	return <p className="text-xs text-ink-muted">{children}</p>;
}

const pill =
	"inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm transition-colors";

/**
 * (a) Lute v3: the Surface Card carries a parent-term tag built from its
 * lemma link; the tag swaps the view to the Lemma Card, whose child-form
 * tag swaps it back.
 */
export function ParentTagHop({
	resolution,
	front,
	direction,
	onHop,
}: HopProps) {
	const kind: CardKind = front === "Lemma" ? "Lemma" : "Surface";
	const surface = cardOf(resolution, "Surface");
	const card = cardOf(resolution, kind);
	return (
		<div className="grid grid-cols-1 gap-2">
			<Hint>
				{kind === "Surface"
					? "The parent tag on the form hops to the lemma."
					: "The child tag hops back to the form you clicked."}
			</Hint>
			<HopSlide id={card.id} direction={direction}>
				<div className="grid grid-cols-1 gap-0">
					<div className="flex flex-wrap items-center gap-2 rounded-t-xl border border-b-0 border-line bg-paper px-4 pt-3 pb-2">
						<span className="text-xs text-ink-faint">
							{kind === "Surface" ? "Parent" : "Child form"}
						</span>
						{kind === "Surface" ? (
							surface.links.map((link) => (
								<button
									key={`${link.relation}:${link.word}`}
									type="button"
									onClick={() =>
										onHop(lemmaKindOf(resolution, link))
									}
									className={cn(
										pill,
										"cursor-pointer border-link/50 bg-link/10 text-link hover:bg-link/20",
									)}
								>
									<ArrowUpIcon
										aria-hidden="true"
										className="size-3.5"
									/>
									<span dir="auto">{link.word}</span>
								</button>
							))
						) : (
							<button
								type="button"
								onClick={() => onHop("Surface")}
								className={cn(
									pill,
									"cursor-pointer border-line-strong text-ink-soft hover:text-ink",
								)}
							>
								<CornerDownLeftIcon
									aria-hidden="true"
									className="size-3.5 rtl:-scale-x-100"
								/>
								<span dir="auto">{surface.title}</span>
								<span className="text-xs text-ink-faint">
									clicked
								</span>
							</button>
						)}
					</div>
					<CardView
						card={withoutLinks(card)}
						className="rounded-t-none"
					/>
				</div>
			</HopSlide>
		</div>
	);
}

/**
 * (b) tf-demo's Deck: every tail is a link. The Cards behind the front one
 * stay tails above it; the Cards dealt after it wait as tails below, so the
 * hop back is a tail too.
 */
export function TailHop({ resolution, front, onHop }: HopProps) {
	const cards = resolution.cards.map(withoutLinks);
	const index = cards.findIndex((card) => card.kind === front);
	const ahead = cards.slice(index + 1);
	const hopTo = (card: FakeCard | undefined) => {
		if (card) onHop(card.kind);
	};
	return (
		<div className="grid grid-cols-1 gap-2">
			<Hint>
				Every tail is a link: tap{" "}
				<span className="text-ink-soft">
					{cardOf(resolution, "Surface").caption}
				</span>{" "}
				for the form,{" "}
				<span className="text-ink-soft">
					{cardOf(resolution, "Lemma").caption}
				</span>{" "}
				for the lemma.
			</Hint>
			<CardStack
				cards={cards}
				frontIndex={index}
				onFront={(at) => hopTo(cards[at])}
			/>
			<AnimatePresence initial={false}>
				{ahead.length > 0 ? (
					<motion.div
						key="ahead"
						layout
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="grid gap-1.5 pt-1"
					>
						<span className="text-xs text-ink-faint">
							Dealt after it
						</span>
						{ahead.map((card) => (
							<CardView
								key={card.id}
								card={card}
								collapsed
								onTailClick={() => onHop(card.kind)}
								className="border-dashed opacity-80"
							/>
						))}
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	);
}

const trail: readonly CardKind[] = ["Surface", "Lemma", "Reading"];

/**
 * (c) A breadcrumb trail over the lookup, form › lemma › sense. Every crumb
 * is a button, so the trail walks both ways.
 */
export function CrumbHop({ resolution, front, direction, onHop }: HopProps) {
	const card = cardOf(resolution, front);
	return (
		<div className="grid grid-cols-1 gap-3">
			<nav aria-label="Lookup trail">
				<ol className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
					{trail.map((kind, index) => {
						const crumb = cardOf(resolution, kind);
						const current = kind === front;
						return (
							<li key={kind} className="flex items-center gap-1">
								{index > 0 ? (
									<ChevronRightIcon
										aria-hidden="true"
										className="size-3.5 text-ink-faint rtl:-scale-x-100"
									/>
								) : null}
								<button
									type="button"
									aria-current={current ? "step" : undefined}
									onClick={() => onHop(kind)}
									className={cn(
										"cursor-pointer rounded-md px-2 py-1 text-sm transition-colors",
										current
											? "bg-paper font-medium text-ink ring-1 ring-line"
											: "text-link hover:bg-paper",
									)}
								>
									{kind === "Reading" ? (
										<span dir="auto">
											<span aria-hidden="true">
												{crumb.emoji}{" "}
											</span>
											{crumb.title}
											<span className="text-ink-muted">
												{" "}
												(sense 1)
											</span>
										</span>
									) : (
										<span dir="auto">{crumb.title}</span>
									)}
								</button>
							</li>
						);
					})}
				</ol>
			</nav>
			<HopSlide id={card.id} direction={direction}>
				<CardView card={withoutLinks(card)} />
			</HopSlide>
		</div>
	);
}

/**
 * (d) LinguaCafe: the Surface Card's lemma link opens the Lemma Card, which
 * carries the lemma's inflection table with the clicked form marked. The
 * marked cell hops back.
 */
export function TableHop({ resolution, front, direction, onHop }: HopProps) {
	const kind: CardKind = front === "Lemma" ? "Lemma" : "Surface";
	const card = cardOf(resolution, kind);
	const table = inflectionsOf(cardOf(resolution, "Lemma").title);
	return (
		<div className="grid grid-cols-1 gap-2">
			<Hint>
				{kind === "Surface"
					? "The lemma link opens the lemma with its inflections."
					: "The marked form is the one you clicked: tap it to go back."}
			</Hint>
			<HopSlide id={card.id} direction={direction}>
				{kind === "Surface" ? (
					<CardView
						card={card}
						onLinkClick={(link) =>
							onHop(lemmaKindOf(resolution, link))
						}
					/>
				) : (
					<div className="grid grid-cols-1 gap-0">
						<CardView
							card={withoutLinks(card)}
							className="rounded-b-none"
						/>
						<InflectionPanel
							table={table}
							form={resolution.word}
							onMarkedClick={() => onHop("Surface")}
						/>
					</div>
				)}
			</HopSlide>
		</div>
	);
}

function InflectionPanel({
	table,
	form,
	onMarkedClick,
}: {
	readonly table: InflectionTable | undefined;
	readonly form: string;
	readonly onMarkedClick: () => void;
}) {
	const frame =
		"rounded-b-xl border border-t-0 border-line bg-paper px-4 pt-2 pb-4 text-sm";
	if (!table) {
		return (
			<div className={frame}>
				<p className="text-ink-muted">
					No inflections for this generic fake.{" "}
					<button
						type="button"
						onClick={onMarkedClick}
						className="cursor-pointer text-link"
					>
						Back to <span dir="auto">{form}</span>
					</button>
				</p>
			</div>
		);
	}
	const [markedRow, markedCell] = table.marked;
	return (
		<div className={frame}>
			<p className="mb-2 font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-faint uppercase">
				Inflections
			</p>
			<div className="overflow-x-auto">
				<table
					lang={table.lang}
					dir={table.lang === "he" ? "rtl" : "ltr"}
					className="w-full border-collapse text-start"
				>
					<thead>
						<tr>
							{table.columns.map((column, index) => (
								<th
									key={`${index}:${column}`}
									scope="col"
									className="px-1.5 py-1 text-start text-xs font-normal text-ink-faint"
								>
									{column}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{table.rows.map((row, rowIndex) => (
							<tr
								key={row.label}
								className="border-t border-line"
							>
								<th
									scope="row"
									className="px-1.5 py-1 text-start text-xs font-normal whitespace-nowrap text-ink-muted"
								>
									{row.label}
								</th>
								{row.cells.map((cell, cellIndex) => {
									const marked =
										rowIndex === markedRow &&
										cellIndex === markedCell;
									return (
										<td
											key={`${cellIndex}:${cell}`}
											className="px-0.5 py-0.5 whitespace-nowrap"
										>
											{marked ? (
												<button
													type="button"
													onClick={onMarkedClick}
													title={`Back to ${form}`}
													className="cursor-pointer rounded-md bg-link/15 px-1 py-0.5 font-medium text-link ring-1 ring-link/60 hover:bg-link/25"
												>
													{cell}
												</button>
											) : (
												<span className="px-1 text-ink-soft">
													{cell}
												</span>
											)}
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{table.note ? (
				<p className="mt-2 text-xs text-ink-muted">{table.note}</p>
			) : null}
		</div>
	);
}
