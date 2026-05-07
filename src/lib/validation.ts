import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[0-9]/, "Password must include a number")
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const stationSchema = z.object({
  name: z.string().min(3).max(80),
  description: z.string().max(300).optional(),
  genre: z.string().max(80).optional(),
  language: z.string().min(2).max(60),
  timezone: z.string().min(2).max(80),
  country: z.string().max(80).optional(),
  mountPath: z
    .string()
    .min(2)
    .max(80)
    .regex(/^\/?[a-zA-Z0-9._-]+$/, "Mount path can include letters, numbers, dots, dashes, and underscores")
});

export const trackSchema = z.object({
  stationId: z.string().min(1),
  title: z.string().min(1).max(120),
  artist: z.string().min(1).max(120),
  album: z.string().max(120).optional(),
  durationSec: z.coerce.number().int().positive().optional(),
  fileUrl: z.string().url().optional()
});

export const playlistSchema = z.object({
  stationId: z.string().min(1),
  name: z.string().min(2).max(80),
  description: z.string().max(200).optional()
});

export const playlistTrackSchema = z.object({
  playlistId: z.string().min(1),
  trackId: z.string().min(1)
});
