import type * as React from "react";
import { createContext, type ElementType, useContext } from "react";

import { cn } from "../utils";
import {
	clampMorph,
	DEFAULT_NOTE_SECTION_CHROME,
	morphForMode,
	type NoteSectionChrome,
	type NoteSurfaceMode,
	noteMorphStyle,
} from "./note-morph";

export type NoteSurfaceState = {
	readonly mode: NoteSurfaceMode;
	readonly morph: number;
	readonly sectionChrome: NoteSectionChrome;
	/**
	 * True when an enclosing host (such as `PresentationContent`) owns
	 * `--note-morph` so nested `NoteFrame` elements inherit live motion instead
	 * of overwriting it with a static 0 or 1.
	 */
	readonly managed: boolean;
};

const DEFAULT_SURFACE: NoteSurfaceState = {
	mode: "sheet",
	morph: 1,
	sectionChrome: DEFAULT_NOTE_SECTION_CHROME,
	managed: false,
};

const NoteSurfaceContext = createContext<NoteSurfaceState>(DEFAULT_SURFACE);

/** Reads the enclosing Note presentation surface state. */
export function useNoteSurface(): NoteSurfaceState {
	return useContext(NoteSurfaceContext);
}

/**
 * Provides Note surface state (`mode`, `morph`, `sectionChrome`) without
 * emitting an extra DOM wrapper. Used by hosts whose motion element already
 * carries the data attributes and `--note-morph` custom property.
 */
export function NoteSurfaceProvider({
	value,
	children,
}: {
	readonly value: NoteSurfaceState;
	readonly children: React.ReactNode;
}) {
	return (
		<NoteSurfaceContext.Provider value={value}>
			{children}
		</NoteSurfaceContext.Provider>
	);
}

/**
 * Declares the presentation surface for all Note molecules beneath it.
 *
 * Sets `data-note-surface`, `data-density` (for backwards compatibility),
 * optional `data-section-chrome`, and `--note-morph` (unless inherited from a
 * managed host that animates `--note-morph` directly).
 */
export function NoteSurface({
	mode,
	morph,
	sectionChrome,
	managed = false,
	className,
	style,
	children,
	...props
}: React.ComponentProps<"div"> & {
	readonly mode?: NoteSurfaceMode;
	readonly morph?: number;
	readonly sectionChrome?: NoteSectionChrome;
	readonly managed?: boolean;
}) {
	const parent = useNoteSurface();
	const resolvedMode: NoteSurfaceMode =
		mode ??
		(morph !== undefined ? (morph >= 0.5 ? "sheet" : "card") : parent.mode);
	const resolvedMorph =
		morph !== undefined ? clampMorph(morph) : morphForMode(resolvedMode);
	const resolvedChrome = sectionChrome ?? parent.sectionChrome;
	const ownsMorph = morph !== undefined || !parent.managed;
	const mergedStyle = ownsMorph
		? { ...noteMorphStyle(resolvedMorph), ...style }
		: style;

	const morphing =
		morph !== undefined && resolvedMorph > 0 && resolvedMorph < 1;

	return (
		<NoteSurfaceContext.Provider
			value={{
				mode: resolvedMode,
				morph: resolvedMorph,
				sectionChrome: resolvedChrome,
				managed: managed || parent.managed,
			}}
		>
			<div
				data-note-surface={resolvedMode}
				data-density={
					resolvedMode === "card" ? "compact" : "comfortable"
				}
				data-morphing={morphing ? "" : undefined}
				data-section-chrome={
					sectionChrome ??
					(parent.managed ? undefined : resolvedChrome)
				}
				className={cn("min-w-0", className)}
				style={mergedStyle}
				{...props}
			>
				{children}
			</div>
		</NoteSurfaceContext.Provider>
	);
}

/**
 * The shared paper column framing a Note's blocks (loaded, resolving, or
 * skeleton). Reads `--note-morph` from its enclosing `NoteSurface` so its
 * padding and typography interpolate smoothly between Card and Sheet.
 */
export function NoteFrame({
	mode,
	morph,
	sectionChrome,
	underHeading = false,
	frameAs = "article",
	frameLabel,
	frameBusy,
	frameHidden,
	frameClassName,
	className,
	children,
	...props
}: React.ComponentProps<"div"> & {
	readonly mode?: NoteSurfaceMode;
	readonly morph?: number;
	readonly sectionChrome?: NoteSectionChrome;
	/** True when a host renders the Heading row above this Body frame. */
	readonly underHeading?: boolean;
	readonly frameAs?: "article" | "div";
	readonly frameLabel?: string;
	readonly frameBusy?: boolean;
	readonly frameHidden?: boolean;
	readonly frameClassName?: string;
}) {
	const FrameElement: ElementType = frameAs;
	return (
		<NoteSurface
			mode={mode}
			morph={morph}
			sectionChrome={sectionChrome}
			className={cn(
				"min-h-full bg-[var(--note-bg,var(--paper))] text-ink",
				className,
			)}
			{...props}
		>
			<FrameElement
				data-slot="note-frame"
				data-under-heading={underHeading || undefined}
				aria-label={frameLabel}
				aria-busy={frameBusy || undefined}
				aria-hidden={frameHidden || undefined}
				className={cn("mx-auto w-full max-w-note", frameClassName)}
			>
				{children}
			</FrameElement>
		</NoteSurface>
	);
}

/**
 * Space-aware progressive disclosure for secondary block content (such as
 * `LoadMore`, non-active Surface analyses, or Sheet-only actions) without
 * forking DOM trees between Card and Sheet.
 *
 * - `sheet`: collapsed in Card (`t = 0`), smoothly revealed in Sheet (`t = 1`).
 * - `card`: visible in Card (`t = 0`), smoothly tucked away in Sheet (`t = 1`).
 */
export function NoteMorphReveal<T extends ElementType = "div">({
	as,
	visibility,
	className,
	children,
	...props
}: {
	readonly as?: T;
	readonly visibility: "sheet" | "card";
	readonly className?: string;
	readonly children: React.ReactNode;
} & Omit<React.ComponentPropsWithRef<T>, "as" | "visibility" | "children">) {
	const { mode } = useNoteSurface();
	const hidden =
		(visibility === "sheet" && mode === "card") ||
		(visibility === "card" && mode === "sheet");
	const Element: ElementType = as ?? "div";
	return (
		<Element
			data-slot="note-morph-reveal"
			data-visibility={visibility}
			aria-hidden={hidden || undefined}
			inert={hidden || undefined}
			className={cn(className)}
			{...props}
		>
			<div data-slot="note-morph-reveal-inner">{children}</div>
		</Element>
	);
}
