import {
	LinkButton,
	NoteTitle,
	NoteTitleLink,
	Quote,
	ReaderSegment,
	type ReaderSegmentInteraction,
	type ReaderSegmentTone,
} from "lego";
import { LockIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { segmentKey } from "@/hooks/use-segment-selection";
import {
	ReaderSentence,
	type ReaderSentenceData,
} from "@/views/reader-sentence";
import { READER_PROSE_CLASS } from "@/views/scroll-view";
import type { Id } from "../../../convex/_generated/dataModel";
import { Stage } from "./staged-presentation";

/* ---------- The two axes a word can sit on ---------- */

type ToneRow = {
	readonly label: string;
	readonly tone: ReaderSegmentTone;
	readonly gender?: "Fem" | "Masc" | "Neut";
	readonly sample: string;
	readonly meaning: string;
};

const TONES: readonly ToneRow[] = [
	{
		label: "plain",
		tone: "plain",
		sample: "bleiben",
		meaning: "not a candidate, or never touched",
	},
	{
		label: "unknown",
		tone: "unknown",
		sample: "bleiben",
		meaning: "nothing known, or resolution gave nothing; retryable",
	},
	{
		label: "resolving",
		tone: "resolving",
		sample: "bleiben",
		meaning: "resolution in flight",
	},
	{
		label: "known",
		tone: "known",
		sample: "bleiben",
		meaning: "a Unit with a Note",
	},
	{
		label: "known · Fem",
		tone: "known",
		gender: "Fem",
		sample: "Tür",
		meaning: "known feminine noun",
	},
	{
		label: "known · Masc",
		tone: "known",
		gender: "Masc",
		sample: "Laden",
		meaning: "known masculine noun",
	},
	{
		label: "known · Neut",
		tone: "known",
		gender: "Neut",
		sample: "Geschäft",
		meaning: "known neuter noun",
	},
	{
		label: "shadow",
		tone: "shadow",
		sample: "verschließen",
		meaning: "a Unit without a Note yet",
	},
	{
		label: "failed",
		tone: "failed",
		sample: "bleiben",
		meaning: "resolution failed for good; dead text, no interaction",
	},
];

const INTERACTIONS: readonly {
	readonly interaction: ReaderSegmentInteraction;
	readonly label: string;
}[] = [
	{ interaction: "idle", label: "idle" },
	{ interaction: "previewed", label: "previewed" },
	{ interaction: "selected", label: "selected" },
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

const FOUNDATIONS: readonly Swatch[] = [
	{ token: "canvas", role: "surface behind Panes", className: "bg-canvas" },
	{ token: "paper", role: "Sheet & Card surface", className: "bg-paper" },
	{
		token: "raised",
		role: "hover & popup surface",
		className: "bg-raised",
	},
	{ token: "scrim", role: "backdrop scrim", className: "bg-scrim" },
	{ token: "ink", role: "primary body text", className: "bg-ink" },
	{ token: "ink-soft", role: "secondary text", className: "bg-ink-soft" },
	{ token: "ink-muted", role: "captions & hints", className: "bg-ink-muted" },
	{ token: "ink-faint", role: "faintest mark", className: "bg-ink-faint" },
	{ token: "line", role: "hairline rule", className: "bg-line" },
	{
		token: "line-strong",
		role: "Card & separator edge",
		className: "bg-line-strong",
	},
];

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
		token: "selection",
		role: "browser text selection, the only wash",
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
	{ token: "destructive", role: "= red-500", className: "bg-destructive" },
	{
		token: "pen",
		role: "pronoun explainer stroke",
		className: "bg-[var(--color-pen)]",
	},
];

/**
 * Every colour a word or link can wear, laid out so that one meaning shows
 * one colour across the live `ReaderSentence`, a `Quote`, a `NoteTitle` and
 * a `LinkButton`. Rows are knowledge states, columns are interaction states.
 * No word ever has a background: the only wash in the reader is the browser's
 * own text selection.
 */
export function PaletteGallery() {
	return (
		<div className="grid gap-10 px-6 py-6 text-ink">
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
							<tbody className={READER_PROSE_CLASS}>
								{TONES.map((row) => (
									<tr key={row.label}>
										<th className="px-3 py-1.5 text-start font-mono text-xs font-normal text-ink-soft">
											{row.label}
										</th>
										{INTERACTIONS.map((column) => (
											<td
												key={column.label}
												className="px-3 py-1.5"
											>
												<ReaderSegment
													tone={row.tone}
													gender={row.gender}
													interaction={
														column.interaction
													}
													disabled={
														row.tone ===
															"resolving" ||
														row.tone === "failed"
													}
												>
													{row.sample}
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
						<div className="grid gap-3">
							<Quote onFollow={() => {}}>
								<span>Morgen </span>
								<ReaderSegment tone="known" interaction="hover">
									bleiben
								</ReaderSegment>
								<span> sie </span>
								<ReaderSegment tone="known" interaction="hover">
									geschlossen
								</ReaderSegment>
								<span>.</span>
							</Quote>
							<Quote tone="feminine" onFollow={() => {}}>
								<span>Die </span>
								<ReaderSegment
									tone="known"
									gender="Fem"
									interaction="hover"
								>
									Tür
								</ReaderSegment>
								<span> steht offen.</span>
							</Quote>
						</div>
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
							<NoteTitle
								data-shadow-title=""
								className="flex items-center gap-2 text-link-shadow"
							>
								<LockIcon
									aria-hidden="true"
									className="size-[0.8em] shrink-0"
								/>
								<span>verschließen</span>
							</NoteTitle>
						</div>
					</Labeled>
					<Labeled label="links">
						<ul className="grid gap-2">
							<li className="flex flex-wrap gap-x-6 gap-y-2">
								<LinkButton>geschlossen</LinkButton>
								<LinkButton tone="feminine">Tür</LinkButton>
								<LinkButton tone="masculine">Laden</LinkButton>
								<LinkButton tone="neuter">Geschäft</LinkButton>
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
					<Labeled label="selection">
						<p className={READER_PROSE_CLASS}>
							Drag across this sentence: the only background a
							word ever gets is the browser's{" "}
							<ReaderSegment tone="known" interaction="hover">
								text
							</ReaderSegment>{" "}
							<ReaderSegment tone="known" interaction="hover">
								selection
							</ReaderSegment>
							.
						</p>
					</Labeled>
				</div>
			</Stage>

			<Stage label="Surfaces, inks & lines">
				<SwatchRow swatches={FOUNDATIONS} />
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

/* ---------- The live ReaderSentence, interactive ---------- */

const att = (name: string) => `palette:${name}` as Id<"attestations">;

const LIVE_SENTENCE: ReaderSentenceData = {
	sentenceId: "palette:live-sentence",
	language: "de",
	stitchedText:
		"Morgen bleiben Tür, Laden und Geschäft offen, sie warten verschlossen.",
	segments: [
		{
			index: 0,
			kind: "ResolvableText",
			text: "Morgen",
			encountered: true,
			attestationId: att("morgen"),
		},
		{ index: 1, kind: "Whitespace", text: " ", encountered: false },
		{
			index: 2,
			kind: "ResolvableText",
			text: "bleiben",
			encountered: true,
			attestationId: att("bleiben"),
		},
		{ index: 3, kind: "Whitespace", text: " ", encountered: false },
		{
			index: 4,
			kind: "ResolvableText",
			text: "Tür",
			encountered: true,
			attestationId: att("tuer"),
			gender: "Fem",
		},
		{ index: 5, kind: "Punctuation", text: ",", encountered: false },
		{ index: 6, kind: "Whitespace", text: " ", encountered: false },
		{
			index: 7,
			kind: "ResolvableText",
			text: "Laden",
			encountered: true,
			attestationId: att("laden"),
			gender: "Masc",
		},
		{ index: 8, kind: "Whitespace", text: " ", encountered: false },
		{
			index: 9,
			kind: "ResolvableText",
			text: "und",
			encountered: false,
		},
		{ index: 10, kind: "Whitespace", text: " ", encountered: false },
		{
			index: 11,
			kind: "ResolvableText",
			text: "Geschäft",
			encountered: true,
			attestationId: att("geschaeft"),
			gender: "Neut",
		},
		{ index: 12, kind: "Whitespace", text: " ", encountered: false },
		{
			index: 13,
			kind: "ResolvableText",
			text: "offen",
			encountered: true,
			resolutionState: "Unresolved",
		},
		{ index: 14, kind: "Punctuation", text: ",", encountered: false },
		{ index: 15, kind: "Whitespace", text: " ", encountered: false },
		{
			index: 16,
			kind: "ResolvableText",
			text: "sie",
			encountered: true,
			resolutionState: "Active",
		},
		{ index: 17, kind: "Whitespace", text: " ", encountered: false },
		{
			index: 18,
			kind: "ResolvableText",
			text: "verschlossen",
			encountered: true,
			resolutionState: "PermanentFailure",
		},
		{ index: 19, kind: "Punctuation", text: ".", encountered: false },
	],
};

/**
 * The live `ReaderSentence` component fed fixture segments spanning every
 * knowledge state (known, gendered known, unresolved, resolving, plain and
 * failed). Hover, focus and click follow the real Scroll view rules directly.
 */
function LiveReader() {
	const [selectedKey, setSelectedKey] = useState<string | null>(null);
	return (
		<ReaderSentence
			sentence={LIVE_SENTENCE}
			selectedSegmentKey={selectedKey}
			className={READER_PROSE_CLASS}
			onSegmentClick={(sentence, clickedIndex) => {
				const next = segmentKey(sentence.sentenceId, clickedIndex);
				setSelectedKey((current) => (current === next ? null : next));
			}}
		/>
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
