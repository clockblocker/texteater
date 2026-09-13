import { z } from "zod";

const exactTargetTagPattern = /<TARGET>|<\/TARGET>/gu;
const targetLikeTagPattern = /<\/?TARGET\b[^>]*>/giu;
const wordLikeMemberPattern = /^[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*$/u;

export const grammaticalResolutionMarkedContextSchema = z
	.string()
	.min(1)
	.superRefine((value, context) => {
		const targetLikeTags = [...value.matchAll(targetLikeTagPattern)];
		const exactTags = [...value.matchAll(exactTargetTagPattern)];
		if (targetLikeTags.length !== exactTags.length) {
			context.addIssue({
				code: "custom",
				message: "TARGET tags must use the exact literal markup.",
			});
			return;
		}

		if (exactTags.length === 0) {
			context.addIssue({
				code: "custom",
				message: "Marked context requires at least one TARGET member.",
			});
			return;
		}

		let openingEnd: number | null = null;
		for (const tag of exactTags) {
			const tagIndex = tag.index;
			if (tag[0] === "<TARGET>") {
				if (openingEnd !== null) {
					context.addIssue({
						code: "custom",
						message: "TARGET tags must not be nested.",
					});
					return;
				}
				openingEnd = tagIndex + tag[0].length;
				continue;
			}

			if (openingEnd === null) {
				context.addIssue({
					code: "custom",
					message: "TARGET tags must be balanced and ordered.",
				});
				return;
			}

			const member = value.slice(openingEnd, tagIndex);
			if (!wordLikeMemberPattern.test(member)) {
				context.addIssue({
					code: "custom",
					message:
						"Each TARGET pair must contain exactly one word-like member without surrounding punctuation, whitespace, or markup.",
				});
				return;
			}
			openingEnd = null;
		}

		if (openingEnd !== null) {
			context.addIssue({
				code: "custom",
				message: "TARGET tags must be balanced and ordered.",
			});
		}
	});
