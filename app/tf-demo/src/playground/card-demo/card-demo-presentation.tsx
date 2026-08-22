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
	children,
	className,
}: {
	readonly variant: CardDemoVariant;
	readonly children: ReactNode;
	readonly className?: string;
}) {
	return (
		<div
			className={cn("card-demo-page", className)}
			data-card-demo-variant={variant}
		>
			{children}
		</div>
	);
}
