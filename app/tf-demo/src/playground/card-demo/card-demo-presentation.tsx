import type { ComponentProps, CSSProperties, ReactNode, Ref } from "react";

import { cn } from "@/lib/utils";
import type {
	CardDemoFakeSegment,
	CardDemoResolutionCard,
	CardDemoVariant,
} from "./card-demo-contract";
import { cardDemoCardPresentation } from "./card-demo-fixtures";

export type CardDemoCardViewProps = Omit<
	ComponentProps<"button">,
	"children"
> & {
	readonly card: CardDemoResolutionCard;
	readonly segment: CardDemoFakeSegment;
};

export function CardDemoCardContent({
	card,
	segment,
}: {
	readonly card: CardDemoResolutionCard;
	readonly segment: CardDemoFakeSegment;
}) {
	const presentation = cardDemoCardPresentation(card.kind, segment);
	return (
		<>
			<span className="card-demo-card__eyebrow">
				{presentation.eyebrow}
			</span>
			<strong className="card-demo-card__title">
				{presentation.title}
			</strong>
			<span className="card-demo-card__detail">
				{presentation.detail}
			</span>
			<span className="card-demo-card__summary">{card.summary}</span>
		</>
	);
}

export function CardDemoCardView({
	card,
	segment,
	className,
	style,
	...props
}: CardDemoCardViewProps) {
	return (
		<button
			type="button"
			aria-label={`Open ${card.label} Note for ${segment.text}`}
			className={cn("card-demo-card", className)}
			data-card-demo-card={card.kind}
			data-presentation-layer={card.presentationLayer}
			style={
				{
					"--card-demo-layer": card.presentationLayer,
					...style,
				} as CSSProperties
			}
			{...props}
		>
			<CardDemoCardContent card={card} segment={segment} />
		</button>
	);
}

export function CardDemoStackFrame({
	children,
	className,
	ref,
	...props
}: ComponentProps<"div"> & { readonly ref?: Ref<HTMLDivElement> }) {
	return (
		<div
			className={cn("card-demo-stack", className)}
			data-card-demo-cancel-zone=""
			ref={ref}
			{...props}
		>
			{children}
		</div>
	);
}

export function CardDemoPageFrame({
	variant,
	title,
	children,
}: {
	readonly variant: CardDemoVariant;
	readonly title: string;
	readonly children: ReactNode;
}) {
	return (
		<main className="card-demo-page" data-card-demo-variant={variant}>
			<header className="card-demo-header">
				<p className="card-demo-kicker">
					Card interaction playground · {variant}
				</p>
				<h1>{title}</h1>
				<p>
					Fake data and shared presentation isolate interaction-engine
					behavior from tf-demo production Notes.
				</p>
			</header>
			{children}
		</main>
	);
}
