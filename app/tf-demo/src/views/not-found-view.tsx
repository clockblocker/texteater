import {
	Button,
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "lego";
import { LibraryIcon } from "lucide-react";
import { useWorkspaceController } from "@/workspace/workspace-controller";

export function NotFoundView({
	title = "Page not found",
	description = "This destination does not exist, was removed, or is not available yet.",
}: {
	title?: string;
	description?: string;
}) {
	const { revealLibrary } = useWorkspaceController();
	return (
		<div className="flex flex-1 items-center justify-center bg-muted/30 px-4 py-12">
			<div className="flex w-full max-w-md flex-col">
				<Card className="w-full max-w-md self-center">
					<CardHeader>
						<CardTitle>{title}</CardTitle>
						<CardDescription>{description}</CardDescription>
					</CardHeader>
					<CardFooter className="justify-end">
						<Button onClick={revealLibrary}>
							<LibraryIcon data-icon="inline-start" />
							Back to library
						</Button>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
