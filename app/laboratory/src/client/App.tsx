import {
	CheckIcon,
	CircleAlertIcon,
	CircleDotIcon,
	MousePointerClickIcon,
	PlayIcon,
	RotateCcwIcon,
	RouteIcon,
	ScissorsIcon,
} from "lucide-react";
import {
	type KeyboardEvent,
	type SyntheticEvent,
	useCallback,
	useEffect,
	useState,
} from "react";
import type { Layout, LayoutChangedMeta } from "react-resizable-panels";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
	ClassificationStageResult,
	ClickResolutionResponse,
	LaboratorySessionResponse,
	MemberOrthography,
	Segment,
	SegmentationResponse,
	SegmentationStageResult,
} from "../shared/contract";

const sampleText =
	"Guten Morgen! Fritz steht sofort auf. Draußen ist es noch still, und in der Küche wartet schon der erste Kaffee.";
const layoutStoragePrefix = "texteater.laboratory.layout.v2";

type ResolvedClickResolution = Extract<
	ClickResolutionResponse,
	{ decision: "Resolved" }
>;

function orthographiesBySegmentIndex(
	resolution: ResolvedClickResolution,
): Record<number, MemberOrthography> {
	return Object.fromEntries(
		resolution.interaction.memberSegmentIndices.map(
			(segmentIndex, position) => {
				const member = resolution.entity.attestation.members[position];
				if (!member) {
					throw new Error(
						"Attestation members and interaction indices are not positionally aligned.",
					);
				}
				return [segmentIndex, member.orthography];
			},
		),
	);
}

function loadLayout(storageKey: string, fallback: Layout): Layout {
	if (typeof window === "undefined") return fallback;

	try {
		const stored = JSON.parse(
			window.localStorage.getItem(storageKey) ?? "null",
		) as unknown;
		if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
			return fallback;
		}

		const panelIds = Object.keys(fallback);
		if (
			Object.keys(stored).length !== panelIds.length ||
			!panelIds.every((panelId) => {
				const size = (stored as Record<string, unknown>)[panelId];
				return (
					typeof size === "number" &&
					Number.isFinite(size) &&
					size >= 0
				);
			})
		) {
			return fallback;
		}

		return stored as Layout;
	} catch {
		return fallback;
	}
}

function saveLayout(
	storageKey: string,
	layout: Layout,
	meta: LayoutChangedMeta,
) {
	if (!meta.isUserInteraction || typeof window === "undefined") return;

	try {
		window.localStorage.setItem(storageKey, JSON.stringify(layout));
	} catch {
		// Resizing should continue to work when storage is unavailable.
	}
}

type LaboratoryState = {
	text: string;
	setText: (value: string) => void;
	result: SegmentationResponse | null;
	resolution: ClickResolutionResponse | null;
	activeIndex: number | null;
	selectSegment: (index: number) => Promise<void>;
	segment: (selectedText: string) => Promise<void>;
	busy: boolean;
	error: string | null;
	resolutionBusy: boolean;
	resolutionError: string | null;
	sessionId: string | null;
	resetSession: () => Promise<void>;
	resetBusy: boolean;
	sessionError: string | null;
};

