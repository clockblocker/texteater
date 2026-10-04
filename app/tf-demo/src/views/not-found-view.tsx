import { Card, CardDescription, CardHeader, CardTitle } from "lego";
import { useNotePart } from "@/workspace/note-part";

/**
 * A Note whose Subject is gone or never was. Its Sheet's Back leaves it, so
 * it offers no way out of its own. Drawn as a Heading, it is its title.
 */
export function NotFoundView({
	title = "Page not found",
	description = "This destination does not exist, was removed, or is not available yet.",
}: {
	title?: string;
	description?: string;
}) {
	if (useNotePart() === "heading")
		return <span className="min-w-0 truncate">{title}</span>;
	return (
		<div className="flex flex-1 items-center justify-center bg-muted/30 px-4 py-12">
			<div className="flex w-full max-w-md flex-col">
				<Card className="w-full max-w-md self-center">
					<CardHeader>
						<CardTitle>{title}</CardTitle>
						<CardDescription>{description}</CardDescription>
					</CardHeader>
				</Card>
			</div>
		</div>
	);
}
