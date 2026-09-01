import { useEffect, useState } from "react";

import "./segment-text-playground.css";

type Unit = {
	readonly id: string;
	readonly label: string;
	readonly reading: string;
	readonly memberCount: number;
};

type SelectedUnit = {
	readonly unitId: string;
	readonly segmentId: string;
};

type InteractionTarget = {
	readonly unitId: string;
	readonly segmentId: string;
};

type ResolutionModel = "pre-resolved" | "on-demand";

type SegmentDisplayState =
	| "unknown-preview"
	| "resolving"
	| "known-preview"
	| "selected"
	| "retained";

type TextPart =
	| {
			readonly kind: "segment";
			readonly id: string;
			readonly text: string;
			readonly unitId: string;
	  }
	| {
			readonly kind: "space";
			readonly id: string;
			readonly text: string;
			readonly bridgeUnitId?: string;
	  };

type TokenSpec = string | readonly [text: string, unitId: string];

type PassageBlock =
	| {
			readonly id: string;
			readonly kind: "quote" | "aside";
			readonly parts: readonly TextPart[];
	  }
	| {
			readonly id: string;
			readonly kind: "dialogue";
			readonly speaker: "Anna" | "Sascha";
			readonly parts: readonly TextPart[];
	  };

const UNITS: readonly Unit[] = [
	{
		id: "seven-years-quote",
		label: "Temporal phrase",
		reading: "vor sieben Jahren",
		memberCount: 3,
	},
	{
		id: "seven-years-correction",
		label: "Temporal phrase",
		reading: "vor sieben Jahren",
		memberCount: 3,
	},
	{
		id: "remember",
		label: "Reflexive verb",
		reading: "sich erinnern",
		memberCount: 2,
	},
	{
		id: "from-america",
		label: "Prepositional phrase",
		reading: "aus Amerika",
		memberCount: 2,
	},
	{
		id: "look-up",
		label: "Separable verb",
		reading: "heraussuchen",
		memberCount: 2,
	},
	{
		id: "call",
		label: "Separable verb",
		reading: "anrufen",
		memberCount: 2,
	},
	{
		id: "write-back",
		label: "Separable verb",
		reading: "zurückschreiben",
		memberCount: 2,
	},
	{
		id: "invite",
		label: "Separable verb",
		reading: "einladen",
		memberCount: 2,
	},
	{
		id: "come-by",
		label: "Separable verb",
		reading: "vorbeikommen",
		memberCount: 2,
	},
] as const;

