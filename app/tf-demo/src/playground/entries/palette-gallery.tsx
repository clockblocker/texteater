import {
	LinkButton,
	NoteTitle,
	NoteTitleLink,
	Quote,
	ReaderPlainSegment,
	ReaderSegment,
	type ReaderSegmentInteraction,
	type ReaderSegmentTone,
} from "lego";
import { LockIcon } from "lucide-react";
import { type CSSProperties, Fragment, type ReactNode, useState } from "react";

import { Stage } from "./frames";

/* ---------- The two axes a word can sit on ---------- */

const TONES: readonly {
	readonly tone: ReaderSegmentTone;
	readonly meaning: string;
}[] = [
	{ tone: "plain", meaning: "not a candidate, or never touched" },
	{
		tone: "unknown",
		meaning: "nothing known, or resolution gave nothing; retryable",
	},
	{ tone: "resolving", meaning: "resolution in flight" },
	{ tone: "known", meaning: "a Unit with a Note" },
	{ tone: "shadow", meaning: "a Unit without a Note yet" },
	{
		tone: "failed",
		meaning: "resolution failed for good; dead text, no interaction",
	},
];

const INTERACTIONS: readonly {
	readonly interaction: ReaderSegmentInteraction;
	readonly highlighted: boolean;
	readonly label: string;
}[] = [
	{ interaction: "idle", highlighted: false, label: "idle" },
	{ interaction: "previewed", highlighted: false, label: "previewed" },
	{ interaction: "selected", highlighted: false, label: "selected" },
	{ interaction: "idle", highlighted: true, label: "occurrence member" },
	{ interaction: "selected", highlighted: true, label: "selected member" },
];

const SURFACES = [
	{ name: "paper", className: "bg-paper" },
	{ name: "canvas", className: "bg-canvas" },
	{ name: "raised", className: "bg-raised" },
] as const;

/* ---------- Tokens ---------- */

type Swatch = {
	readonly token: string;
	readonly role: string;
	readonly className: string;
};

const PRIMITIVES: readonly Swatch[] = [
	{
		token: "blue-600",
		role: "shadow step",
		className: "bg-[var(--blue-600)]",
	},
	{
		token: "blue-500",
		role: "link / known",
		className: "bg-[var(--blue-500)]",
	},
	{
		token: "blue-400",
		role: "bright, reserved",
		className: "bg-[var(--blue-400)]",
	},
	{
		token: "amber-500",
		role: "chart only",
		className: "bg-[var(--amber-500)]",
	},
	{ token: "red-500", role: "destructive", className: "bg-[var(--red-500)]" },
	{ token: "rose-500", role: "feminine", className: "bg-[var(--rose-500)]" },
	{
		token: "violet-500",
		role: "masculine",
		className: "bg-[var(--violet-500)]",
	},
	{ token: "green-500", role: "neuter", className: "bg-[var(--green-500)]" },
];

const ROLES: readonly Swatch[] = [
	{ token: "word-unknown", role: "= ink-soft", className: "bg-word-unknown" },
	{
		token: "word-resolving",
		role: "= ink-muted",
		className: "bg-word-resolving",
	},
	{ token: "word-known", role: "= blue-500", className: "bg-word-known" },
	{ token: "word-shadow", role: "= blue-600", className: "bg-word-shadow" },
	{ token: "link", role: "= word-known", className: "bg-link" },
	{
		token: "link-shadow",
		role: "= word-shadow",
		className: "bg-link-shadow",
	},
	{
		token: "highlight",
		role: "occurrence wash at 25%",
		className: "bg-highlight",
	},
	{
		token: "selection",
		role: "browser text selection",
		className: "bg-selection",
	},
	{
		token: "gender-feminine",
		role: "= rose-500",
		className: "bg-gender-feminine",
	},
	{
		token: "gender-masculine",
		role: "= violet-500",
		className: "bg-gender-masculine",
	},
	{
		token: "gender-neuter",
		role: "= green-500",
		className: "bg-gender-neuter",
	},
];

/* ---------- Highlight vs selection ---------- */

type HighlightScheme = "wash-blue" | "wash-neutral";

