import {
	Button,
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "lego";
import type * as React from "react";
import { useState } from "react";

/**
 * A destructive action behind a confirmation. The confirm button repeats the
 * consequence so "Cancel" and the action read as two distinct outcomes.
 */
export function ConfirmDialog({
	trigger,
	children,
	title,
	description,
	confirmLabel,
	onConfirm,
}: {
	/** The element to render as the trigger, without its label. */
	readonly trigger: React.ReactElement;
	/** The trigger's label and icon. */
	readonly children: React.ReactNode;
	readonly title: string;
	readonly description: string;
	readonly confirmLabel: string;
	readonly onConfirm: () => void;
}) {
	const [open, setOpen] = useState(false);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={trigger}>{children}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose render={<Button variant="outline" />}>
						Cancel
					</DialogClose>
					<Button
						variant="destructive"
						onClick={() => {
							setOpen(false);
							onConfirm();
						}}
					>
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