const PASSAGE: readonly PassageBlock[] = [
	{
		id: "opening",
		kind: "quote",
		parts: tokenize("opening", [
			"„Sascha",
			"Maus,",
			"dieser",
			"Brief",
			"ist",
			"für",
			"dich.",
			"Hast",
			"du",
			"immer",
			"noch",
			"so",
			"viele",
			"Pickel?",
			"Deine",
			"Mama.“",
		]),
	},
	{
		id: "america",
		kind: "dialogue",
		speaker: "Sascha",
		parts: tokenize("america", [
			"Danke.",
			"Der",
			"hier",
			"ist",
			["aus", "from-america"],
			["Amerika.", "from-america"],
		]),
	},
	{
		id: "ask-who",
		kind: "dialogue",
		speaker: "Anna",
		parts: tokenize("ask-who", [
			"Aus",
			"Amerika?",
			"Von",
			"wem",
			"denn?",
			"Na",
			"sag",
			"schon",
			"…",
		]),
	},
	{
		id: "old-letter",
		kind: "dialogue",
		speaker: "Sascha",
		parts: tokenize("old-letter", [
			"Mmh",
			"…",
			"„Hallo!",
			"Kennst",
			"du",
			"mich",
			"noch?“",
			"Nein",
			"…",
			["„vor", "seven-years-quote"],
			["sieben", "seven-years-quote"],
			["Jahren", "seven-years-quote"],
			"Brieffreunde",
			"sind",
			"wir",
			"…“",
		]),
	},
	{
		id: "correction",
		kind: "aside",
		parts: tokenize("correction", [
			["Vor", "seven-years-correction"],
			["sieben", "seven-years-correction"],
			["Jahren", "seven-years-correction"],
			"waren",
			"wir",
			"Brieffreunde.",
		]),
	},
	{
		id: "remember-line",
		kind: "quote",
		parts: tokenize("remember-line", [
			"Ach",
			"du",
			"liebe",
			"Zeit!",
			"…",
			"Jetzt",
			["erinnere", "remember"],
			"ich",
			["mich", "remember"],
			"wieder.",
			"Der",
			"Brief",
			"ist",
			"von",
			"Sam!",
			"Sam",
			"Scott!",
		]),
	},
	{
		id: "ask-now",
		kind: "dialogue",
		speaker: "Anna",
		parts: tokenize("ask-now", ["Und", "was", "machst", "du", "jetzt?"]),
	},
	{
		id: "find-address",
		kind: "dialogue",
		speaker: "Sascha",
		parts: tokenize("find-address", [
			"Zuerst",
			["suche", "look-up"],
			"ich",
			"seine",
			"Adresse",
			["heraus.", "look-up"],
		]),
	},
	{
		id: "call-and-write",
		kind: "dialogue",
		speaker: "Sascha",
		parts: tokenize("call-and-write", [
			"Danach",
			["rufe", "call"],
			"ich",
			"Sam",
			["an", "call"],
			"und",
			["schreibe", "write-back"],
			"ihm",
			"gleich",
			["zurück.", "write-back"],
		]),
	},
	{
		id: "invitation",
		kind: "dialogue",
		speaker: "Anna",
		parts: tokenize("invitation", [
			"Vielleicht",
			["lädt", "invite"],
			"er",
			"dich",
			"nach",
			"Amerika",
			["ein.", "invite"],
		]),
	},
	{
		id: "visit",
		kind: "dialogue",
		speaker: "Sascha",
		parts: tokenize("visit", [
			"Oder",
			"Sam",
			["kommt", "come-by"],
			"nächstes",
			"Jahr",
			["vorbei.", "come-by"],
		]),
	},
] as const;

export function SegmentTextPlayground() {
	return (
		<div className="segment-study">
			<header className="segment-study__toolbar">
				<div className="segment-study__title">
					<span>Resolution models</span>
					<strong>What does the text know before a click?</strong>
				</div>
				<p className="segment-study__legend">
					<span aria-hidden="true" data-legend="unknown" />
					Unknown destination
					<i aria-hidden="true" />
					<span aria-hidden="true" data-legend="known" />
					Known unit
				</p>
			</header>

			<div className="segment-study__models">
				<ResolutionSpecimen model="pre-resolved" />
				<ResolutionSpecimen model="on-demand" />
			</div>
		</div>
	);
}

