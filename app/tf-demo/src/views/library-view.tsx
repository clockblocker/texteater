import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";
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
	ArrowRightIcon,
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
import { useWorkspaceInteraction } from "@/workspace/workspace-controller";
import { api } from "../../convex/_generated/api";
import { textTitle } from "../../shared/text-title";

type LibraryText = FunctionReturnType<typeof api.texts.list>[number];

const exampleText = "Die Banken sind geöffnet. Morgen bleiben sie geschlossen.";
const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
});

export function LibraryView() {
	const visitorId = useAnonymousVisitorId();
	const { follow } = useWorkspaceInteraction();
	const [isAddTextOpen, setIsAddTextOpen] = useState(false);
	const [sourceText, setSourceText] = useState(exampleText);
	const [interactionError, setInteractionError] = useState<string | null>(
		null,
	);
	const textsQuery = useQuery(convexQuery(api.texts.list, {}));
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
				kind: "Text",
				textId: result.textId,
				title: textTitle({ sourceText: normalized }),
			});
			setIsAddTextOpen(false);
		} catch (cause) {
			setInteractionError(visitorErrorMessage(cause));
		}
	}

	const storedTexts = textsQuery.data?.filter((text) => !text.fixture);
	const fixtureTexts = textsQuery.data?.filter((text) => text.fixture);

	function openText(text: LibraryText) {
		follow({ kind: "Text", textId: text.textId, title: textTitle(text) });
	}

	const error =
		interactionError ??
		(textsQuery.error ? visitorErrorMessage(textsQuery.error) : null);

	return (
		<div className="relative flex h-full min-h-0 flex-col bg-muted/30">
			<div className="min-h-0 flex-1 overflow-y-auto px-4 py-8 pb-24 sm:px-6 sm:py-12 sm:pb-24">
				<div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
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
							{storedTexts ? (
								<Badge variant="secondary">
									{storedTexts.length}
								</Badge>
							) : null}
						</div>

						{textsQuery.isPending ? (
							<LibrarySkeleton />
						) : storedTexts && storedTexts.length > 0 ? (
							<LibraryTextGrid
								texts={storedTexts}
								onOpen={openText}
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

					{fixtureTexts && fixtureTexts.length > 0 ? (
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
									{fixtureTexts.length}
								</Badge>
							</summary>
							<div className="pt-3">
								<LibraryTextGrid
									texts={fixtureTexts}
									onOpen={openText}
								/>
							</div>
						</details>
					) : null}
				</div>
			</div>

			<Dialog open={isAddTextOpen} onOpenChange={setIsAddTextOpen}>
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

function LibraryTextGrid({
	texts,
	onOpen,
}: {
	readonly texts: readonly LibraryText[];
	readonly onOpen: (text: LibraryText) => void;
}) {
	return (
		<div className="grid gap-3 sm:grid-cols-2">
			{texts.map((text) => (
				<button
					key={text.textId}
					type="button"
					onClick={() => onOpen(text)}
					className="group rounded-xl bg-card p-4 text-start text-card-foreground ring-1 ring-foreground/10 transition-[background-color,scale] duration-150 ease-out hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.96]"
				>
					<div className="flex items-start justify-between gap-4">
						<div className="flex min-w-0 flex-col gap-2">
							<p className="line-clamp-3 text-base leading-relaxed font-medium">
								{text.title ?? text.sourceText}
							</p>
							<p className="text-xs text-ink-muted tabular-nums">
								Added {formatDate(text.createdAt)}
							</p>
						</div>
						<ArrowRightIcon className="mt-1 size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" />
					</div>
				</button>
			))}
		</div>
	);
}

function LibrarySkeleton() {
	return (
		<div
			className="grid gap-3 sm:grid-cols-2"
			role="status"
			aria-label="Loading texts"
		>
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

function formatDate(timestamp: number): string {
	return shortDateFormatter.format(timestamp);
}

function submissionKeyFor(sourceText: string): string {
	return `text:v1:${sourceText.trim().normalize("NFC")}`;
}