function useLaboratory(): LaboratoryState {
	const [text, setTextValue] = useState(sampleText);
	const [result, setResult] = useState<SegmentationResponse | null>(null);
	const [resolution, setResolution] =
		useState<ClickResolutionResponse | null>(null);
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [resolutionBusy, setResolutionBusy] = useState(false);
	const [resolutionError, setResolutionError] = useState<string | null>(null);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [resetBusy, setResetBusy] = useState(false);
	const [sessionError, setSessionError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		void (async () => {
			try {
				const response = await fetch("/api/session");
				const payload =
					(await response.json()) as LaboratorySessionResponse & {
						error?: string;
					};
				if (!response.ok) {
					throw new Error(payload.error ?? "Could not load session.");
				}
				if (active) setSessionId(payload.sessionId);
			} catch (cause) {
				if (active) {
					setSessionError(
						cause instanceof Error
							? cause.message
							: "Could not load session.",
					);
				}
			}
		})();
		return () => {
			active = false;
		};
	}, []);

	const clearResults = useCallback(() => {
		setResult(null);
		setResolution(null);
		setActiveIndex(null);
		setError(null);
		setResolutionError(null);
	}, []);

	const resetSession = useCallback(async () => {
		setResetBusy(true);
		setSessionError(null);
		try {
			const response = await fetch("/api/session", { method: "POST" });
			const payload =
				(await response.json()) as LaboratorySessionResponse & {
					error?: string;
				};
			if (!response.ok) {
				throw new Error(payload.error ?? "Could not reset session.");
			}
			setSessionId(payload.sessionId);
			clearResults();
		} catch (cause) {
			setSessionError(
				cause instanceof Error
					? cause.message
					: "Could not reset session.",
			);
		} finally {
			setResetBusy(false);
		}
	}, [clearResults]);

	const segment = useCallback(async (selectedText: string) => {
		setBusy(true);
		setError(null);
		setResolution(null);
		setActiveIndex(null);
		setResolutionError(null);
		try {
			const response = await fetch("/api/segment", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ text: selectedText }),
			});
			const payload = (await response.json()) as SegmentationResponse & {
				error?: string;
			};
			if (!response.ok) {
				throw new Error(payload.error ?? "Segmentation failed.");
			}
			setResult(payload);
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "Segmentation failed.",
			);
		} finally {
			setBusy(false);
		}
	}, []);

	const selectSegment = useCallback(
		async (index: number) => {
			if (!result?.sentence || resolutionBusy) return;
			setActiveIndex(index);
			setResolutionBusy(true);
			setResolutionError(null);
			try {
				const response = await fetch("/api/resolve", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						segmentedSentenceId: result.sentence.id,
						clickedSegmentIndex: index,
					}),
				});
				const payload =
					(await response.json()) as ClickResolutionResponse & {
						error?: string;
					};
				if (!response.ok) {
					throw new Error(payload.error ?? "Resolution failed.");
				}
				setResolution(payload);
			} catch (cause) {
				setResolution(null);
				setResolutionError(
					cause instanceof Error
						? cause.message
						: "Resolution failed.",
				);
			} finally {
				setResolutionBusy(false);
			}
		},
		[result, resolutionBusy],
	);

	return {
		text,
		setText(value) {
			setTextValue(value);
			clearResults();
		},
		result,
		resolution,
		activeIndex,
		selectSegment,
		segment,
		busy,
		error,
		resolutionBusy,
		resolutionError,
		sessionId,
		resetSession,
		resetBusy,
		sessionError,
	};
}

