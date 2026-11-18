import { Button, IconSwap } from "lego";
import { ChevronDownIcon, LoaderCircleIcon } from "lucide-react";

/**
 * The control that ends a list which has more to show. In a Sheet it is a
 * quiet line of text on the Note's leading edge, with a faint fill under
 * the pointer that hangs outside the column by its padding. A Card keeps
 * the outlined button, which rests there.
 */
export function LoadMore({
	label,
	isLoading,
	loadMore,
	card = false,
}: {
	/** What a press loads: "Load more Source Contexts". */
	readonly label: string;
	readonly isLoading: boolean;
	/** Null while nothing can be loaded. */
	readonly loadMore: (() => unknown) | null;
	readonly card?: boolean;
}) {
	const disabled = isLoading || loadMore === null;
	const icon = (
		<IconSwap
			data-icon="inline-start"
			active={isLoading}
			idle={<ChevronDownIcon />}
			busy={<LoaderCircleIcon className="animate-spin" />}
		/>
	);
	const text = isLoading ? "Loading…" : label;
	if (card)
		return (
			<Button
				variant="outline"
				size="sm"
				className="mt-4 w-fit"
				disabled={disabled}
				onClick={() => void loadMore?.()}
			>
				{icon}
				{text}
			</Button>
		);
	return (
		<button
			type="button"
			data-slot="load-more"
			disabled={disabled}
			onClick={() => void loadMore?.()}
			className="-mx-2 mt-3 flex w-fit cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm text-ink-muted transition-[color,background-color] duration-150 ease-out hover:bg-ink/[0.04] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link/50 disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-ink-muted [&_svg]:size-3.5"
		>
			{icon}
			{text}
		</button>
	);
}
