import type { ReactElement } from "react";

import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export function renderErrorNote(
	cause: unknown,
	title = "Note unavailable",
): ReactElement {
	const description =
		cause instanceof Error
			? cause.message
			: typeof cause === "string"
				? cause
				: "This Note could not be rendered.";

	return (
		<main
			className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-12"
			role="alert"
		>
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</CardHeader>
			</Card>
		</main>
	);
}
