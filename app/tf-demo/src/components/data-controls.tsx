import type { FunctionArgs } from "convex/server";
import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Checkbox,
	Field,
	FieldContent,
	FieldDescription,
	FieldLabel,
} from "lego";
import {
	BookOpenIcon,
	DatabaseZapIcon,
	EraserIcon,
	UserRoundXIcon,
} from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import { usePendingAction } from "@/hooks/use-pending-action";
import { parseSubmittedTextId } from "@/lib/action-results";
import { useRouteNotePreference } from "@/lib/route-note-preference";
import { useWorkspaceController } from "@/workspace/workspace-controller";
import { api } from "../../convex/_generated/api";

type TextId = FunctionArgs<typeof api.demoReset.stripTextAnalysis>["textId"];

export function DataControls({
	text,
}: {
	text?: { textId: TextId; sourceText: string; isAnalyzed: boolean };
}) {
	const [routeNotesEnabled, setRouteNotesEnabled] = useRouteNotePreference();
	const demoData = useDemoDataControls(text);
	return (
		<div className="flex flex-col gap-6">
			<ReadingBehaviorCard
				enabled={routeNotesEnabled}
				onEnabledChange={setRouteNotesEnabled}
			/>
			<DemoDataCard text={text} {...demoData} />
		</div>
	);
}

