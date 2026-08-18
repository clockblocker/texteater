import { useMutation } from "@tanstack/react-query";
import { useAction } from "convex/react";
import type { FunctionArgs } from "convex/server";
import {
	BookOpenIcon,
	DatabaseZapIcon,
	EraserIcon,
	UserRoundXIcon,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import { parseSubmittedTextId } from "@/lib/action-results";
import { hrefFor } from "@/lib/navigation";
import { useRouteNotePreference } from "@/lib/route-note-preference";
import { api } from "../../convex/_generated/api";

type TextId = FunctionArgs<typeof api.demoReset.stripTextAnalysis>["textId"];

export function DataControls({
	text,
}: {
	text?: { textId: TextId; sourceText: string; isAnalyzed: boolean };
}) {
	const navigate = useNavigate();
	const visitorId = useAnonymousVisitorId();
	const [routeNotesEnabled, setRouteNotesEnabled] = useRouteNotePreference();
	const [notice, setNotice] = useState<string | null>(null);
	const [interactionError, setInteractionError] = useState<string | null>(
		null,
	);
	const clearSharedData = useMutation({
		mutationFn: useAction(api.demoReset.clearSharedData),
	});
	const clearVisitorData = useMutation({
		mutationFn: useAction(api.demoReset.clearVisitorData),
	});
	const stripTextAnalysis = useMutation({
		mutationFn: useAction(api.demoReset.stripTextAnalysis),
	});
	const analyzeText = useMutation({
		mutationFn: useAction(api.orchestration.submitText),
	});
	const isBusy =
		clearSharedData.isPending ||
		clearVisitorData.isPending ||
		stripTextAnalysis.isPending ||
		analyzeText.isPending;
	const error =
		interactionError ??
		mutationMessage(clearSharedData.error) ??
		mutationMessage(clearVisitorData.error) ??
		mutationMessage(stripTextAnalysis.error) ??
		mutationMessage(analyzeText.error);

	async function handleClearVisitorData() {
		if (
			!window.confirm(
				"Clear this visitor's data? This removes only your Click history; shared resolutions and Knowledge stay available.",
			)
		) {
			return;
		}
		setNotice(null);
		setInteractionError(null);
		try {
			const result = await clearVisitorData.mutateAsync({ visitorId });
			setNotice(`Cleared ${result.deleted} visitor-owned records.`);
		} catch (cause) {
			setInteractionError(
				mutationMessage(cause) ?? "Visitor-data reset failed.",
			);
		}
	}

	async function handleStripTextAnalysis() {
		if (!text) return;
		if (
			!window.confirm(
				`Strip the analysis from “${text.sourceText}”? The Text and its Sentences will remain. Segments, resolutions, Clicks, and Readings with no other source will be removed.`,
			)
		) {
			return;
		}
		setNotice(null);
		setInteractionError(null);
		try {
			const result = await stripTextAnalysis.mutateAsync({
				textId: text.textId,
			});
			setNotice(
				`Stripped ${result.removed} analysis records. The Text and its Sentences were kept.`,
			);
		} catch (cause) {
			setInteractionError(
				mutationMessage(cause) ?? "Analysis stripping failed.",
			);
		}
	}

	async function handleAnalyzeText() {
		if (!text) return;
		setNotice(null);
		setInteractionError(null);
		try {
			const result = await analyzeText.mutateAsync({
				submissionKey: submissionKeyFor(text.sourceText),
				sourceText: text.sourceText,
			});
			const analyzedTextId = parseSubmittedTextId(result);
			if (analyzedTextId !== text.textId) {
				throw new Error("Analysis was saved to a different Text.");
			}
			setNotice("Text analysis restored.");
		} catch (cause) {
			setInteractionError(
				mutationMessage(cause) ?? "Text analysis failed.",
			);
		}
	}

	async function handleClearSharedData() {
		if (
			!window.confirm(
				"Clear shared data for every visitor? This removes all Texts, Sentences, Segments, Readings, Lemmas, relations, and Knowledge.",
			)
		) {
			return;
		}
		setNotice(null);
		setInteractionError(null);
		try {
			const result = await clearSharedData.mutateAsync({});
			navigate(hrefFor({ kind: "Library" }));
			setNotice(
				`Cleared ${result.deleted} shared records. Visitor-owned history was kept.`,
			);
		} catch (cause) {
			setInteractionError(
				mutationMessage(cause) ?? "Shared-data reset failed.",
			);
		}
	}

	return (
		<footer className="flex flex-col gap-3 border-t pt-4">
			<label className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3 text-sm">
				<input
					type="checkbox"
					className="mt-0.5 size-4 accent-primary"
					checked={routeNotesEnabled}
					onChange={(event) =>
						setRouteNotesEnabled(event.currentTarget.checked)
					}
				/>
				<span>
					<span className="block font-medium">Open Route Notes</span>
					<span className="block text-xs leading-relaxed text-muted-foreground">
						Start Segment selections at the Attestation Route Note.
						Hold Alt/Option for one selection without changing this
						setting.
					</span>
				</span>
			</label>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-xs leading-relaxed text-muted-foreground">
					Demo data controls. Destructive actions require
					confirmation.
				</p>
				<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
					<Button
						type="button"
						variant="outline"
						disabled={isBusy}
						onClick={() => void handleClearVisitorData()}
					>
						<UserRoundXIcon data-icon="inline-start" />
						{clearVisitorData.isPending
							? "Clearing your data…"
							: "Clear my data"}
					</Button>
					{text?.isAnalyzed ? (
						<Button
							type="button"
							variant="destructive"
							disabled={isBusy}
							onClick={() => void handleStripTextAnalysis()}
						>
							<EraserIcon data-icon="inline-start" />
							{stripTextAnalysis.isPending
								? "Stripping analysis…"
								: "Strip analysis"}
						</Button>
					) : text ? (
						<Button
							type="button"
							disabled={isBusy}
							onClick={() => void handleAnalyzeText()}
						>
							<BookOpenIcon data-icon="inline-start" />
							{analyzeText.isPending
								? "Analyzing…"
								: "Analyze text"}
						</Button>
					) : null}
					<Button
						type="button"
						variant="destructive"
						disabled={isBusy}
						onClick={() => void handleClearSharedData()}
					>
						<DatabaseZapIcon data-icon="inline-start" />
						{clearSharedData.isPending
							? "Clearing shared data…"
							: "Clear shared data"}
					</Button>
				</div>
			</div>
			{notice ? (
				<p className="text-sm text-muted-foreground" aria-live="polite">
					{notice}
				</p>
			) : null}
			{error ? (
				<p className="text-sm text-destructive" role="alert">
					{error}
				</p>
			) : null}
		</footer>
	);
}

function mutationMessage(error: unknown): string | null {
	return error instanceof Error ? error.message : null;
}

function submissionKeyFor(sourceText: string): string {
	return `text:v1:${sourceText.trim().normalize("NFC")}`;
}