function ResolutionSpecimen({ model }: { readonly model: ResolutionModel }) {
	const [hoveredTarget, setHoveredTarget] =
		useState<InteractionTarget | null>(null);
	const [focusedTarget, setFocusedTarget] =
		useState<InteractionTarget | null>(null);
	const [selectedUnits, setSelectedUnits] = useState<readonly SelectedUnit[]>(
		[],
	);
	const [revealedUnitIds, setRevealedUnitIds] = useState<ReadonlySet<string>>(
		new Set(),
	);
	const [resolvingTarget, setResolvingTarget] =
		useState<InteractionTarget | null>(null);
	const previewTarget = hoveredTarget ?? focusedTarget;
	const currentSelection = selectedUnits.at(-1) ?? null;
	const isResolving = resolvingTarget !== null;

	useEffect(() => {
		if (!resolvingTarget) return;
		const timeout = window.setTimeout(() => {
			setRevealedUnitIds(
				(current) => new Set([...current, resolvingTarget.unitId]),
			);
			setSelectedUnits((current) =>
				retainSelection(current, resolvingTarget),
			);
			setResolvingTarget(null);
		}, 800);
		return () => window.clearTimeout(timeout);
	}, [resolvingTarget]);

	function unitIsKnown(unitId: string): boolean {
		return model === "pre-resolved" || revealedUnitIds.has(unitId);
	}

	function selectTarget(target: InteractionTarget) {
		if (resolvingTarget) return;
		setHoveredTarget(null);
		setFocusedTarget(null);
		if (unitIsKnown(target.unitId)) {
			setSelectedUnits((current) => retainSelection(current, target));
			return;
		}
		setResolvingTarget(target);
	}

	const title =
		model === "pre-resolved" ? "Known in advance" : "Discovered on click";

	return (
		<section className="resolution-model" data-resolution-model={model}>
			<div className="resolution-model__reader">
				<header className="segment-reader__header">
					<nav aria-label={`${title} text location`}>
						<span>Texte</span>
						<i aria-hidden="true">/</i>
						<strong>1.1 Sams Ankunft</strong>
					</nav>
					<span className="segment-reader__hint">
						{model === "pre-resolved"
							? "Hover a member · the unit answers"
							: "Muted means the destination is unknown"}
					</span>
				</header>

				<article
					className="segment-reader__passage"
					aria-label={`${title}: Sams Ankunft`}
				>
					{PASSAGE.map((block) => (
						<PassageBlockView
							key={block.id}
							block={block}
							currentSelection={currentSelection}
							isResolving={isResolving}
							model={model}
							previewTarget={previewTarget}
							resolvingTarget={resolvingTarget}
							revealedUnitIds={revealedUnitIds}
							selectedUnits={selectedUnits}
							onBlurUnit={() => setFocusedTarget(null)}
							onFocusUnit={(unitId, segmentId) =>
								setFocusedTarget({ unitId, segmentId })
							}
							onLeaveUnit={() => setHoveredTarget(null)}
							onPreviewUnit={(unitId, segmentId) =>
								setHoveredTarget({ unitId, segmentId })
							}
							onSelectUnit={(unitId, segmentId) =>
								selectTarget({ unitId, segmentId })
							}
						/>
					))}
				</article>
			</div>
		</section>
	);
}

function PassageBlockView({
	block,
	currentSelection,
	isResolving,
	model,
	previewTarget,
	resolvingTarget,
	revealedUnitIds,
	selectedUnits,
	onFocusUnit,
	onBlurUnit,
	onLeaveUnit,
	onPreviewUnit,
	onSelectUnit,
}: {
	readonly block: PassageBlock;
	readonly currentSelection: SelectedUnit | null;
	readonly isResolving: boolean;
	readonly model: ResolutionModel;
	readonly previewTarget: InteractionTarget | null;
	readonly resolvingTarget: InteractionTarget | null;
	readonly revealedUnitIds: ReadonlySet<string>;
	readonly selectedUnits: readonly SelectedUnit[];
	readonly onFocusUnit: (unitId: string, segmentId: string) => void;
	readonly onBlurUnit: () => void;
	readonly onLeaveUnit: () => void;
	readonly onPreviewUnit: (unitId: string, segmentId: string) => void;
	readonly onSelectUnit: (unitId: string, segmentId: string) => void;
}) {
	const unitIsKnown = (unitId: string) =>
		model === "pre-resolved" || revealedUnitIds.has(unitId);
	const previewUnitIsKnown = previewTarget
		? unitIsKnown(previewTarget.unitId)
		: false;
	const selectedUnitIds = new Set(selectedUnits.map(({ unitId }) => unitId));
	const content = block.parts.map((part) => {
		if (part.kind === "space") {
			return (
				<span key={part.id} aria-hidden="true">
					{part.text}
				</span>
			);
		}

		const unit = resolveUnit(part.unitId, part.id);
		const known = unitIsKnown(part.unitId);
		const state = displayStateForSegment({
			currentSelection,
			part,
			previewTarget,
			previewUnitIsKnown,
			resolvingTarget,
			selectedUnitIds,
		});
		const accessibleDescription = !known
			? `${part.text}, click to resolve`
			: unit?.memberCount === 1
				? `${part.text}, single segment`
				: `${part.text}, part of ${unit?.reading ?? "one resolved unit"}`;

		return (
			<button
				key={part.id}
				type="button"
				className="text-segment"
				data-known={known || undefined}
				data-state={state}
				aria-disabled={isResolving || undefined}
				aria-busy={state === "resolving" || undefined}
				aria-label={accessibleDescription}
				onBlur={onBlurUnit}
				onClick={() => onSelectUnit(part.unitId, part.id)}
				onFocus={() => onFocusUnit(part.unitId, part.id)}
				onMouseEnter={() => onPreviewUnit(part.unitId, part.id)}
				onMouseLeave={onLeaveUnit}
			>
				{part.text}
			</button>
		);
	});

	if (block.kind === "dialogue") {
		return (
			<section
				className="passage-block passage-block--dialogue"
				data-passage-block={block.id}
			>
				<h2>{block.speaker}:</h2>
				<p>{content}</p>
			</section>
		);
	}

	return (
		<p
			className={`passage-block passage-block--${block.kind}`}
			data-passage-block={block.id}
		>
			{content}
		</p>
	);
}