const SCHEMES: readonly {
	readonly key: HighlightScheme;
	readonly title: string;
	readonly detail: string;
	readonly style: CSSProperties;
}[] = [
	{
		key: "wash-blue",
		title: "Blue wash, neutral selection",
		detail: "Occurrence members sit on a blue wash; dragging a text selection shows the raised surface tone.",
		style: {},
	},
	{
		key: "wash-neutral",
		title: "Neutral wash, blue selection",
		detail: "Occurrence members sit on an ink wash; dragging a text selection shows the link blue.",
		style: {
			"--highlight": "var(--ink)",
			"--selection": "var(--blue-500)",
			"--selection-foreground": "var(--primary-foreground)",
		} as CSSProperties,
	},
];

/**
 * Every colour a word or link can wear, laid out so that one meaning shows
 * one colour across the reader, a Quote, a Note title and a link list.
 * Rows are knowledge states, columns are interaction states.
 */
export function PaletteGallery() {
	const [scheme, setScheme] = useState<HighlightScheme>("wash-blue");
	const active = SCHEMES.find((entry) => entry.key === scheme) ?? SCHEMES[0];
	return (
		<div className="grid gap-10 px-6 py-6 text-ink" style={active?.style}>
			<Stage label="Highlight vs selection">
				<div className="flex flex-wrap items-center gap-2">
					{SCHEMES.map((entry) => (
						<button
							key={entry.key}
							type="button"
							aria-pressed={entry.key === scheme}
							onClick={() => setScheme(entry.key)}
							className="rounded-md border border-line px-2.5 py-1 text-sm text-ink-soft transition-colors hover:bg-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-pressed:border-line-strong aria-pressed:bg-raised aria-pressed:text-ink"
						>
							{entry.title}
						</button>
					))}
					<p className="text-sm text-ink-muted">{active?.detail}</p>
				</div>
				<p className="max-w-note text-lg leading-[1.52] font-[430] tracking-[-0.015em]">
					Select this sentence with the mouse to see the selection
					colour next to an{" "}
					<ReaderSegment tone="known" highlighted>
						occurrence
					</ReaderSegment>{" "}
					<ReaderPlainSegment highlighted>member </ReaderPlainSegment>
					<ReaderSegment tone="known" highlighted>
						wash
					</ReaderSegment>
					.
				</p>
			</Stage>

			<Stage label="Word states × interaction">
				<div className="grid gap-4">
					{SURFACES.map((surface) => (
						<table
							key={surface.name}
							className={`w-fit border-separate border-spacing-0 overflow-hidden rounded-lg border border-line ${surface.className}`}
						>
							<caption className="px-3 py-1.5 text-start font-mono text-[0.62rem] tracking-[0.12em] text-ink-muted uppercase">
								on {surface.name}
							</caption>
							<thead>
								<tr>
									<th className="px-3 py-1 text-start text-xs font-normal text-ink-muted">
										tone
									</th>
									{INTERACTIONS.map((column) => (
										<th
											key={column.label}
											className="px-3 py-1 text-start text-xs font-normal text-ink-muted"
										>
											{column.label}
										</th>
									))}
									<th className="px-3 py-1 text-start text-xs font-normal text-ink-muted">
										meaning
									</th>
								</tr>
							</thead>
							<tbody className="text-lg leading-[1.52] font-[430] tracking-[-0.015em]">
								{TONES.map((row) => (
									<tr key={row.tone}>
										<th className="px-3 py-1.5 text-start font-mono text-xs font-normal text-ink-soft">
											{row.tone}
										</th>
										{INTERACTIONS.map((column) => (
											<td
												key={column.label}
												className="px-3 py-1.5"
											>
												<ReaderSegment
													tone={row.tone}
													interaction={
														column.interaction
													}
													highlighted={
														column.highlighted
													}
												>
													bleiben
												</ReaderSegment>
											</td>
										))}
										<td className="px-3 py-1.5 text-xs text-ink-muted">
											{row.meaning}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					))}
				</div>
			</Stage>

			<Stage label="One meaning, one colour">
				<div className="grid max-w-note gap-5 rounded-lg border border-line bg-paper p-5">
					<Labeled label="reader">
						<LiveReader />
					</Labeled>
					<Labeled label="quote">
						<Quote>
							Morgen{" "}
							<ReaderSegment tone="known" interaction="hover">
								bleiben
							</ReaderSegment>{" "}
							sie{" "}
							<ReaderSegment tone="known" interaction="hover">
								geschlossen
							</ReaderSegment>
							.
						</Quote>
					</Labeled>
					<Labeled label="titles">
						<div className="flex flex-wrap gap-x-8 gap-y-2">
							<NoteTitle>
								<NoteTitleLink>bleiben</NoteTitleLink>
							</NoteTitle>
							<NoteTitle tone="feminine">
								<NoteTitleLink>Tür</NoteTitleLink>
							</NoteTitle>
							<NoteTitle tone="masculine">
								<NoteTitleLink>Laden</NoteTitleLink>
							</NoteTitle>
							<NoteTitle tone="neuter">
								<NoteTitleLink>Geschäft</NoteTitleLink>
							</NoteTitle>
							<NoteTitle className="flex items-center gap-2 text-link-shadow">
								<LockIcon
									aria-hidden="true"
									className="size-[0.8em]"
								/>
								verschließen
							</NoteTitle>
						</div>
					</Labeled>
					<Labeled label="links">
						<ul className="grid gap-2">
							<li>
								<LinkButton>geschlossen</LinkButton>
							</li>
							<li>
								<LinkButton tone="shadow">
									<LockIcon
										aria-hidden="true"
										strokeWidth={1.5}
									/>
									verschließen
								</LinkButton>
							</li>
							<li>
								<LinkButton tone="quiet">Clean up</LinkButton>
							</li>
							<li>
								<LinkButton disabled>schließen</LinkButton>
							</li>
						</ul>
					</Labeled>
				</div>
			</Stage>

			<Stage label="Primitives">
				<SwatchRow swatches={PRIMITIVES} />
			</Stage>
			<Stage label="Roles">
				<SwatchRow swatches={ROLES} />
			</Stage>
		</div>
	);
}

/* ---------- A reader you can touch ---------- */

const LIVE_WORDS: readonly {
	readonly text: string;
	readonly tone: ReaderSegmentTone;
}[] = [
	{ text: "Morgen", tone: "known" },
	{ text: "bleiben", tone: "known" },
	{ text: "sie", tone: "resolving" },
	{ text: "geschlossen", tone: "known" },
	{ text: "und", tone: "plain" },
	{ text: "verschlossen", tone: "failed" },
];

/**
 * The reader's own rules, live: hover or focus previews a word, a click
 * selects it, a second click clears it. Colour never moves; only the rule
 * under the word does. Plain and failed words behave as in the Text view:
 * a plain word previews on hover, a failed one ignores the pointer.
 */
function LiveReader() {
	const [hovered, setHovered] = useState<number | null>(null);
	const [focused, setFocused] = useState<number | null>(null);
	const [selected, setSelected] = useState<number | null>(null);
	const previewed = hovered ?? focused;
	return (
		<p className="text-lg leading-[1.52] font-[430] tracking-[-0.015em]">
			{LIVE_WORDS.map((word, index) => (
				<Fragment key={word.text}>
					{index > 0 ? " " : null}
					<ReaderSegment
						tone={word.tone}
						interaction={
							selected === index
								? "selected"
								: previewed === index
									? "previewed"
									: "idle"
						}
						disabled={
							word.tone === "resolving" || word.tone === "failed"
						}
						aria-pressed={selected === index}
						onMouseEnter={() => setHovered(index)}
						onMouseLeave={() =>
							setHovered((current) =>
								current === index ? null : current,
							)
						}
						onFocus={() => setFocused(index)}
						onBlur={() =>
							setFocused((current) =>
								current === index ? null : current,
							)
						}
						onClick={() =>
							setSelected((current) =>
								current === index ? null : index,
							)
						}
					>
						{word.text}
					</ReaderSegment>
				</Fragment>
			))}
			.
		</p>
	);
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="grid grid-cols-[5rem_1fr] items-baseline gap-4">
			<span className="font-mono text-[0.62rem] tracking-[0.12em] text-ink-muted uppercase">
				{label}
			</span>
			<div>{children}</div>
		</div>
	);
}

function SwatchRow({ swatches }: { swatches: readonly Swatch[] }) {
	return (
		<ul className="flex flex-wrap gap-3">
			{swatches.map((swatch) => (
				<li key={swatch.token} className="grid w-28 gap-1.5">
					<span
						className={`h-10 rounded-md border border-line ${swatch.className}`}
					/>
					<span className="font-mono text-xs text-ink-soft">
						{swatch.token}
					</span>
					<span className="text-xs text-ink-muted">
						{swatch.role}
					</span>
				</li>
			))}
		</ul>
	);
}
