import { UI_LANGUAGE, uiWordings } from "./wording";

/**
 * The title of an Attestation: its whole unit as written, with the clicked
 * piece emphasised. A fused word is spelled whole even when the unit holds
 * only a piece of it (`zum Bahnhof`, not `m Bahnhof`), and words of other
 * units between the members show as a gap (`fängt … an`).
 */
export type UnitTitlePart =
	| {
			readonly kind: "Piece";
			readonly text: string;
			/** The Segment the click landed on. */
			readonly clicked: boolean;
	  }
	| { readonly kind: "Space" }
	| { readonly kind: "Gap" };

type TitleSegment = { readonly kind: string; readonly text: string };

const isWordPiece = ({ kind }: TitleSegment) =>
	kind !== "Whitespace" && kind !== "Punctuation";

/**
 * The parts of a unit's title, from its Sentence's Segments and its members'
 * indices. Each member is shown with the whole written word it is a piece
 * of: the run of word Segments with nothing between them.
 */
export function unitTitleParts(
	segments: readonly TitleSegment[],
	memberSegmentIndices: readonly number[],
	clickedSegmentIndex?: number,
): UnitTitlePart[] {
	const words = new Map<number, { start: number; end: number }>();
	for (const member of memberSegmentIndices) {
		if (!segments[member]) continue;
		let start = member;
		let end = member;
		while (start > 0 && isWordPiece(segments[start - 1] as TitleSegment))
			start--;
		while (
			end < segments.length - 1 &&
			isWordPiece(segments[end + 1] as TitleSegment)
		)
			end++;
		words.set(start, { start, end });
	}
	const parts: UnitTitlePart[] = [];
	let previousEnd: number | null = null;
	for (const { start, end } of [...words.values()].toSorted(
		(left, right) => left.start - right.start,
	)) {
		if (previousEnd !== null)
			parts.push({
				kind: segments
					.slice(previousEnd + 1, start)
					.every(({ kind }) => kind === "Whitespace")
					? "Space"
					: "Gap",
			});
		for (let index = start; index <= end; index++)
			parts.push({
				kind: "Piece",
				text: segments[index]?.text ?? "",
				clicked: index === clickedSegmentIndex,
			});
		previousEnd = end;
	}
	return parts;
}

/** A unit's title as plain text: `fängt … an`. */
export function unitTitleText(parts: readonly UnitTitlePart[]): string {
	const { unitGap } = uiWordings[UI_LANGUAGE];
	return parts
		.map((part) =>
			part.kind === "Piece"
				? part.text
				: part.kind === "Space"
					? " "
					: unitGap,
		)
		.join("");
}

/**
 * A unit's title, isolated as one target-language run. When the click is
 * known, the other pieces recede so the clicked one stands out.
 */
export function UnitTitle({
	parts,
}: {
	readonly parts: readonly UnitTitlePart[];
}) {
	const { unitGap } = uiWordings[UI_LANGUAGE];
	const emphasised =
		parts.some((part) => part.kind === "Piece" && part.clicked) &&
		parts.some((part) => part.kind === "Piece" && !part.clicked);
	return (
		<bdi>
			{parts.map((part, index) => {
				const key = `${index}:${part.kind}`;
				if (part.kind === "Space") return " ";
				if (part.kind === "Gap")
					return (
						<span key={key} className="text-ink-faint">
							{unitGap}
						</span>
					);
				return (
					<span
						key={key}
						data-clicked-piece={part.clicked || undefined}
						className={
							emphasised && !part.clicked
								? "font-[460] text-ink-muted"
								: undefined
						}
					>
						{part.text}
					</span>
				);
			})}
		</bdi>
	);
}
