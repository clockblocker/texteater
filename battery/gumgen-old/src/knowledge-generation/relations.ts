import { z } from "zod";
import {
	type RequestableRelation,
	requestableRelationValues,
} from "../vocabulary";

/** Semantic Relation kinds that a model may generate directly. */
export const requestableRelationSchema = z.enum(requestableRelationValues);

export type { RequestableRelation };
