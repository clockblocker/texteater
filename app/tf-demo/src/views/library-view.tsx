import { convexQuery } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import {
	ArrowRightIcon,
	BookOpenIcon,
	LibraryIcon,
	PlusIcon,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { PageNavigation } from "@/components/page-navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { parseSubmittedTextId } from "@/lib/action-results";
import { hrefFor } from "@/lib/navigation";
import { api } from "../../convex/_generated/api";

const exampleText = "Die Banken sind geöffnet.";
const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
});

export function LibraryView() {
	const navigate = useNavigate();
	const [sourceText, setSourceText] = useState(exampleText);
	const [interactionError, setInteractionError] = useState<string | null>(
		null,
	);
	const textsQuery = useQuery({
		...convexQuery(api.texts.list, {}),
		gcTime: 10_000,
	});
	const submitTextAction = useAction(api.orchestration.submitText);
	const submitText = useMutation({ mutationFn: submitTextAction });

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setInteractionError(null);
		const normalized = sourceText.trim().normalize("NFC");
		if (!normalized) return;

		try {
			const result = await submitText.mutateAsync({
				submissionKey: submissionKeyFor(normalized),
				sourceText: normalized,
			});
			navigate(
				hrefFor({
					kind: "Text",
					textId: parseSubmittedTextId(result),
				}),
			);
		} catch (cause) {
			setInteractionError(
				mutationMessage(cause) ?? "Text analysis failed.",
			);
		}
	}

	const error = interactionError ?? mutationMessage(textsQuery.error);

	return (
		<main className="min-h-svh bg-muted/30 px-4 py-8 sm:px-6 sm:py-12">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
				<header className="flex flex-wrap items-start justify-between gap-4">
					<div className="flex flex-col gap-2">
						<p className="text-sm font-medium text-muted-foreground">
							tf-demo
						</p>
						<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
							Library
						</h1>
						<p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
							Open a stored text to inspect its sentences and
							resolve German segments.
						</p>
					</div>
					<PageNavigation showLibrary={false} />
				</header>

				<section
					className="flex flex-col gap-3"
					aria-labelledby="library-title"
				>
					<div className="flex items-center justify-between gap-4">
						<h2
							id="library-title"
							className="text-lg font-semibold"
						>
							Stored texts
						</h2>
						{textsQuery.data ? (
							<Badge variant="secondary">
								{textsQuery.data.length}
							</Badge>
						) : null}
					</div>

					{textsQuery.isPending ? (
						<LibrarySkeleton />
					) : textsQuery.data && textsQuery.data.length > 0 ? (
						<div className="grid gap-3 sm:grid-cols-2">
							{textsQuery.data.map((text) => (
								<Link
									key={text.textId}
									to={hrefFor({
										kind: "Text",
										textId: text.textId,
									})}
									className="group rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
								>
									<div className="flex items-start justify-between gap-4">
										<div className="flex min-w-0 flex-col gap-2">
											<p className="line-clamp-3 text-base leading-relaxed font-medium">
												{text.sourceText}
											</p>
											<p className="text-xs text-muted-foreground">
												Added{" "}
												{formatDate(text.createdAt)}
											</p>
										</div>
										<ArrowRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
									</div>
								</Link>
							))}
						</div>
					) : (
						<Card size="sm">
							<CardContent className="flex items-center gap-3 py-3 text-muted-foreground">
								<LibraryIcon className="size-5" />
								<p>
									No stored texts yet. Add one with the plus
									button.
								</p>
							</CardContent>
						</Card>
					)}
				</section>
			</div>

			<Dialog>
				<DialogTrigger
					render={
						<Button
							size="icon-lg"
							className="fixed bottom-6 left-6 size-14 rounded-full shadow-lg"
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
							Analyze a short German sentence and save it to the
							library.
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
									German sentence
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
		</main>
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

function mutationMessage(error: unknown): string | null {
	return error instanceof Error ? error.message : null;
}

function formatDate(timestamp: number): string {
	return shortDateFormatter.format(timestamp);
}

function submissionKeyFor(sourceText: string): string {
	return `text:v1:${sourceText.trim().normalize("NFC")}`;
}
