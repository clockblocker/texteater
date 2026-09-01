import { useState } from "react";

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
	const [hoveredTarget, setHoveredTarget] =
		useState<InteractionTarget | null>(null);
	const [focusedTarget, setFocusedTarget] =
		useState<InteractionTarget | null>(null);
	const [selectedUnits, setSelectedUnits] = useState<readonly SelectedUnit[]>(
		[],
	);
	const [encounteredSegmentIds, setEncounteredSegmentIds] = useState<
		ReadonlySet<string>
	>(new Set());
	const currentSelection = selectedUnits.at(-1) ?? null;
	const knownUnitIds = new Set(selectedUnits.map(({ unitId }) => unitId));
	const previewTarget = hoveredTarget ?? focusedTarget;
	const inspectedTarget = previewTarget ?? currentSelection;
	const inspectedUnitIsKnown = inspectedTarget
		? knownUnitIds.has(inspectedTarget.unitId)
		: false;
	const inspectedUnit = inspectedTarget
		? resolveUnit(inspectedTarget.unitId, inspectedTarget.segmentId)
		: null;
	const inspectedSegmentStatus = inspectedTarget
		? encounteredSegmentIds.has(inspectedTarget.segmentId)
			? "Encountered"
			: inspectedUnitIsKnown
				? "Known member"
				: "Unseen"
		: null;
	const inspectorEyebrow = previewTarget
		? inspectedUnitIsKnown
			? "Previewing known unit"
			: "Previewing segment"
		: currentSelection
			? "Current selection"
			: "No selection";

	function previewUnit(unitId: string, segmentId: string) {
		setHoveredTarget({ unitId, segmentId });
	}

	function selectUnit(unitId: string, segmentId: string) {
		setSelectedUnits((current) => [
			...current.filter((unit) => unit.unitId !== unitId),
			{ unitId, segmentId },
		]);
		setEncounteredSegmentIds((current) => new Set([...current, segmentId]));
		setHoveredTarget(null);
		setFocusedTarget(null);
	}

	return (
		<div className="segment-study">
			<header className="segment-study__toolbar">
				<div className="segment-study__title">
					<span>Text specimen</span>
					<strong>Segments in continuous reading</strong>
				</div>
				<p className="segment-study__mode" aria-live="polite">
					<span
						className="segment-study__preview-key"
						aria-hidden="true"
					/>
					Amber previews
					<i aria-hidden="true" />
					<span
						className="segment-study__memory-key"
						aria-hidden="true"
					/>
					Blue remembers · {encounteredSegmentIds.size} encountered
				</p>
			</header>

			<div className="segment-study__body">
				<div className="segment-reader">
					<header className="segment-reader__header">
						<nav aria-label="Text location">
							<span>Texte</span>
							<i aria-hidden="true">/</i>
							<span>Extra</span>
							<i aria-hidden="true">/</i>
							<strong>1.1 Sams Ankunft</strong>
						</nav>
						<span className="segment-reader__hint">
							Hover to inspect · click to resolve and remember
						</span>
					</header>

					<article
						className="segment-reader__passage"
						aria-label="Sams Ankunft"
					>
						{PASSAGE.map((block) => (
							<PassageBlockView
								key={block.id}
								block={block}
								currentSelection={currentSelection}
								encounteredSegmentIds={encounteredSegmentIds}
								knownUnitIds={knownUnitIds}
								previewTarget={previewTarget}
								onBlurUnit={() => setFocusedTarget(null)}
								onFocusUnit={(unitId, segmentId) => {
									setFocusedTarget({ unitId, segmentId });
								}}
								onLeaveUnit={() => setHoveredTarget(null)}
								onPreviewUnit={previewUnit}
								onSelectUnit={selectUnit}
							/>
						))}
					</article>
				</div>

				<aside className="unit-inspector" aria-live="polite">
					<div className="unit-inspector__rule" aria-hidden="true" />
					<p className="unit-inspector__eyebrow">
						{inspectorEyebrow}
					</p>
					{inspectedUnit ? (
						<>
							<h2>
								{inspectedUnitIsKnown
									? inspectedUnit.reading
									: segmentText(
											inspectedTarget?.segmentId ?? null,
										)}
							</h2>
							<p>
								{inspectedUnitIsKnown
									? inspectedUnit.label
									: "Its unit is not known yet"}
							</p>
							<dl className="unit-inspector__facts">
								<div>
									<dt>Direct segment</dt>
									<dd
										data-segment-status={
											inspectedSegmentStatus
										}
									>
										{inspectedSegmentStatus}
									</dd>
								</div>
								<div>
									<dt>Resolved unit</dt>
									<dd>
										{inspectedUnitIsKnown
											? `${inspectedUnit.memberCount} ${
													inspectedUnit.memberCount ===
													1
														? "member"
														: "members"
												}`
											: "Unknown until click"}
									</dd>
								</div>
							</dl>
						</>
					) : (
						<>
							<h2>Read first</h2>
							<p>
								Hover previews one Segment. Clicking reveals its
								resolved unit.
							</p>
						</>
					)}
					<p className="unit-inspector__note">
						Amber follows your attention. Blue stays after a click.
						A heavier blue notch marks the exact Segment you
						encountered.
					</p>
				</aside>
			</div>
		</div>
	);
}

