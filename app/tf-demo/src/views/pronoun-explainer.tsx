import { convexQuery } from "@convex-dev/react-query";
import { useAtomSet } from "@effect/atom-react";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
	createContext,
	type ReactNode,
	type RefObject,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import { visitorErrorMessage } from "@/lib/visitor-error";
import { PenMarks } from "@/views/pen-marks";
import {
	type ExplainerTarget,
	pinnedPronounAtom,
} from "@/views/pronoun-explainer-atoms";
import { api } from "../../convex/_generated/api";
import { unitKey } from "../../shared/pronoun-explanation";

/** A stored explanation as the reader gets it. */
type ExplanationView = FunctionReturnType<
	typeof api.pronounExplanations.forScroll
>[number];

/** Where a pronoun's explanation is, as its badge shows it. */
export type ExplanationStatus =
	| { readonly state: "Unasked" | "Pending" }
	| {
			readonly state: "Resolved";
			readonly antecedents: ExplanationView["antecedents"];
	  }
	| { readonly state: "Failed"; readonly message?: string };

/** What a Sentence of a Scroll's reader asks of the explainer. */
type ScrollExplainer = {
	readonly statusOf: (
		sentenceId: string,
		pronoun: readonly number[],
	) => ExplanationStatus;
	readonly explain: (target: ExplainerTarget) => void;
};

const ScrollExplainerContext = createContext<ScrollExplainer | null>(null);

/** The explainer of the Scroll reader this sits in; null anywhere else, such as a Definition. */
export function useScrollExplainer(): ScrollExplainer | null {
	return useContext(ScrollExplainerContext);
}

const keyOf = (sentenceId: string, pronoun: readonly number[]) =>
	`${sentenceId}:${unitKey(pronoun)}`;

/**
 * The pronoun explainer of one Scroll's reader: its Sentences' pronouns
 * explain on a click with the Explainer Modifier held, and the shown
 * pronoun's Antecedents get pen marks over `reader`. Explanations are
 * shared: every Visitor reads the stored ones, and a click asks only for
 * one nobody has.
 */
export function PronounExplainer({
	scrollId,
	reader,
	children,
}: {
	readonly scrollId: string;
	readonly reader: RefObject<HTMLElement | null>;
	readonly children: ReactNode;
}) {
	const visitorId = useAnonymousVisitorId();
	const { data } = useQuery(
		convexQuery(api.pronounExplanations.forScroll, { scrollId, visitorId }),
	);
	const request = useMutation(api.pronounExplanations.request);
	const recordSelectionTiming = useMutation(
		api.resolutionInspection.recordSelectionTiming,
	);
	const pin = useAtomSet(pinnedPronounAtom);
	// A refusal is this Visitor's alone, so it stays here, by pronoun.
	const [refusals, setRefusals] = useState<ReadonlyMap<string, string>>(
		() => new Map(),
	);
	const stored = useMemo(
		() =>
			new Map(
				(data ?? []).map((explanation) => [
					keyOf(explanation.sentenceId, explanation.pronoun),
					explanation,
				]),
			),
		[data],
	);

	const refuse = useCallback((key: string, message: string | null) => {
		setRefusals((previous) => {
			const next = new Map(previous);
			if (message === null) next.delete(key);
			else next.set(key, message);
			return next;
		});
	}, []);

	const explainer = useMemo((): ScrollExplainer => {
		const statusOf = (
			sentenceId: string,
			pronoun: readonly number[],
		): ExplanationStatus => {
			const key = keyOf(sentenceId, pronoun);
			const refusal = refusals.get(key);
			if (refusal !== undefined)
				return { state: "Failed", message: refusal };
			const explanation = stored.get(key);
			if (!explanation) return { state: "Unasked" };
			return explanation.state === "Resolved"
				? { state: "Resolved", antecedents: explanation.antecedents }
				: { state: explanation.state };
		};
		return {
			statusOf,
			explain: (target) => {
				pin(target);
				const key = keyOf(target.sentenceId, target.pronoun);
				if (stored.get(key)?.state === "Resolved") return;
				refuse(key, null);
				const inspect = import.meta.env.DEV;
				const requestId = inspect ? crypto.randomUUID() : undefined;
				const startedAt = Date.now();
				const clock = performance.now();
				request({
					visitorId,
					sentenceId: target.sentenceId,
					pronoun: [...target.pronoun],
					...(requestId === undefined
						? {}
						: { requestId, inspect: true }),
				})
					.then((answer) => {
						if (answer.kind === "Rejected") {
							refuse(key, answer.message);
							return;
						}
						if (requestId !== undefined) {
							void recordSelectionTiming({
								requestId,
								visitorId,
								startedAt,
								durationMs: performance.now() - clock,
							}).catch(() =>
								console.warn(
									"Pronoun explanation timing could not be recorded.",
								),
							);
						}
					})
					.catch((cause: unknown) =>
						refuse(key, visitorErrorMessage(cause)),
					);
			},
		};
	}, [
		pin,
		recordSelectionTiming,
		refusals,
		refuse,
		request,
		stored,
		visitorId,
	]);

	return (
		<ScrollExplainerContext.Provider value={explainer}>
			{children}
			<PenMarks reader={reader} statusOf={explainer.statusOf} />
		</ScrollExplainerContext.Provider>
	);
}

/**
 * The white "?" on the pronoun chunk under the explainer: a pen-green dot
 * above it, "∅" once explained as referring to nothing, "!" when the
 * explanation failed (a click asks again), pulsing while it is asked.
 */
export function ExplainerBadge({
	status,
}: {
	readonly status: ExplanationStatus;
}) {
	const glyph =
		status.state === "Failed"
			? "!"
			: status.state === "Resolved" && status.antecedents.length === 0
				? "∅"
				: "?";
	return (
		<span
			aria-hidden="true"
			data-slot="explainer-badge"
			data-state={status.state}
			className="pointer-events-none absolute inset-x-0 bottom-full -mb-[0.3em] flex justify-center [text-shadow:none]"
		>
			<span className="flex size-[1.5em] items-center justify-center rounded-full bg-pen text-[0.62em] leading-none font-bold text-white shadow-sm in-data-[state=Failed]:bg-destructive in-data-[state=Pending]:motion-safe:animate-pulse">
				{glyph}
			</span>
		</span>
	);
}
