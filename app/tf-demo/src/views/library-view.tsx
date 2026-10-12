import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import {
	Badge,
	Button,
	Card,
	CardContent,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	Skeleton,
	Textarea,
} from "lego";
import {
	BookOpenIcon,
	ChevronRightIcon,
	FolderIcon,
	LibraryIcon,
	PlusIcon,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import { usePendingAction } from "@/hooks/use-pending-action";
import { visitorErrorMessage } from "@/lib/visitor-error";
import { GROUND_COLUMN_STYLE } from "@/workspace/compass/pane-chrome";
import { useWorkspaceInteraction } from "@/workspace/workspace-controller";
import { api } from "../../convex/_generated/api";
import { scrollTitle } from "../../shared/scroll-title";
import { type CodexEntry, CodexEntryList, entryTarget } from "./codex-entries";

const exampleText = "Die Banken sind geöffnet. Morgen bleiben sie geschlossen.";

export function LibraryView() {
	const visitorId = useAnonymousVisitorId();
	const { follow } = useWorkspaceInteraction();
	const [isAddScrollOpen, setIsAddScrollOpen] = useState(false);
	const [sourceText, setSourceText] = useState(exampleText);
	const [interactionError, setInteractionError] = useState<string | null>(
		null,
	);
	const libraryQuery = useQuery(convexQuery(api.library.list, { visitorId }));
	const submitText = usePendingAction(api.orchestration.submitText);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setInteractionError(null);
		const normalized = sourceText.trim().normalize("NFC");
		if (!normalized) return;

		try {
			const result = await submitText.run({
				visitorId,
				inspectionVisitorId: import.meta.env.DEV
					? visitorId
					: undefined,
				submissionKey: submissionKeyFor(normalized),
				sourceText: normalized,
			});
			if (result.status === "Rejected") {
				setInteractionError(result.message);
				return;
			}
			follow({
				kind: "Scroll",
				scrollId: result.scrollId,
				title: scrollTitle({ sourceText: normalized }),
			});
			setIsAddScrollOpen(false);
		} catch (cause) {
			setInteractionError(visitorErrorMessage(cause));
		}
	}

	const storedEntries = libraryQuery.data?.filter((entry) => !entry.fixture);
	const fixtureEntries = libraryQuery.data?.filter((entry) => entry.fixture);

	/* a Section opens its Codex, a Scroll the reader */
	function openEntry(entry: CodexEntry) {
		follow(entryTarget(entry));
	}

	const error =
		interactionError ??
		(libraryQuery.error ? visitorErrorMessage(libraryQuery.error) : null);

	return (
		<div className="relative flex h-full min-h-0 flex-col bg-muted/30">
			<div className="min-h-0 flex-1 overflow-y-auto py-8 pb-24 sm:py-12 sm:pb-24">
				<div
					className="mx-auto flex w-full flex-col gap-6"
					style={GROUND_COLUMN_STYLE}
				>
					<header>
						<h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
							Library
						</h1>
					</header>

					<section
						className="flex flex-col gap-3"
						aria-labelledby="library-title"
					>
						<div className="flex items-center justify-between gap-4">
							<h2
								id="library-title"
								className="text-lg font-semibold text-balance"
							>
								Stored texts
							</h2>
							{storedEntries ? (
								<Badge variant="secondary">
									{storedEntries.length}
								</Badge>
							) : null}
						</div>

						{libraryQuery.isPending ? (
							<LibrarySkeleton />
						) : storedEntries && storedEntries.length > 0 ? (
							<CodexEntryList
								entries={storedEntries}
								onOpen={openEntry}
								dated
							/>
						) : (
							<Card size="sm">
								<CardContent className="flex items-center gap-3 py-3 text-ink-muted">
									<LibraryIcon
										className="size-5"
										strokeWidth={1.5}
									/>
									<p className="text-pretty">
										No stored texts yet. Add one with the
										plus button.
									</p>
								</CardContent>
							</Card>
						)}
					</section>

					{fixtureEntries && fixtureEntries.length > 0 ? (
						<details className="group/fixtures">
							<summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md select-none focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
								<span className="flex items-center gap-2">
									<ChevronRightIcon
										className="size-4 text-ink-muted transition-transform group-open/fixtures:rotate-90 rtl:-scale-x-100"
										aria-hidden="true"
									/>
									<FolderIcon
										className="size-4 text-ink-muted"
										aria-hidden="true"
									/>
									<span className="text-lg font-semibold text-balance">
										E2E fixtures
									</span>
								</span>
								<Badge variant="secondary">
									{fixtureEntries.length}
								</Badge>
							</summary>
							<div className="pt-3">
								<CodexEntryList
									entries={fixtureEntries}
									onOpen={openEntry}
									dated
								/>
							</div>
						</details>
					) : null}
				</div>
			</div>

			<Dialog open={isAddScrollOpen} onOpenChange={setIsAddScrollOpen}>
				<DialogTrigger
					render={
						<Button
							size="icon-lg"
							className="absolute end-4 bottom-6 z-10 size-14 rounded-full shadow-lg ring-1 ring-foreground/10 sm:end-6"
						/>
					}
				>
					<PlusIcon className="size-6" aria-hidden="true" />
					<span className="sr-only">Add a text</span>
				</DialogTrigger>
				<DialogContent className="sm:max-w-3xl">
					<DialogHeader>
						<DialogTitle>Add a text</DialogTitle>
						<DialogDescription>
							Add German prose, lyrics, or a book excerpt. The
							text will be split into sentences before analysis.
						</DialogDescription>
					</DialogHeader>
					<form
						id="library-text-submission"
						className="flex flex-col gap-4"
						aria-label="Add text to library"
						onSubmit={(event) => void handleSubmit(event)}
					>
						<FieldGroup>
							<Field
								data-disabled={
									submitText.isPending || undefined
								}
							>
								<FieldLabel htmlFor="library-source-text">
									German text
								</FieldLabel>
								<Textarea
									id="library-source-text"
									name="text"
									className="min-h-36 resize-y"
									value={sourceText}
									onChange={(event) =>
										setSourceText(event.target.value)
									}
									disabled={submitText.isPending}
								/>
							</Field>
						</FieldGroup>
						{error ? <FieldError>{error}</FieldError> : null}
						<DialogFooter>
							<Button
								type="submit"
								disabled={
									submitText.isPending ||
									sourceText.trim().length === 0
								}
							>
								<BookOpenIcon data-icon="inline-start" />
								{submitText.isPending
									? "Analyzing…"
									: "Analyze text"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function LibrarySkeleton() {
	return (
		<div className="grid gap-3" role="status" aria-label="Loading texts">
			{[0, 1, 2, 3].map((index) => (
				<Card key={index} size="sm">
					<CardContent className="flex flex-col gap-3">
						<Skeleton className="h-5 w-4/5" />
						<Skeleton className="h-4 w-2/5" />
					</CardContent>
				</Card>
			))}
		</div>
	);
}

function submissionKeyFor(sourceText: string): string {
	return `text:v1:${sourceText.trim().normalize("NFC")}`;
}
