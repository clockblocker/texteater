import { Component, type ReactElement, type ReactNode } from "react";

import type { NoteBlockKindFor } from "../note-block-kind";

export function renderErrorBlock(
	blockKind: NoteBlockKindFor<"UnitReadingNote">,
	cause: unknown,
): ReactElement {
	const message =
		cause instanceof Error
			? cause.message
			: typeof cause === "string"
				? cause
				: "This Block could not be rendered.";
	return (
		<section
			className="rounded-lg border border-destructive/40 p-4"
			role="alert"
		>
			<h2 className="text-sm font-medium">{blockKind} unavailable</h2>
			<p className="text-sm text-destructive">{message}</p>
		</section>
	);
}

type ReadingNoteBlockErrorBoundaryProps = {
	readonly blockKind: NoteBlockKindFor<"UnitReadingNote">;
	readonly resetToken: object;
	readonly children: ReactNode;
};

type ReadingNoteBlockErrorBoundaryState = {
	readonly hasError: boolean;
	readonly cause: unknown;
	readonly resetToken: object;
};

export class ReadingNoteBlockErrorBoundary extends Component<
	ReadingNoteBlockErrorBoundaryProps,
	ReadingNoteBlockErrorBoundaryState
> {
	constructor(props: ReadingNoteBlockErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
			cause: undefined,
			resetToken: props.resetToken,
		};
	}

	static getDerivedStateFromProps(
		props: ReadingNoteBlockErrorBoundaryProps,
		state: ReadingNoteBlockErrorBoundaryState,
	): Partial<ReadingNoteBlockErrorBoundaryState> | null {
		return props.resetToken === state.resetToken
			? null
			: {
					hasError: false,
					cause: undefined,
					resetToken: props.resetToken,
				};
	}

	static getDerivedStateFromError(cause: unknown) {
		return { hasError: true, cause };
	}

	render(): ReactNode {
		return this.state.hasError
			? renderErrorBlock(this.props.blockKind, this.state.cause)
			: this.props.children;
	}
}