function SourceEditor({ state }: { state: LaboratoryState }) {
	const [selection, setSelection] = useState({ start: 0, end: 0 });
	const selectedText = state.text.slice(selection.start, selection.end);
	const hasSelection = selectedText.trim().length > 0;

	function updateSelection(event: SyntheticEvent<HTMLTextAreaElement>) {
		setSelection({
			start: event.currentTarget.selectionStart,
			end: event.currentTarget.selectionEnd,
		});
	}

	function runSegmentation(event: KeyboardEvent<HTMLTextAreaElement>) {
		if (
			!event.metaKey ||
			!event.shiftKey ||
			event.ctrlKey ||
			event.altKey ||
			event.key.toLowerCase() !== "s"
		) {
			return;
		}

		event.preventDefault();
		const text = event.currentTarget.value.slice(
			event.currentTarget.selectionStart,
			event.currentTarget.selectionEnd,
		);
		if (event.repeat || text.trim().length === 0 || state.busy) return;
		void state.segment(text);
	}

	return (
		<section className="flex h-full min-h-0 flex-col gap-5 overflow-auto bg-muted/10 p-4 sm:p-6">
			<h2 className="sr-only">Source text</h2>

			<Field className="min-h-0 flex-1">
				<FieldLabel className="sr-only" htmlFor="laboratory-source">
					German source text
				</FieldLabel>
				<Textarea
					id="laboratory-source"
					value={state.text}
					onChange={(event) => {
						state.setText(event.currentTarget.value);
						updateSelection(event);
					}}
					onKeyDown={runSegmentation}
					onSelect={updateSelection}
					className="min-h-64 flex-1 resize-none p-4 sm:min-h-80"
					placeholder="Paste a German text, then select one sentence…"
					spellCheck="false"
				/>
			</Field>

			{state.error ? (
				<Alert variant="destructive">
					<CircleAlertIcon />
					<AlertTitle>Segmentation chain failed</AlertTitle>
					<AlertDescription>{state.error}</AlertDescription>
				</Alert>
			) : null}
			{state.sessionError ? (
				<Alert variant="destructive">
					<CircleAlertIcon />
					<AlertTitle>Session unavailable</AlertTitle>
					<AlertDescription>{state.sessionError}</AlertDescription>
				</Alert>
			) : null}

			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-sm text-muted-foreground" aria-live="polite">
					{hasSelection
						? `${state.text.length} characters · ${selectedText.length} selected for segmentation`
						: state.text.length > 0
							? `${state.text.length} characters · select one sentence to continue`
							: "Paste a source text to continue"}
				</p>
				<div className="flex flex-wrap items-center justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => void state.resetSession()}
						disabled={
							state.busy ||
							state.resolutionBusy ||
							state.resetBusy
						}
					>
						{state.resetBusy ? (
							<Spinner data-icon="inline-start" />
						) : (
							<RotateCcwIcon data-icon="inline-start" />
						)}
						{state.resetBusy ? "Resetting…" : "Reset session"}
					</Button>
					<div className="group relative">
						<Button
							type="button"
							onClick={() => void state.segment(selectedText)}
							disabled={!hasSelection || state.busy}
							aria-describedby="run-segmentation-shortcut"
							aria-keyshortcuts="Meta+Shift+S"
						>
							{state.busy ? (
								<Spinner data-icon="inline-start" />
							) : (
								<PlayIcon data-icon="inline-start" />
							)}
							{state.busy ? "Running…" : "Segment selection"}
						</Button>
						<div
							id="run-segmentation-shortcut"
							role="tooltip"
							className="pointer-events-none absolute right-0 bottom-full z-50 mb-2 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
						>
							Segment selected sentence
							<span className="ml-2 font-mono opacity-80">
								⌘⇧S
							</span>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

function PipelineStage({
	name,
	stage,
	status,
}: {
	name: string;
	stage?: SegmentationStageResult;
	status: "waiting" | "complete" | "skipped";
}) {
	return (
		<div
			className={cn(
				"flex min-w-0 flex-1 items-center gap-3 rounded-lg border p-3",
				status === "complete" && "border-primary/25 bg-primary/5",
				status !== "complete" && "bg-muted/30",
			)}
		>
			<div
				className={cn(
					"flex size-7 shrink-0 items-center justify-center rounded-full border",
					status === "complete" &&
						"border-primary/30 bg-primary/10 text-primary",
				)}
			>
				{status === "complete" ? (
					<CheckIcon className="size-3.5" />
				) : (
					<CircleDotIcon className="size-3.5 text-muted-foreground" />
				)}
			</div>
			<div className="min-w-0">
				<p className="text-xs font-semibold">{name}</p>
				<p className="truncate font-mono text-[11px] text-muted-foreground">
					{stage?.prompt ??
						(status === "skipped" ? "Not dispatched" : "Waiting")}
				</p>
			</div>
		</div>
	);
}

function Segments({ state }: { state: LaboratoryState }) {
	const sentence = state.result?.sentence;
	const segments = sentence?.segments ?? [];
	const target = state.resolution?.target;
	const resolved =
		state.resolution?.decision === "Resolved" ? state.resolution : null;
	const orthographies = resolved
		? orthographiesBySegmentIndex(resolved)
		: undefined;
	const targetMembers = new Set(target?.memberSegmentIndices ?? []);
	const intake = state.result?.stages.intake;
	const segmentation = state.result?.stages.segmentation;

	return (
		<section className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
			<h2 className="sr-only">Intake &amp; segmentation</h2>
			<div className="flex justify-end">
				<Badge variant={segments.length > 0 ? "secondary" : "outline"}>
					{state.result?.decision ?? "Waiting"}
				</Badge>
			</div>

			<div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
				<PipelineStage
					name="1. Intake"
					stage={intake}
					status={intake ? "complete" : "waiting"}
				/>
				<RouteIcon className="mx-auto hidden size-4 text-muted-foreground sm:block" />
				<PipelineStage
					name={`2. Segmentation<${sentence?.language ?? "de|he"}>`}
					stage={segmentation}
					status={
						segmentation
							? "complete"
							: state.result &&
									state.result.decision !== "Accepted"
								? "skipped"
								: "waiting"
					}
				/>
			</div>
			{intake ? (
				<details className="rounded-lg border bg-muted/10">
					<summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
						Inspect Intake and Segmentation stage results
					</summary>
					<div className="flex flex-col gap-5 border-t p-3">
						<StageTrace stage={intake} />
						{segmentation ? (
							<StageTrace stage={segmentation} />
						) : null}
					</div>
				</details>
			) : null}

			<div
				className="flex min-h-32 flex-wrap content-center items-center gap-2 rounded-lg border bg-muted/20 p-3"
				dir={sentence?.language === "he" ? "rtl" : "ltr"}
			>
				{state.result && state.result.decision !== "Accepted" ? (
					<Empty className="min-h-24 gap-2 p-2">
						<EmptyHeader className="gap-1">
							<EmptyMedia variant="icon">
								<CircleAlertIcon />
							</EmptyMedia>
							<EmptyTitle>Sentence not accepted</EmptyTitle>
							<EmptyDescription>
								Intake returned {state.result.decision}; Source
								Segmentation was not run.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : segments.length === 0 ? (
					<Empty className="min-h-24 gap-2 p-2">
						<EmptyHeader className="gap-1">
							<EmptyMedia variant="icon">
								<ScissorsIcon />
							</EmptyMedia>
							<EmptyTitle>No segmented sentence yet</EmptyTitle>
						</EmptyHeader>
					</Empty>
				) : (
					segments.map((segment, index) => (
						<SegmentToken
							key={`${index}-${segment.text}`}
							segment={segment}
							index={index}
							active={state.activeIndex === index}
							targetMember={targetMembers.has(index)}
							orthography={orthographies?.[index]}
							busy={state.resolutionBusy}
							resolutionEnabled={sentence?.language === "de"}
							onClick={() => void state.selectSegment(index)}
						/>
					))
				)}
			</div>
		</section>
	);
}

function SegmentToken({
	segment,
	index,
	active,
	targetMember,
	orthography,
	busy,
	resolutionEnabled,
	onClick,
}: {
	segment: Segment;
	index: number;
	active: boolean;
	targetMember: boolean;
	orthography?: MemberOrthography;
	busy: boolean;
	resolutionEnabled: boolean;
	onClick: () => void;
}) {
	if (segment.kind === "Whitespace") {
		return (
			<span
				className="px-1 font-mono text-muted-foreground"
				title={`#${index} Whitespace`}
			>
				·
			</span>
		);
	}

	const clickable = segment.kind === "ResolvableText" && resolutionEnabled;
	return (
		<Button
			type="button"
			variant={active ? "default" : "outline"}
			size="sm"
			className={cn(
				"relative h-auto min-h-10",
				clickable && "hover:-translate-y-0.5",
				targetMember &&
					!active &&
					"border-primary/60 bg-primary/10 ring-2 ring-primary/20",
				orthography === "Typo" && "border-amber-500/70",
			)}
			disabled={!clickable || busy}
			onClick={onClick}
			aria-pressed={active}
			title={`#${index} ${segment.kind}${!resolutionEnabled && segment.kind === "ResolvableText" ? " · Hebrew Click Resolution deferred" : ""}${targetMember ? " · Analysis Target member" : ""}${orthography ? ` · ${orthography}` : ""}`}
		>
			<span className="text-xs opacity-60">{index}</span>
			{segment.text}
			{targetMember ? (
				<span
					className="size-1.5 rounded-full bg-current opacity-60"
					aria-hidden="true"
				/>
			) : null}
			{orthography === "Typo" ? (
				<span className="absolute -top-2 -right-1 rounded-full border border-amber-500/40 bg-background px-1 text-[9px] font-semibold text-amber-700 dark:text-amber-300">
					Typo
				</span>
			) : null}
		</Button>
	);
}

function ResolutionInspector({ state }: { state: LaboratoryState }) {
	const { resolution } = state;
	const diagnostics = resolution?.diagnostics ?? [];
	const resolved = resolution?.decision === "Resolved" ? resolution : null;
	const entity = resolved?.entity ?? null;
	const target = resolution?.target;

	return (
		<section className="flex h-full min-h-0 flex-col gap-4 overflow-auto bg-muted/10 p-4 sm:p-6">
			<h2 className="sr-only">Resolution stages</h2>

			{state.resolutionBusy ? (
				<Empty className="min-h-48 flex-1 p-4">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Spinner />
						</EmptyMedia>
						<EmptyTitle>Resolving click</EmptyTitle>
						<EmptyDescription>
							Checking the member cache, then running only the
							necessary stages.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : state.resolutionError ? (
				<Alert variant="destructive">
					<CircleAlertIcon />
					<AlertTitle>Resolution request failed</AlertTitle>
					<AlertDescription>{state.resolutionError}</AlertDescription>
				</Alert>
			) : resolution ? (
				<Tabs
					key={`${state.activeIndex}-${resolution.decision}`}
					defaultValue={
						resolution.decision !== "Resolved"
							? "diagnostics"
							: "target"
					}
					className="min-h-0 flex-1"
				>
					<TabsList
						variant="line"
						className="grid w-full grid-cols-4"
						aria-label="Classification stage results"
					>
						<TabsTrigger value="target">Target</TabsTrigger>
						<TabsTrigger value="grammatical">
							Grammatical
						</TabsTrigger>
						<TabsTrigger value="reading">Reading</TabsTrigger>
						<TabsTrigger value="diagnostics">
							Diagnostics
							{diagnostics.length > 0 ? (
								<Badge
									variant={
										resolution.decision === "NotImplemented"
											? "outline"
											: "destructive"
									}
								>
									{diagnostics.length}
								</Badge>
							) : null}
						</TabsTrigger>
					</TabsList>
					<div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-muted/20 p-4">
						<TabsContent value="target">
							<StagePanel
								label="Analysis Target"
								value={target}
								stage={resolution.stages.target}
								empty="Target Classification returned Unresolved."
							/>
						</TabsContent>
						<TabsContent value="grammatical">
							<StagePanel
								label="Attestation + Surface + Lemma"
								value={
									resolved
										? {
												attestation:
													resolved.entity.attestation,
												interaction:
													resolved.interaction,
											}
										: undefined
								}
								stage={resolution.stages.grammatical}
								empty={
									resolution.decision === "NotImplemented"
										? resolution.stage ===
											"GrammaticalResolution"
											? `${resolution.stage} is not enabled for de/${resolution.family}/${resolution.kind}.`
											: "Reading Resolution is not enabled, so the complete canonical result was not constructed."
										: "Grammatical Resolution returned Unresolved."
								}
							/>
						</TabsContent>
						<TabsContent value="reading">
							<StagePanel
								label="Learner Reading"
								value={entity?.reading}
								stage={resolution.stages.reading}
								empty="Reading Resolution was not reached."
							/>
						</TabsContent>
						<TabsContent value="diagnostics">
							<Diagnostics diagnostics={diagnostics} />
						</TabsContent>
					</div>
				</Tabs>
			) : (
				<Empty className="min-h-48 flex-1 p-4">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<MousePointerClickIcon />
						</EmptyMedia>
						<EmptyTitle>No segment selected</EmptyTitle>
						<EmptyDescription>
							Choose ResolvableText above to inspect Target,
							Grammatical, and Reading outputs.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}
		</section>
	);
}

function StagePanel({
	label,
	value,
	stage,
	empty,
}: {
	label: string;
	value: unknown;
	stage?: ClassificationStageResult;
	empty: string;
}) {
	return (
		<div className="flex flex-col gap-5">
			<h3 className="sr-only">{label}</h3>
			{value === undefined ? (
				<Alert variant="destructive">
					<CircleAlertIcon />
					<AlertTitle>No canonical result</AlertTitle>
					<AlertDescription>{empty}</AlertDescription>
				</Alert>
			) : (
				<JsonCard title="Canonical application result" value={value} />
			)}
			{stage ? <StageTrace stage={stage} /> : null}
		</div>
	);
}

function StageTrace({
	stage,
}: {
	stage: ClassificationStageResult | SegmentationStageResult;
}) {
	return (
		<section
			className="grid gap-3 border-t pt-4 xl:grid-cols-2"
			aria-label={`Laboratory trace for ${stage.prompt}`}
		>
			<JsonCard title="Minimal prompt input" value={stage.input} />
			<JsonCard title="Validated model output" value={stage.output} />
		</section>
	);
}

function JsonCard({ title, value }: { title: string; value: unknown }) {
	return (
		<section
			className="min-w-0 rounded-lg border bg-background/70"
			aria-label={title}
		>
			<pre className="max-h-80 overflow-auto p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
				{JSON.stringify(value, null, 2)}
			</pre>
		</section>
	);
}

function Diagnostics({
	diagnostics,
}: {
	diagnostics: ClickResolutionResponse["diagnostics"];
}) {
	if (diagnostics.length === 0) {
		return (
			<Empty className="min-h-40 p-4">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<CheckIcon />
					</EmptyMedia>
					<EmptyTitle>No diagnostics</EmptyTitle>
					<EmptyDescription>
						Every reached stage produced a consistent result.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{diagnostics.map((diagnostic, index) => (
				<Alert
					variant={
						diagnostic.kind === "ResolutionRouteNotImplemented"
							? "default"
							: "destructive"
					}
					key={`${diagnostic.stage}-${diagnostic.kind}-${index}`}
				>
					<CircleAlertIcon />
					<AlertTitle>
						{diagnostic.stage} · {diagnostic.kind}
					</AlertTitle>
					<AlertDescription>{diagnostic.message}</AlertDescription>
				</Alert>
			))}
			<p className="text-xs text-muted-foreground">
				Unresolved is a prompt-quality failure;
				ResolutionRouteNotImplemented is an intentional incremental
				rollout boundary.
			</p>
		</div>
	);
}

function DesktopWorkbench({
	state,
	mainLayoutKey,
	resultsLayoutKey,
}: {
	state: LaboratoryState;
	mainLayoutKey: string;
	resultsLayoutKey: string;
}) {
	return (
		<ResizablePanelGroup
			className="min-h-0"
			defaultLayout={loadLayout(mainLayoutKey, {
				"laboratory-results": 0.58,
				"laboratory-source": 0.42,
			})}
			id="laboratory-main-layout-horizontal"
			onLayoutChanged={(layout, meta) =>
				saveLayout(mainLayoutKey, layout, meta)
			}
			orientation="horizontal"
		>
			<ResizablePanel
				defaultSize="58%"
				id="laboratory-results"
				minSize="34%"
			>
				<ResizablePanelGroup
					className="min-h-0"
					defaultLayout={loadLayout(resultsLayoutKey, {
						"laboratory-segments": 0.43,
						"laboratory-resolution": 0.57,
					})}
					id="laboratory-results-layout"
					onLayoutChanged={(layout, meta) =>
						saveLayout(resultsLayoutKey, layout, meta)
					}
					orientation="vertical"
				>
					<ResizablePanel
						defaultSize="43%"
						id="laboratory-segments"
						minSize="25%"
					>
						<Segments state={state} />
					</ResizablePanel>
					<ResizableHandle withHandle />
					<ResizablePanel
						defaultSize="57%"
						id="laboratory-resolution"
						minSize="25%"
					>
						<ResolutionInspector state={state} />
					</ResizablePanel>
				</ResizablePanelGroup>
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel
				defaultSize="42%"
				id="laboratory-source"
				minSize="28%"
			>
				<SourceEditor state={state} />
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}

function Laboratory({ state }: { state: LaboratoryState }) {
	const [orientation, setOrientation] = useState<"horizontal" | "vertical">(
		"horizontal",
	);

	useEffect(() => {
		const mediaQuery = window.matchMedia("(max-width: 900px)");
		const updateOrientation = () =>
			setOrientation(mediaQuery.matches ? "vertical" : "horizontal");

		updateOrientation();
		mediaQuery.addEventListener("change", updateOrientation);
		return () =>
			mediaQuery.removeEventListener("change", updateOrientation);
	}, []);

	const outerLayoutKey = `${layoutStoragePrefix}.outer`;
	const mainLayoutKey = `${layoutStoragePrefix}.main.horizontal`;
	const resultsLayoutKey = `${layoutStoragePrefix}.results`;

	return (
		<main
			className={cn(
				"min-h-svh bg-background p-3 text-foreground sm:p-5 lg:p-6",
				orientation === "horizontal" && "h-svh min-h-[44rem]",
			)}
		>
			{orientation === "vertical" ? (
				<div className="mx-auto w-full overflow-hidden rounded-xl border bg-card shadow-sm">
					<div className="flex flex-col">
						<SourceEditor state={state} />
						<Separator />
						<Segments state={state} />
						<Separator />
						<ResolutionInspector state={state} />
					</div>
				</div>
			) : (
				<ResizablePanelGroup
					className="mx-auto min-h-0 w-full max-w-[1800px]"
					defaultLayout={loadLayout(outerLayoutKey, {
						"laboratory-left-gutter": 0.04,
						"laboratory-workbench": 0.96,
					})}
					id="laboratory-outer-layout"
					onLayoutChanged={(layout, meta) =>
						saveLayout(outerLayoutKey, layout, meta)
					}
					orientation="horizontal"
				>
					<ResizablePanel
						defaultSize="4%"
						id="laboratory-left-gutter"
						maxSize="35%"
						minSize="0%"
					>
						<div className="h-full" />
					</ResizablePanel>
					<ResizableHandle withHandle />
					<ResizablePanel
						defaultSize="96%"
						id="laboratory-workbench"
						minSize="65%"
					>
						<div className="h-full overflow-hidden rounded-xl border bg-card shadow-sm">
							<DesktopWorkbench
								state={state}
								mainLayoutKey={mainLayoutKey}
								resultsLayoutKey={resultsLayoutKey}
							/>
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			)}
		</main>
	);
}

export function App() {
	const state = useLaboratory();
	return <Laboratory state={state} />;
}
