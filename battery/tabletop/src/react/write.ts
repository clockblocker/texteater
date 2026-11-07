import { snapOffset, snapWidth } from "../core/snap";
import { type Channel, sumAt, type Term } from "../core/term";

/**
 * What the Table last wrote on one element, by property. A write that
 * would set what is already there is skipped, so a value that holds still
 * (a stacking order waiting for its switch, a settled lean) restyles
 * nothing.
 */
export type Written = Map<string, string>;

export function setWritten(
	style: CSSStyleDeclaration,
	written: Written,
	prop: string,
	value: string | null,
) {
	if (value === null) {
		if (written.delete(prop)) style.removeProperty(prop);
		return;
	}
	if (written.get(prop) === value) return;
	style.setProperty(prop, value);
	written.set(prop, value);
}

function format(channel: Channel, value: number): string {
	if (channel === "z") return String(Math.round(value));
	if (channel === "rotate" || channel === "turn") return `${value}deg`;
	if (channel === "lift" || channel === "opacity") return String(value);
	return `${value}px`;
}

/** Where each snapped channel's move started, from its rest. */
export type Spans = Partial<Record<"x" | "y" | "width" | "height", number>>;

/**
 * A channel's offset as it is written: the box's place, height and a
 * Part's offset in whole device pixels from the rest, its width in even
 * ones, each never rounded back past where its move started (#1311 rule
 * 6); every other channel as it is.
 */
function snapped(
	channel: Channel,
	value: number,
	spans: Spans,
	dpr: number,
): number {
	if (channel === "width") return snapWidth(value, spans.width ?? value, dpr);
	if (channel === "x" || channel === "y" || channel === "height")
		return snapOffset(value, spans[channel] ?? value, dpr);
	return value;
}

/** Each channel's offset at `now`: where a move starting now starts from. */
export function spansAt(terms: readonly Term[], now: number): Spans {
	return {
		x: sumAt(terms, "x", now),
		y: sumAt(terms, "y", now),
		width: sumAt(terms, "width", now),
		height: sumAt(terms, "height", now),
	};
}

/**
 * Writes each channel of `props` with a live Term, snapped, and clears the
 * ones that ended.
 */
export function writeChannels(
	style: CSSStyleDeclaration,
	written: Written,
	terms: readonly Term[],
	props: Partial<Record<Channel, string>>,
	now: number,
	spans: Spans,
	dpr: number,
) {
	for (const [channel, prop] of Object.entries(props) as [
		Channel,
		string,
	][]) {
		const live = terms.some((term) => term.channel === channel);
		const value = live
			? format(
					channel,
					snapped(channel, sumAt(terms, channel, now), spans, dpr),
				)
			: null;
		setWritten(style, written, prop, value);
	}
}
