import {
	cn,
	DensityScope,
	LinkButton,
	Mark,
	NoteSection,
	NoteTags,
	NoteTitle,
	NoteTitleRow,
} from "lego";
import { Maximize2 } from "lucide-react";
import type { ReactNode } from "react";
import { langAttrs } from "@/fixtures";
import { type LemmaEntry, type LemmaId, lemmas, type ProseCase } from "./cases";
import { Headword, Prose, type ProseOptions } from "./prose";

const cardSurface =
	"rounded-xl border border-line bg-paper text-ink shadow-[0_8px_24px_-12px_oklch(0%_0_0/0.5)]";

/** A Card in the popover, compact; a Sheet's, comfortable. */
type Presentation = "card" | "sheet";

function NoteFrame({
	presentation,
	action,
	children,
}: {
	readonly presentation: Presentation;
	readonly action?: ReactNode;
	readonly children: ReactNode;
}) {
	return (
		<DensityScope
			density={presentation === "card" ? "compact" : "comfortable"}
			className={cn(
				cardSurface,
				"relative",
				presentation === "card"
					? "p-3.5 text-sm"
					: "px-4 py-5 text-base @min-[640px]/frame:px-7",
			)}
		>
			{action ? (
				<div className="absolute end-1.5 top-1.5">{action}</div>
			) : null}
			{children}
		</DensityScope>
	);
}

/**
 * The clicked words' Surface Note as tf-demo draws it: the words and
 * their caption, the route to the lemma, then this prototype's one new
 * block, the prose that walks from the words to the lemma; the tag row
 * closes it. As a Sheet the caption names the lemma, as tf-demo's does.
 */
export function SurfaceNote({
	prose,
	presentation,
	options,
	action,
	onLemma,
}: {
	readonly prose: ProseCase;
	readonly presentation: Presentation;
	readonly options: ProseOptions;
	readonly action?: ReactNode;
	readonly onLemma: (id: LemmaId) => void;
}) {
	const lemma = lemmas[prose.lemma];
	const tone = prose.surface.tone;
	return (
		<NoteFrame presentation={presentation} action={action}>
			<header className={cn("min-w-0", action && "pe-7")}>
				<NoteTitleRow className="justify-start gap-x-1.5 gap-y-0">
					<NoteTitle
						{...langAttrs("de")}
						tone={tone}
						className={
							presentation === "sheet" ? "text-xl" : undefined
						}
					>
						{prose.surface.title}
					</NoteTitle>
					<span
						{...langAttrs("en")}
						className="text-sm text-ink-muted"
					>
						<span
							aria-hidden="true"
							className="me-1.5 text-ink-faint"
						>
							·
						</span>
						{prose.surface.caption}
						{presentation === "sheet" ? (
							<>
								{" "}
								<bdi
									{...langAttrs("de")}
									className="text-ink-faint"
								>
									<Headword
										title={lemma.title}
										slots={lemma.slots}
									/>
								</bdi>
							</>
						) : null}
					</span>
				</NoteTitleRow>
			</header>
			<NoteSection label="Analyses" className="pt-3 compact:pt-3">
				<p>
					<LinkButton
						{...langAttrs("de")}
						tone={lemma.tone ?? "link"}
						data-dp-lemma={lemma.id}
						onClick={() => onLemma(lemma.id)}
					>
						<Mark
							role="img"
							aria-label="leads to"
							className="text-ink"
						>
							→
						</Mark>
						<span>
							<Headword title={lemma.title} slots={lemma.slots} />
						</span>
					</LinkButton>
					<span
						{...langAttrs("en")}
						className="ms-2 text-sm text-ink-muted compact:text-xs"
					>
						{prose.aside}
					</span>
				</p>
			</NoteSection>
			<NoteSection label="From the text to the dictionary">
				<Prose
					prose={prose}
					options={
						presentation === "sheet"
							? { ...options, brief: false }
							: options
					}
					onLemma={onLemma}
				/>
			</NoteSection>
			<NoteTags>
				<span>de</span>
				<span>Surface</span>
			</NoteTags>
		</NoteFrame>
	);
}

/**
 * A lemma a line links to, as a Sheet Cover: its headword, en.wiktionary's
 * headword line, its glosses, DWDS's definition and example, and the tag
 * row. Its own links are out of scope here.
 */
export function LemmaNote({ entry }: { readonly entry: LemmaEntry }) {
	return (
		<NoteFrame presentation="sheet">
			<header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
				<span aria-hidden="true" className="text-2xl">
					{entry.emoji}
				</span>
				<NoteTitle
					{...langAttrs("de")}
					tone={entry.tone}
					className="text-xl"
				>
					{entry.article ? (
						<span className="font-normal text-ink-faint">
							{entry.article}{" "}
						</span>
					) : null}
					<Headword title={entry.title} slots={entry.slots} />
				</NoteTitle>
			</header>
			<p {...langAttrs("en")} className="mt-1 text-sm text-ink-muted">
				{entry.head}
			</p>
			<div className="mt-4 grid gap-2">
				<p {...langAttrs("en")} className="text-ink-soft">
					{entry.translations}
				</p>
				{entry.definition ? (
					<p {...langAttrs("de")}>{entry.definition}</p>
				) : null}
				{entry.example ? (
					<blockquote
						{...langAttrs("de")}
						className="border-s-[3px] border-line ps-3 text-ink-soft"
					>
						{entry.example}
					</blockquote>
				) : null}
			</div>
			<NoteTags {...langAttrs("en")}>
				{entry.tags.map((tag) => (
					<span key={tag}>{tag}</span>
				))}
			</NoteTags>
		</NoteFrame>
	);
}

/** The popover's corner button: open it as a Sheet over the reader. */
export function OpenAsSheet({ onClick }: { readonly onClick: () => void }) {
	return (
		<button
			type="button"
			title="Open as Sheet"
			aria-label="Open as Sheet"
			onClick={onClick}
			className="grid size-7 cursor-pointer place-items-center rounded-md text-ink-faint hover:bg-canvas hover:text-ink"
		>
			<Maximize2
				aria-hidden="true"
				className="size-3.5 rtl:-scale-x-100"
			/>
		</button>
	);
}