function PassageBlockView({
	block,
	currentSelection,
	encounteredSegmentIds,
	knownUnitIds,
	previewTarget,
	onFocusUnit,
	onBlurUnit,
	onLeaveUnit,
	onPreviewUnit,
	onSelectUnit,
}: {
	readonly block: PassageBlock;
	readonly currentSelection: SelectedUnit | null;
	readonly encounteredSegmentIds: ReadonlySet<string>;
	readonly knownUnitIds: ReadonlySet<string>;
	readonly previewTarget: InteractionTarget | null;
	readonly onFocusUnit: (unitId: string, segmentId: string) => void;
	readonly onBlurUnit: () => void;
	readonly onLeaveUnit: () => void;
	readonly onPreviewUnit: (unitId: string, segmentId: string) => void;
	readonly onSelectUnit: (unitId: string, segmentId: string) => void;
}) {
	const previewUnitIsKnown = previewTarget
		? knownUnitIds.has(previewTarget.unitId)
		: false;
	const content = block.parts.map((part) => {
		if (part.kind === "space") {
			const bridgeIsKnown =
				part.bridgeUnitId !== undefined &&
				knownUnitIds.has(part.bridgeUnitId);
			return (
				<span
					key={part.id}
					className="segment-bridge"
					data-known={bridgeIsKnown || undefined}
					data-current={
						(part.bridgeUnitId !== undefined &&
							currentSelection?.unitId === part.bridgeUnitId) ||
						undefined
					}
					data-preview={
						(part.bridgeUnitId !== undefined &&
							previewUnitIsKnown &&
							previewTarget?.unitId === part.bridgeUnitId) ||
						undefined
					}
					aria-hidden="true"
				>
					{part.text}
				</span>
			);
		}

		const unit = resolveUnit(part.unitId, part.id);
		const unitIsKnown = knownUnitIds.has(part.unitId);
		const previewRole =
			previewTarget?.segmentId === part.id
				? "origin"
				: previewUnitIsKnown && previewTarget?.unitId === part.unitId
					? "member"
					: undefined;
		const currentRole =
			currentSelection?.unitId === part.unitId
				? currentSelection.segmentId === part.id
					? "origin"
					: "member"
				: undefined;
		const knowledge = encounteredSegmentIds.has(part.id)
			? "encountered"
			: unitIsKnown
				? "known-member"
				: undefined;
		const accessibleDescription = !unitIsKnown
			? `${part.text}, click to resolve`
			: unit?.memberCount === 1
				? `${part.text}, single segment`
				: `${part.text}, part of ${unit?.reading ?? "one resolved unit"}`;

		return (
			<button
				key={part.id}
				type="button"
				className="text-segment"
				data-preview-role={previewRole}
				data-current-role={currentRole}
				data-knowledge={knowledge}
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

function segmentText(segmentId: string | null): string {
	if (!segmentId) return "";
	const segment = PASSAGE.flatMap((block) => block.parts).find(
		(part) => part.kind === "segment" && part.id === segmentId,
	);
	return segment?.kind === "segment" ? segment.text : "";
}
