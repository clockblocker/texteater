import { LinkButton } from "lego";
import { Fragment, type ReactNode } from "react";

import type { WorkspaceTarget } from "@/workspace/workspace-subject";
import type { NoteDataFor } from "../../../../note/data";
import { useBreakdownDisplay } from "../../common/breakdown-display";

export type BreakdownData = NonNullable<NoteDataFor<"Reading">["breakdown"]>;
type Constituent = NonNullable<BreakdownData["constituents"]>[number];
type BreakdownTarget = NonNullable<Constituent["target"]>;

/**
 * One linked piece. A stored part opens its Note; a pending one opens its
 * Shadow Note in the Shadow tone, as a pending relation target does.
 */
function PieceLink({
	target,
	follow,
	label,
	children,
}: {
	readonly target: BreakdownTarget;
	readonly follow: (target: WorkspaceTarget) => void;
	readonly label?: string;
	readonly children: ReactNode;
}) {
	const { link } = target;
	if (!link) return <span>{children}</span>;
	return (
		<LinkButton
			tone={link.kind === "Shadow" ? "shadow" : "link"}
			className="rounded-sm"
			aria-label={label}
			onClick={() => follow(link)}
		>
			{children}
		</LinkButton>
	);
}

function Filler({ children }: { readonly children: ReactNode }) {
	return <span className="text-ink-muted">{children}</span>;
}

/**
 * A phraseme's parts as its wording reads (ADR 0050): each word links to its
 * unit, `·` stands between words, and a fused word keeps its letters together
 * with each component linked apart (`i` → `in`, `m Pfeffer` → `Pfeffer`).
 */
function PhrasemeConstituents({
	pieces,
	follow,
}: {
	readonly pieces: readonly Constituent[];
	readonly follow: (target: WorkspaceTarget) => void;
}) {
	return pieces.map((piece, index) => {
		const key = `${index}:${piece.letters}`;
		if (!piece.target) {
			return /^\s+$/u.test(piece.letters) ? (
				<span key={key} className="text-ink-muted">
					{" · "}
				</span>
			) : (
				<Filler key={key}>{piece.letters}</Filler>
			);
		}
		return (
			<PieceLink
				key={key}
				target={piece.target}
				follow={follow}
				label={`${piece.letters}, ${piece.target.canonicalForm}`}
			>
				{piece.letters}
			</PieceLink>
		);
	});
}

/**
 * A word's parts by their Canonical Forms, en.wiktionary's `ver- + Arzt +
 * en`: the citation ending stays unlinked filler, and a hyphen or space
 * inside the word is left out.
 */
function DictionaryForms({
	pieces,
	follow,
}: {
	readonly pieces: readonly Constituent[];
	readonly follow: (target: WorkspaceTarget) => void;
}) {
	const shown = pieces.filter(
		(piece) => piece.target || /\p{L}/u.test(piece.letters),
	);
	return shown.map((piece, index) => (
		<Fragment key={`${index}:${piece.letters}`}>
			{index > 0 ? <span className="text-ink-muted"> + </span> : null}
			{piece.target ? (
				<PieceLink
					target={piece.target}
					follow={follow}
					label={`${piece.target.canonicalForm}, shown as ${piece.letters}`}
				>
					{piece.target.canonicalForm}
				</PieceLink>
			) : (
				<Filler>{piece.letters}</Filler>
			)}
		</Fragment>
	));
}

/**
 * A word cut into its own letters, `|` between parts and an Interfix glued
 * to the part before it (`Gäste|haus`), as ADR 0050 allows.
 */
function ShownLetters({
	pieces,
	follow,
}: {
	readonly pieces: readonly Constituent[];
	readonly follow: (target: WorkspaceTarget) => void;
}) {
	return pieces.map((piece, index) => {
		const glued =
			index === 0 ||
			(piece.target?.family === "Morpheme" &&
				piece.target.kind === "Interfix");
		return (
			<Fragment key={`${index}:${piece.letters}`}>
				{glued ? null : <span className="text-ink-muted">|</span>}
				{piece.target ? (
					<PieceLink
						target={piece.target}
						follow={follow}
						label={`${piece.letters}, ${piece.target.canonicalForm}`}
					>
						{piece.letters}
					</PieceLink>
				) : (
					<Filler>{piece.letters}</Filler>
				)}
			</Fragment>
		);
	});
}

/** The Constituents line: one level down, each part one click away. */
export function ConstituentsLine({
	pieces,
	ownerFamily,
	follow,
}: {
	readonly pieces: readonly Constituent[];
	readonly ownerFamily: string;
	readonly follow: (target: WorkspaceTarget) => void;
}) {
	const display = useBreakdownDisplay();
	const phraseme = ownerFamily === "Locution" || ownerFamily === "Saying";
	return (
		<div data-breakdown-line="constituents" className="text-pretty">
			{phraseme ? (
				<PhrasemeConstituents pieces={pieces} follow={follow} />
			) : display.constituents === "ShownLetters" ? (
				<ShownLetters pieces={pieces} follow={follow} />
			) : (
				<DictionaryForms pieces={pieces} follow={follow} />
			)}
		</div>
	);
}
