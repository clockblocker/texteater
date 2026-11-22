import { NoteLoadMore } from "lego";

/**
 * The control that ends a list which has more to show. Delegates to the
 * unified `NoteLoadMore` molecule (collapses cleanly in Card, blooms in Sheet).
 */
export function LoadMore({
	label,
	isLoading,
	loadMore,
}: {
	/** What a press loads: "Load more passages". */
	readonly label: string;
	readonly isLoading: boolean;
	/** Null while nothing can be loaded. */
	readonly loadMore: (() => unknown) | null;
}) {
	return (
		<NoteLoadMore
			label={label}
			isLoading={isLoading}
			onLoadMore={loadMore}
		/>
	);
}
