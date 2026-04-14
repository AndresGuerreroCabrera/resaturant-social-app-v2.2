import { VISIBILITY_VALUES } from "@savory/domain";
import { z } from "zod";

export const entityIdSchema = z.string().trim().min(1);
export const nonEmptyStringSchema = z.string().trim().min(1);
export const shortTextSchema = z.string().trim().min(1).max(120);
export const optionalShortTextSchema = z.string().trim().min(1).max(120).optional();
export const optionalNullableTextSchema = z
  .string()
  .trim()
  .max(2000)
  .nullable()
  .optional();
export const nullableTextSchema = z.string().trim().max(2000).nullable();
export const isoDateTimeSchema = z.string().datetime({ offset: true });
export const visibilitySchema = z.enum(VISIBILITY_VALUES);
export const ratingSchema = z.number().int().min(1).max(5);
export const priceTierSchema = z.string().trim().min(1).max(8);
export const tagSchema = z.string().trim().min(1).max(32);
export const tagListSchema = z.array(tagSchema).max(12);

export const geoPointSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180)
});

export const paginationQuerySchema = z.object({
  cursor: entityIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).optional()
});