function retainSelection(
	current: readonly SelectedUnit[],
	target: InteractionTarget,
): readonly SelectedUnit[] {
	return [
		...current.filter(({ unitId }) => unitId !== target.unitId),
		target,
	];
}

function displayStateForUnit({
	currentSelection,
	previewTarget,
	previewUnitIsKnown,
	selectedUnitIds,
	unitId,
}: {
	readonly currentSelection: SelectedUnit | null;
	readonly previewTarget: InteractionTarget | null;
	readonly previewUnitIsKnown: boolean;
	readonly selectedUnitIds: ReadonlySet<string>;
	readonly unitId: string;
}): SegmentDisplayState | undefined {
	if (previewUnitIsKnown && previewTarget?.unitId === unitId) {
		return "known-preview";
	}
	if (currentSelection?.unitId === unitId) return "selected";
	return selectedUnitIds.has(unitId) ? "retained" : undefined;
}

function displayStateForSegment({
	currentSelection,
	part,
	previewTarget,
	previewUnitIsKnown,
	resolvingTarget,
	selectedUnitIds,
}: {
	readonly currentSelection: SelectedUnit | null;
	readonly part: Extract<TextPart, { readonly kind: "segment" }>;
	readonly previewTarget: InteractionTarget | null;
	readonly previewUnitIsKnown: boolean;
	readonly resolvingTarget: InteractionTarget | null;
	readonly selectedUnitIds: ReadonlySet<string>;
}): SegmentDisplayState | undefined {
	if (resolvingTarget?.segmentId === part.id) return "resolving";
	if (!previewUnitIsKnown && previewTarget?.segmentId === part.id) {
		return "unknown-preview";
	}
	return displayStateForUnit({
		currentSelection,
		previewTarget,
		previewUnitIsKnown,
		selectedUnitIds,
		unitId: part.unitId,
	});
}

function tokenize(prefix: string, tokens: readonly TokenSpec[]): TextPart[] {
	return tokens.flatMap((token, index) => {
		const [text, explicitUnitId] =
			typeof token === "string" ? [token, undefined] : token;
		const id = `${prefix}-${index}`;
		const unitId = explicitUnitId ?? `single:${id}`;
		const segment: TextPart = { kind: "segment", id, text, unitId };
		const nextToken = tokens[index + 1];
		if (!nextToken) return [segment];

		const nextExplicitUnitId =
			typeof nextToken === "string" ? undefined : nextToken[1];
		const bridgeUnitId =
			explicitUnitId && explicitUnitId === nextExplicitUnitId
				? explicitUnitId
				: undefined;
		const gap: TextPart = {
			kind: "space",
			id: `${prefix}-space-${index}`,
			text: " ",
			...(bridgeUnitId ? { bridgeUnitId } : {}),
		};
		return [segment, gap];
	});
}

function resolveUnit(
	unitId: string | null,
	segmentId: string | null,
): Unit | null {
	if (!unitId) return null;
	const groupedUnit = UNITS.find((unit) => unit.id === unitId);
	if (groupedUnit) return groupedUnit;

	const segment = PASSAGE.flatMap((block) => block.parts).find(
		(part) => part.kind === "segment" && part.id === segmentId,
	);
	return segment?.kind === "segment"
		? {
				id: unitId,
				label: "Single segment",
				reading: segment.text,
				memberCount: 1,
			}
		: null;
}
