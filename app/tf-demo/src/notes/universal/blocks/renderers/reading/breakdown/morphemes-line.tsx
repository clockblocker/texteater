import { LinkButton } from "lego";
import { Fragment } from "react";

import type { WorkspaceTarget } from "@/workspace/workspace-subject";
import { useBreakdownDisplay } from "../../common/breakdown-display";
import type { BreakdownData } from "./constituents-line";

type Morpheme = NonNullable<BreakdownData["morphemes"]>[number];

/**
 * The school mark a Kind wears above its letters (разбор по составу): the
 * prefix's bracket ¬, the root's arc ⌒ and the suffix's caret ^. The Ending's
 * box and the Interfix's ring are drawn around the letters instead.
 */
const markPaths: Readonly<Record<string, string>> = {
	Prefix: "M1 9 V1.5 H99 V9",
	Root: "M1 9 Q50 -7 99 9",
	Suffix: "M1 9 L50 1 L99 9",
	Suffixoid: "M1 9 L50 1 L99 9",
};

const kindNames: Readonly<Record<string, string>> = {
	Prefix: "prefix",
	Root: "root",
	Suffix: "suffix",
	Suffixoid: "suffixoid",
	Interfix: "linking element",
	Ending: "ending",
	Chunk: "not split yet",
};

function Mark({ kind }: { readonly kind: string }) {
	const path = markPaths[kind];
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 100 10"
			preserveAspectRatio="none"
			className="absolute inset-x-px top-0 h-[0.45em] w-[calc(100%-2px)] overflow-visible text-ink-soft rtl:-scale-x-100"
		>
			{path ? (
				<path
					d={path}
					fill="none"
					stroke="currentColor"
					strokeWidth={1.4}
					vectorEffect="non-scaling-stroke"
					strokeLinejoin="round"
				/>
			) : null}
		</svg>
	);
}

const framedClasses: Readonly<Record<string, string>> = {
	Ending: "rounded-[0.12em] border border-ink-soft px-[0.08em]",
	Interfix: "rounded-full border border-ink-soft px-[0.18em]",
};

function MorphemePiece({
	piece,
	follow,
}: {
	readonly piece: Morpheme;
	readonly follow: (target: WorkspaceTarget) => void;
}) {
	const zero = piece.letters === "";
	const name = kindNames[piece.kind] ?? piece.kind.toLowerCase();
	const label = zero ? "zero ending" : `${piece.letters}, ${name}`;
	const letters = zero ? (
		<span className="ms-[0.12em] inline-block h-[0.9em] w-[0.55em] translate-y-[0.12em] rounded-[0.1em] border border-ink-soft" />
	) : (
		<span className={framedClasses[piece.kind] ?? "px-px"}>
			{piece.letters}
		</span>
	);
	const link = piece.target?.link;
	return (
		<span className="relative inline-block pt-[0.55em]" title={name}>
			<Mark kind={piece.kind} />
			{link ? (
				<LinkButton
					// Letters read as the word itself, as in a school notebook; a
					// part not split yet keeps the Shadow tone of a pending link.
					tone={piece.kind === "Chunk" ? "shadow" : "quiet"}
					className={
						piece.kind === "Chunk"
							? "rounded-sm"
							: "rounded-sm text-ink hover:text-link"
					}
					aria-label={label}
					onClick={() => follow(link)}
				>
					{letters}
				</LinkButton>
			) : (
				<span role="img" aria-label={label} className="text-ink-soft">
					{letters}
				</span>
			)}
		</span>
	);
}

/**
 * The Morphemic Breakdown line: every morpheme flat under its school mark,
 * the zero ending an empty box, and a part not split yet one unmarked chunk
 * in the Shadow tone (ADR 0051).
 */
export function MorphemesLine({
	pieces,
	follow,
}: {
	readonly pieces: readonly Morpheme[];
	readonly follow: (target: WorkspaceTarget) => void;
}) {
	const display = useBreakdownDisplay();
	return (
		<div
			data-breakdown-line="morphemes"
			className="flex flex-wrap items-end gap-y-1 pt-[0.2em] text-[1.2em] tracking-[0.02em]"
		>
			{pieces.map((piece, index) => (
				<Fragment key={`${index}:${piece.kind}:${piece.letters}`}>
					{display.morphemes === "Dots" && index > 0 ? (
						<span className="px-[0.3em] text-ink-muted">·</span>
					) : null}
					<MorphemePiece piece={piece} follow={follow} />
				</Fragment>
			))}
		</div>
	);
}
