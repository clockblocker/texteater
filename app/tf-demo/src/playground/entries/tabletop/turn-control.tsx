import { FlipHorizontal2Icon, FlipVertical2Icon } from "lucide-react";
import { memo } from "react";

/**
 * The corner control that turns a Card over, as Dashboard's info button
 * did: in the bottom inline-end corner, shown while the pointer is over the
 * Card or it holds focus (always on a coarse pointer), with a ring on
 * hover. The back has the same control in the same corner. Its icon flips
 * the way the Card turns.
 */
export const TurnControl = memo(function TurnControl({
	axis,
	onTurn,
}: {
	readonly axis: "x" | "y";
	readonly onTurn: () => void;
}) {
	const Icon = axis === "x" ? FlipVertical2Icon : FlipHorizontal2Icon;
	return (
		<button
			type="button"
			aria-label="Turn over"
			aria-keyshortcuts="F"
			className="absolute end-1.5 bottom-1.5 z-10 grid size-7 cursor-pointer place-items-center rounded-full text-ink-muted opacity-0 transition-opacity duration-150 hover:bg-raised hover:text-ink focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 group-hover/card:opacity-100 group-focus-within/card:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100"
			onPointerDown={(event) => event.stopPropagation()}
			onKeyDown={(event) => {
				/* its own Enter turns the Card; the Card's would open it */
				if (event.key === "Enter" || event.key === " ")
					event.stopPropagation();
			}}
			onClick={onTurn}
		>
			<Icon aria-hidden="true" className="size-4" />
		</button>
	);
});
