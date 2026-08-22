import { LibraryIcon } from "lucide-react";
import { Link } from "react-router-dom";

import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { hrefFor } from "@/lib/navigation";

export function NotFoundView({
	title = "Page not found",
	description = "This destination does not exist, was removed, or is not available yet.",
}: {
	title?: string;
	description?: string;
}) {
	return (
		<div className="flex flex-1 items-center justify-center bg-muted/30 px-4 py-12">
			<div className="flex w-full max-w-md flex-col">
				<Card className="w-full max-w-md self-center">
					<CardHeader>
						<CardTitle>{title}</CardTitle>
						<CardDescription>{description}</CardDescription>
					</CardHeader>
					<CardFooter className="justify-end">
						<Link
							to={hrefFor({ kind: "Library" })}
							className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
						>
							<LibraryIcon className="size-4" />
							Back to library
						</Link>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
