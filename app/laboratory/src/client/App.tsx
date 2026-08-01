import {
	CircleAlertIcon,
	FlaskConicalIcon,
	MousePointerClickIcon,
	RotateCcwIcon,
	ScissorsIcon,
} from "lucide-react";
import {
	Fragment,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
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
	ClickResolutionResponse,
	EntityRepresentation,
	LaboratorySessionResponse,
	Segment,
	SegmentationResponse,
} from "../shared/contract";

const sampleText = "Der Hund läuft schnell. Der Kaffee ist heiß.";
const layoutStoragePrefix = "texteater.laboratory.layout";

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
	selection: { start: number; end: number };
	setSelection: (selection: { start: number; end: number }) => void;
	result: SegmentationResponse | null;
	activeIndex: number | null;
	entity: EntityRepresentation | null;
	selectSegment: (index: number) => Promise<void>;
	segment: () => Promise<void>;
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
	const [text, setText] = useState(sampleText);
	const [selection, setSelection] = useState({
		start: 0,
		end: sampleText.length,
	});
	const [result, setResult] = useState<SegmentationResponse | null>(null);
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const [entity, setEntity] = useState<EntityRepresentation | null>(null);
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
			setResult(null);
			setActiveIndex(null);
			setEntity(null);
			setError(null);
			setResolutionError(null);
		} catch (cause) {
			setSessionError(
				cause instanceof Error
					? cause.message
					: "Could not reset session.",
			);
		} finally {
			setResetBusy(false);
		}
	}, []);

	const segment = useCallback(async () => {
		setBusy(true);
		setError(null);
		setEntity(null);
		setActiveIndex(null);
		setResolutionError(null);
		try {
			const response = await fetch("/api/segment", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ text, selection }),
			});
			const payload = (await response.json()) as SegmentationResponse & {
				error?: string;
			};
			if (!response.ok)
				throw new Error(payload.error ?? "Segmentation failed.");
			setResult(payload);
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "Segmentation failed.",
			);
		} finally {
			setBusy(false);
		}
	}, [selection, text]);

	const selectSegment = useCallback(
		async (index: number) => {
			if (!result?.sentence) return;
			setActiveIndex(index);
			setEntity(null);
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
				if (!response.ok)
					throw new Error(payload.error ?? "Resolution failed.");
				setEntity(payload.entity);
			} catch (cause) {
				setResolutionError(
					cause instanceof Error
						? cause.message
						: "Resolution failed.",
				);
			} finally {
				setResolutionBusy(false);
			}
		},
		[result],
	);

	return {
		text,
		setText(value) {
			setText(value);
			setSelection({ start: 0, end: 0 });
		},
		selection,
		setSelection,
		result,
		activeIndex,
		entity,
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
	const ref = useRef<HTMLTextAreaElement>(null);
	useEffect(() => {
		ref.current?.setSelectionRange(
			state.selection.start,
			state.selection.end,
		);
	}, [state.selection.end, state.selection.start]);
	const selectedCount = state.selection.end - state.selection.start;
	return (
		<section className="flex h-full min-h-0 flex-col gap-5 overflow-auto p-4 sm:p-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						<p className="text-xs font-medium text-muted-foreground">
							Input
						</p>
						<Badge variant="secondary">German only</Badge>
					</div>
					<h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
						Source text
					</h2>
					<p className="max-w-md text-sm text-muted-foreground">
						Select the passage you want Dumgen to segment.
					</p>
				</div>
				<div className="flex flex-wrap items-center justify-end gap-2">
					<Badge variant="outline">
						{state.sessionId
							? `Session ${state.sessionId.slice(0, 8)}`
							: "Loading session"}
					</Badge>
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
				</div>
			</div>

			<Field className="min-h-0 flex-1">
				<FieldLabel className="sr-only" htmlFor="laboratory-source">
					German source text
				</FieldLabel>
				<Textarea
					id="laboratory-source"
					ref={ref}
					value={state.text}
					onChange={(event) => state.setText(event.target.value)}
					onSelect={(event) => {
						const target = event.currentTarget;
						state.setSelection({
							start: target.selectionStart,
							end: target.selectionEnd,
						});
					}}
					className="min-h-64 flex-1 resize-none p-4 sm:min-h-80"
					spellCheck="false"
				/>
			</Field>

			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-sm text-muted-foreground" aria-live="polite">
					{selectedCount > 0
						? `${selectedCount} characters selected`
						: "Select text to continue"}
				</p>
				<Button
					type="button"
					onClick={state.segment}
					disabled={selectedCount === 0 || state.busy}
				>
					{state.busy ? (
						<Spinner data-icon="inline-start" />
					) : (
						<ScissorsIcon data-icon="inline-start" />
					)}
					{state.busy ? "Segmenting…" : "Segment selection"}
				</Button>
			</div>

			{state.error ? (
				<Alert variant="destructive">
					<CircleAlertIcon />
					<AlertTitle>Segmentation failed</AlertTitle>
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
		</section>
	);
}

function Segments({ state }: { state: LaboratoryState }) {
	const segments = state.result?.sentence?.segments ?? [];
	return (
		<section className="flex h-full min-h-0 flex-col gap-3 overflow-auto p-4">
			<div className="flex items-end justify-between gap-4">
				<div className="flex flex-col gap-1">
					<p className="text-xs font-medium text-muted-foreground">
						Output
					</p>
					<h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
						Segments
					</h2>
				</div>
				<Badge variant={segments.length > 0 ? "secondary" : "outline"}>
					{segments.length > 0
						? `${segments.length} indexed`
						: "Waiting"}
				</Badge>
			</div>
			<div className="flex min-h-32 flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-3">
				{state.result && state.result.decision !== "Accepted" ? (
					<Empty className="min-h-24 gap-2 p-2">
						<EmptyHeader className="gap-1">
							<EmptyMedia variant="icon">
								<CircleAlertIcon />
							</EmptyMedia>
							<EmptyTitle>Selection not accepted</EmptyTitle>
							<EmptyDescription>
								Dumgen returned {state.result.decision}.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : segments.length === 0 ? (
					<Empty className="min-h-24 gap-2 p-2">
						<EmptyHeader className="gap-1">
							<EmptyMedia variant="icon">
								<ScissorsIcon />
							</EmptyMedia>
							<EmptyTitle>No segments yet</EmptyTitle>
							<EmptyDescription>
								Select source text and run the segmenter.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					segments.map((segment) => (
						<SegmentToken
							key={`${segment.index}-${segment.text}`}
							segment={segment}
							active={state.activeIndex === segment.index}
							onClick={() =>
								void state.selectSegment(segment.index)
							}
						/>
					))
				)}
			</div>
			{state.result?.sentence ? (
				<p className="text-xs text-muted-foreground">
					Sentence {state.result.sentence.id.slice(0, 8)} · gpt-5-nano
					· local indices shown
				</p>
			) : null}
		</section>
	);
}

function SegmentToken({
	segment,
	active,
	onClick,
}: {
	segment: Segment;
	active: boolean;
	onClick: () => void;
}) {
	if (segment.kind === "Whitespace") {
		return (
			<span
				className="px-1 font-mono text-muted-foreground"
				title={`#${segment.index} Whitespace`}
			>
				·
			</span>
		);
	}
	const clickable = segment.kind === "ResolvableText";
	return (
		<Button
			type="button"
			variant={active ? "default" : "outline"}
			size="sm"
			className={cn(
				"h-auto min-h-10",
				clickable && "hover:-translate-y-0.5",
			)}
			disabled={!clickable}
			onClick={onClick}
			title={`#${segment.index} ${segment.kind}`}
		>
			<span className="text-xs opacity-60">{segment.index}</span>
			{segment.text}
		</Button>
	);
}

function EntityTabs({ state }: { state: LaboratoryState }) {
	const { entity } = state;
	return (
		<section className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4 sm:p-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex flex-col gap-1">
					<p className="text-xs font-medium text-muted-foreground">
						Selected segment
					</p>
					<h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
						Entity representation
					</h2>
				</div>
				{entity ? (
					<Badge variant="secondary">Dumgen · {entity.model}</Badge>
				) : null}
			</div>
			<Tabs defaultValue="reading" className="min-h-0 flex-1">
				<TabsList
					variant="line"
					className="grid w-full grid-cols-3"
					aria-label="Entity representation"
				>
					<TabsTrigger value="reading">Reading</TabsTrigger>
					<TabsTrigger value="surface">Surface</TabsTrigger>
					<TabsTrigger value="selection">Selection</TabsTrigger>
				</TabsList>
				<div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-muted/20 p-4">
					{state.resolutionBusy ? (
						<Empty className="min-h-48 p-4">
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<Spinner />
								</EmptyMedia>
								<EmptyTitle>Resolving segment</EmptyTitle>
								<EmptyDescription>
									Dumgen is running the German classification
									chain.
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : state.resolutionError ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>Resolution failed</AlertTitle>
							<AlertDescription>
								{state.resolutionError}
							</AlertDescription>
						</Alert>
					) : entity ? (
						<>
							<TabsContent value="reading">
								<EntityDetails
									label="reading"
									value={entity.reading}
								/>
							</TabsContent>
							<TabsContent value="surface">
								<EntityDetails
									label="surface"
									value={entity.surface}
								/>
							</TabsContent>
							<TabsContent value="selection">
								<EntityDetails
									label="selection"
									value={entity.selection}
								/>
							</TabsContent>
						</>
					) : (
						<Empty className="min-h-48 p-4">
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<MousePointerClickIcon />
								</EmptyMedia>
								<EmptyTitle>No segment selected</EmptyTitle>
								<EmptyDescription>
									Choose a resolvable segment above to inspect
									it.
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					)}
				</div>
			</Tabs>
		</section>
	);
}

function EntityDetails({ label, value }: { label: string; value: unknown }) {
	return (
		<div className="flex flex-col gap-3">
			<p className="font-mono text-xs text-primary">entity.{label}</p>
			<ObjectRows value={value as Record<string, unknown>} />
		</div>
	);
}

function ObjectRows({
	value,
	depth = 0,
}: {
	value: Record<string, unknown>;
	depth?: number;
}) {
	const entries = Object.entries(value);
	return (
		<dl className={cn("flex flex-col", depth > 0 && "pl-3")}>
			{entries.map(([key, item], index) => {
				const isObject =
					item !== null &&
					typeof item === "object" &&
					!Array.isArray(item);
				return (
					<Fragment key={key}>
						<div className="grid gap-2 py-3 sm:grid-cols-[minmax(7rem,0.65fr)_minmax(0,1.35fr)] sm:gap-4">
							<dt className="font-mono text-xs text-muted-foreground">
								{key}
							</dt>
							<dd className="min-w-0 [overflow-wrap:anywhere] text-sm">
								{isObject ? (
									<ObjectRows
										value={item as Record<string, unknown>}
										depth={depth + 1}
									/>
								) : (
									formatValue(item)
								)}
							</dd>
						</div>
						{index < entries.length - 1 ? <Separator /> : null}
					</Fragment>
				);
			})}
		</dl>
	);
}

function formatValue(value: unknown): ReactNode {
	if (Array.isArray(value)) return value.join(", ");
	if (typeof value === "boolean") return value ? "true" : "false";
	return String(value);
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

	const mainLayoutKey = `${layoutStoragePrefix}.main.${orientation}`;
	const resultsLayoutKey = `${layoutStoragePrefix}.results`;

	return (
		<main className="flex h-svh min-h-[44rem] flex-col bg-background p-3 text-foreground sm:p-5 lg:p-6">
			<header className="mx-auto flex w-full max-w-[1800px] flex-wrap items-center justify-between gap-4 pb-4">
				<div className="flex items-center gap-3">
					<div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
						<FlaskConicalIcon className="size-5" />
					</div>
					<div>
						<h1 className="text-lg font-semibold tracking-tight">
							Dumgen Laboratory
						</h1>
						<p className="text-sm text-muted-foreground">
							Inspect segmentation and entity resolution
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant="outline">Developer tool</Badge>
					<Badge variant="secondary">Dark mode</Badge>
				</div>
			</header>

			<div className="mx-auto min-h-0 w-full max-w-[1800px] flex-1 overflow-hidden rounded-xl border bg-card shadow-sm">
				<ResizablePanelGroup
					key={orientation}
					className="min-h-0"
					defaultLayout={loadLayout(mainLayoutKey, {
						"laboratory-results": 0.55,
						"laboratory-source": 0.45,
					})}
					id={`laboratory-main-layout-${orientation}`}
					onLayoutChanged={(layout, meta) =>
						saveLayout(mainLayoutKey, layout, meta)
					}
					orientation={orientation}
				>
					<ResizablePanel
						defaultSize="55%"
						id="laboratory-results"
						minSize="30%"
					>
						<ResizablePanelGroup
							className="min-h-0"
							defaultLayout={loadLayout(resultsLayoutKey, {
								"laboratory-segments": 0.38,
								"laboratory-entity": 0.62,
							})}
							id="laboratory-results-layout"
							onLayoutChanged={(layout, meta) =>
								saveLayout(resultsLayoutKey, layout, meta)
							}
							orientation="vertical"
						>
							<ResizablePanel
								defaultSize="38%"
								id="laboratory-segments"
								minSize="20%"
							>
								<Segments state={state} />
							</ResizablePanel>
							<ResizableHandle withHandle />
							<ResizablePanel
								defaultSize="62%"
								id="laboratory-entity"
								minSize="25%"
							>
								<EntityTabs state={state} />
							</ResizablePanel>
						</ResizablePanelGroup>
					</ResizablePanel>
					<ResizableHandle withHandle />
					<ResizablePanel
						defaultSize="45%"
						id="laboratory-source"
						minSize="30%"
					>
						<SourceEditor state={state} />
					</ResizablePanel>
				</ResizablePanelGroup>
			</div>
		</main>
	);
}

export function App() {
	const state = useLaboratory();
	return <Laboratory state={state} />;
}
