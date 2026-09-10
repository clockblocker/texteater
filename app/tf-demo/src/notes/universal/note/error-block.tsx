import { Component, type ReactElement, type ReactNode } from "react";

import type { NoteBlockKind } from "../blocks/kind";

export function renderErrorBlock(
	blockKind: NoteBlockKind,
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

type NoteBlockErrorBoundaryProps = {
	readonly blockKind: NoteBlockKind;
	readonly resetToken: object;
	readonly children?: ReactNode;
};

type NoteBlockErrorBoundaryState = {
	readonly hasError: boolean;
	readonly cause: unknown;
	readonly resetToken: object;
};

export class NoteBlockErrorBoundary extends Component<
	NoteBlockErrorBoundaryProps,
	NoteBlockErrorBoundaryState
> {
	constructor(props: NoteBlockErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
			cause: undefined,
			resetToken: props.resetToken,
		};
	}

	static getDerivedStateFromProps(
		props: NoteBlockErrorBoundaryProps,
		state: NoteBlockErrorBoundaryState,
	): Partial<NoteBlockErrorBoundaryState> | null {
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