function useDemoDataControls(
	text:
		| { textId: TextId; sourceText: string; isAnalyzed: boolean }
		| undefined,
) {
	const { revealLibrary } = useWorkspaceController();
	const visitorId = useAnonymousVisitorId();
	const [notice, setNotice] = useState<string | null>(null);
	const [interactionError, setInteractionError] = useState<string | null>(
		null,
	);
	const clearSharedData = usePendingAction(api.demoReset.clearSharedData);
	const clearVisitorData = usePendingAction(api.demoReset.clearVisitorData);
	const stripTextAnalysis = usePendingAction(api.demoReset.stripTextAnalysis);
	const analyzeText = usePendingAction(api.orchestration.submitText);
	const isBusy =
		clearSharedData.isPending ||
		clearVisitorData.isPending ||
		stripTextAnalysis.isPending ||
		analyzeText.isPending;
	const error = interactionError;

	async function handleClearVisitorData() {
		setNotice(null);
		setInteractionError(null);
		try {
			const result = await clearVisitorData.run({ visitorId });
			setNotice(`Cleared ${result.deleted} visitor-owned records.`);
		} catch (cause) {
			setInteractionError(
				mutationMessage(cause) ?? "Visitor-data reset failed.",
			);
		}
	}

	async function handleStripTextAnalysis() {
		if (!text) return;
		setNotice(null);
		setInteractionError(null);
		try {
			const result = await stripTextAnalysis.run({
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
			const result = await analyzeText.run({
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
		setNotice(null);
		setInteractionError(null);
		try {
			const result = await clearSharedData.run({});
			revealLibrary();
			setNotice(
				`Cleared ${result.deleted} shared records. Visitor-owned history was kept.`,
			);
		} catch (cause) {
			setInteractionError(
				mutationMessage(cause) ?? "Shared-data reset failed.",
			);
		}
	}

	return {
		notice,
		error,
		isBusy,
		isClearingSharedData: clearSharedData.isPending,
		isClearingVisitorData: clearVisitorData.isPending,
		isStrippingTextAnalysis: stripTextAnalysis.isPending,
		isAnalyzingText: analyzeText.isPending,
		handleClearVisitorData,
		handleStripTextAnalysis,
		handleAnalyzeText,
		handleClearSharedData,
	};
}

function ReadingBehaviorCard({
	enabled,
	onEnabledChange,
}: {
	enabled: boolean;
	onEnabledChange(enabled: boolean): void;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Reading behavior</CardTitle>
			</CardHeader>
			<CardContent>
				<Field orientation="horizontal">
					<Checkbox
						id="open-route-notes"
						checked={enabled}
						onCheckedChange={onEnabledChange}
					/>
					<FieldContent>
						<FieldLabel htmlFor="open-route-notes">
							Open resolution Notes
						</FieldLabel>
						<FieldDescription>
							Start Segment selections at the Attestation Note.
							Hold Alt/Option for one selection without changing
							this setting.
						</FieldDescription>
					</FieldContent>
				</Field>
			</CardContent>
		</Card>
	);
}

function DemoDataCard({
	text,
	notice,
	error,
	isBusy,
	isClearingSharedData,
	isClearingVisitorData,
	isStrippingTextAnalysis,
	isAnalyzingText,
	handleClearVisitorData,
	handleStripTextAnalysis,
	handleAnalyzeText,
	handleClearSharedData,
}: {
	text?: { textId: TextId; sourceText: string; isAnalyzed: boolean };
	notice: string | null;
	error: string | null;
	isBusy: boolean;
	isClearingSharedData: boolean;
	isClearingVisitorData: boolean;
	isStrippingTextAnalysis: boolean;
	isAnalyzingText: boolean;
	handleClearVisitorData(): Promise<void>;
	handleStripTextAnalysis(): Promise<void>;
	handleAnalyzeText(): Promise<void>;
	handleClearSharedData(): Promise<void>;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Demo data</CardTitle>
				{text ? (
					<CardDescription
						className="truncate"
						title={text.sourceText}
					>
						{text.sourceText}
					</CardDescription>
				) : null}
			</CardHeader>
			<CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
				<ConfirmDialog
					trigger={
						<Button
							type="button"
							variant="outline"
							disabled={isBusy}
						/>
					}
					title="Clear your data?"
					description="This removes only your Encounter history. Shared resolutions and Knowledge stay available."
					confirmLabel="Clear my data"
					onConfirm={() => void handleClearVisitorData()}
				>
					<UserRoundXIcon data-icon="inline-start" />
					{isClearingVisitorData
						? "Clearing your data…"
						: "Clear my data"}
				</ConfirmDialog>
				{text?.isAnalyzed ? (
					<ConfirmDialog
						trigger={
							<Button
								type="button"
								variant="destructive"
								disabled={isBusy}
							/>
						}
						title="Strip the analysis from this text?"
						description="The Text and its Sentences remain. Segments, resolutions, Clicks, and Readings with no other source are removed."
						confirmLabel="Strip analysis"
						onConfirm={() => void handleStripTextAnalysis()}
					>
						<EraserIcon data-icon="inline-start" />
						{isStrippingTextAnalysis
							? "Stripping analysis…"
							: "Strip analysis"}
					</ConfirmDialog>
				) : text ? (
					<Button
						type="button"
						disabled={isBusy}
						onClick={() => void handleAnalyzeText()}
					>
						<BookOpenIcon data-icon="inline-start" />
						{isAnalyzingText ? "Analyzing…" : "Analyze text"}
					</Button>
				) : null}
				<ConfirmDialog
					trigger={
						<Button
							type="button"
							variant="destructive"
							disabled={isBusy}
						/>
					}
					title="Clear shared data for every visitor?"
					description="This removes all Texts, Sentences, Segments, Readings, Lemmas, relations, and Knowledge."
					confirmLabel="Clear shared data"
					onConfirm={() => void handleClearSharedData()}
				>
					<DatabaseZapIcon data-icon="inline-start" />
					{isClearingSharedData
						? "Clearing shared data…"
						: "Clear shared data"}
				</ConfirmDialog>
			</CardContent>
			{notice ? (
				<CardContent>
					<p className="text-sm text-ink-muted" aria-live="polite">
						{notice}
					</p>
				</CardContent>
			) : null}
			{error ? (
				<CardContent>
					<p className="text-sm text-destructive" role="alert">
						{error}
					</p>
				</CardContent>
			) : null}
		</Card>
	);
}

function mutationMessage(error: unknown): string | null {
	return error instanceof Error ? error.message : null;
}

function submissionKeyFor(sourceText: string): string {
	return `text:v1:${sourceText.trim().normalize("NFC")}`;
}
