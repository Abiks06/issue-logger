import { z } from "zod";

export const priorityValues = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type PriorityValue = (typeof priorityValues)[number];

export const createIssueSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(priorityValues),
});

export const editIssueSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(priorityValues),
});
