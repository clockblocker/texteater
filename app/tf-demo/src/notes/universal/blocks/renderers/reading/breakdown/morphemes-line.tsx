import { LinkButton } from "lego";

import type { WorkspaceTarget } from "@/workspace/workspace-subject";
import { useBreakdownDisplay } from "../../common/breakdown-display";
import {
	AboveMark,
	kindName,
	type Morpheme,
	morphemeLabel,
} from "./morpheme-marks";
import { RevealMorphemesLine } from "./morphemes-reveal";

const framedClasses: Readonly<Record<string, string>> = {
	Ending: "rounded-[0.12em] border border-ink-soft px-[0.08em]",
	Interfix: "rounded-full border border-ink-soft px-[0.18em]",
};

function MarkedPiece({
	piece,
	follow,
}: {
	readonly piece: Morpheme;
	readonly follow: (target: WorkspaceTarget) => void;
}) {
	const zero = piece.letters === "";
	const label = morphemeLabel(piece);
	const letters = zero ? (
		<span className="ms-[0.12em] inline-block h-[0.9em] w-[0.55em] translate-y-[0.12em] rounded-[0.1em] border border-ink-soft" />
	) : (
		<span className={framedClasses[piece.kind] ?? "px-px"}>
			{piece.letters}
		</span>
	);
	const link = piece.target?.link;
	return (
		<span
			className="relative inline-block pt-[0.55em]"
			title={kindName(piece.kind)}
		>
			<AboveMark kind={piece.kind} className="text-ink-soft" />
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
 * The Morphemic Breakdown line (ADR 0051): the word kept whole, its
 * morphemes under their school marks, the zero ending an empty box, and a
 * part not split yet one unmarked chunk in the Shadow tone. `Marks` draws
 * every mark at once; `Reveal` shows one morpheme's at a time.
 */
export function MorphemesLine({
	owner,
	pieces,
	follow,
}: {
	/** Names the line, so a pinned reveal survives leaving the Note. */
	readonly owner: string;
	readonly pieces: readonly Morpheme[];
	readonly follow: (target: WorkspaceTarget) => void;
}) {
	const display = useBreakdownDisplay();
	if (display.morphemes === "Reveal")
		return (
			<RevealMorphemesLine
				owner={owner}
				pieces={pieces}
				follow={follow}
			/>
		);
	return (
		<div
			data-breakdown-line="morphemes"
			className="flex flex-wrap items-end gap-y-1 pt-[0.2em] text-[1.2em] tracking-[0.02em]"
		>
			{pieces.map((piece, index) => (
				<MarkedPiece
					key={`${index}:${piece.kind}:${piece.letters}`}
					piece={piece}
					follow={follow}
				/>
			))}
		</div>
	);
}
