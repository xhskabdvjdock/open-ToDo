import { z } from "zod";
import type { Dict } from "./i18n/ar";
import ar from "./i18n/ar";
import en from "./i18n/en";
import type { Locale } from "./i18n/locale";

// ---------------------------------------------------------------------------
// Shared primitives (locale-independent)
// ---------------------------------------------------------------------------

const cuid = z.string().min(1).max(64);

export const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]);
export const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Lucide icon allow-list for projects (icon packs stay consistent). */
export const PROJECT_ICONS = [
  "folder",
  "briefcase",
  "book-open",
  "graduation-cap",
  "home",
  "user",
  "heart",
  "star",
  "code",
  "shield",
  "globe",
  "calendar",
  "music",
  "dumbbell",
  "plane",
  "wallet",
] as const;

export const projectIconSchema = z.enum(PROJECT_ICONS);

// ---------------------------------------------------------------------------
// Locale-aware schemas (messages follow the user's language)
// ---------------------------------------------------------------------------

export function getSchemas(locale: Locale) {
  const v: Dict["validation"] = (locale === "en" ? en : ar).validation;

  const usernameRule = z
    .string()
    .trim()
    .toLowerCase()
    .min(3, v.usernameShort)
    .max(20, v.usernameLong)
    .regex(/^[a-z0-9_]+$/, v.usernameInvalid);

  const registerSchema = z.object({
    name: z.string().trim().max(50, v.nameLong).optional().transform((x) => (x === "" ? undefined : x)),
    username: usernameRule,
    email: z.string().trim().toLowerCase().email(v.emailBad).max(254),
    password: z.string().min(8, v.pwShort).max(128),
    timezone: z.string().trim().min(1).max(64).optional().default("UTC"),
  });

  const loginSchema = z.object({
    /** Email address or username — resolved server-side. */
    identifier: z.string().trim().min(1, v.identifierRequired),
    password: z.string().min(1, v.pwRequired),
  });

  const taskCreateSchema = z.object({
    title: z.string().trim().min(1, v.titleRequired).max(200, v.titleLong),
    description: z
      .string()
      .trim()
      .max(2000, v.descLong)
      .optional()
      .transform((x) => (x === "" ? undefined : x)),
    status: taskStatusSchema.optional().default("TODO"),
    priority: prioritySchema.optional().default("MEDIUM"),
    /** ISO date/datetime string from the client, or null. */
    dueDate: z.string().trim().max(40).nullable().optional(),
    projectId: cuid.nullable().optional(),
    tagIds: z.array(cuid).max(20).optional().default([]),
  });

  const taskUpdateSchema = taskCreateSchema.partial().extend({
    id: cuid,
  });

  const taskIdSchema = z.object({ id: cuid });

  const projectCreateSchema = z.object({
    name: z.string().trim().min(1, v.projectNameRequired).max(60, v.projectNameLong),
    description: z
      .string()
      .trim()
      .max(500, v.projectDescLong)
      .optional()
      .transform((x) => (x === "" ? undefined : x)),
    color: z.string().regex(HEX_COLOR, v.badColor).optional().default("#4f46e5"),
    icon: projectIconSchema.optional().default("folder"),
  });

  const projectUpdateSchema = projectCreateSchema.partial().extend({
    id: cuid,
  });

  const tagCreateSchema = z.object({
    name: z
      .string()
      .trim()
      .min(1, v.tagRequired)
      .max(30, v.tagLong)
      .regex(/^[^\s,][^,]*$/, v.tagComma),
    color: z.string().regex(HEX_COLOR, v.badColor).optional().default("#64748b"),
  });

  const tagUpdateSchema = tagCreateSchema.partial().extend({
    id: cuid,
  });

  const profileSchema = z.object({
    name: z.string().trim().max(50, v.nameLong).optional().transform((x) => (x === "" ? undefined : x)),
    username: usernameRule.optional(),
    timezone: z.string().trim().min(1, v.tzRequired).max(64),
  });

  const passwordChangeSchema = z
    .object({
      currentPassword: z.string().min(1, v.currentPwRequired),
      newPassword: z.string().min(8, v.newPwShort).max(128),
    })
    .refine((x) => x.currentPassword !== x.newPassword, {
      message: v.pwDifferent,
      path: ["newPassword"],
    });

  const deleteAccountSchema = z.object({
    confirmation: z.literal(v.deleteWord, {
      message: v.deleteConfirmMsg,
    }),
    password: z.string().min(1, v.pwConfirmRequired),
  });

  return {
    registerSchema,
    loginSchema,
    taskCreateSchema,
    taskUpdateSchema,
    taskIdSchema,
    projectCreateSchema,
    projectUpdateSchema,
    tagCreateSchema,
    tagUpdateSchema,
    profileSchema,
    passwordChangeSchema,
    deleteAccountSchema,
  };
}

export type Schemas = ReturnType<typeof getSchemas>;

// ---------------------------------------------------------------------------
// Types (shape is identical across locales)
// ---------------------------------------------------------------------------

type DefaultSchemas = ReturnType<typeof getSchemas>;
export type TaskCreateInput = z.infer<DefaultSchemas["taskCreateSchema"]>;
export type TaskUpdateInput = z.infer<DefaultSchemas["taskUpdateSchema"]>;

// ---------------------------------------------------------------------------
// Search / filter (query params, validated server-side as well)
// ---------------------------------------------------------------------------

export const taskQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  status: z.union([taskStatusSchema, z.literal("ALL")]).optional().default("ALL"),
  priority: z.union([prioritySchema, z.literal("ALL")]).optional().default("ALL"),
  projectId: z.union([cuid, z.literal("ALL"), z.literal("NONE")]).optional().default("ALL"),
  tagId: z.union([cuid, z.literal("ALL")]).optional().default("ALL"),
  due: z.enum(["ALL", "OVERDUE", "TODAY", "UPCOMING", "NO_DATE"]).optional().default("ALL"),
  sort: z.enum(["MANUAL", "DUE_DATE", "PRIORITY", "CREATED", "UPDATED"]).optional().default("MANUAL"),
  direction: z.enum(["ASC", "DESC"]).optional().default("ASC"),
});

export type TaskQuery = z.infer<typeof taskQuerySchema>;
