import { z } from 'zod'

export const VideoIdSchema = z.string().regex(/^[A-Za-z0-9_-]{11}$/, 'Invalid YouTube video ID')

export const TrackSchema = z.object({
  videoId: VideoIdSchema,
  title: z.string().min(1),
  artist: z.string().default('Unknown Artist'),
  album: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  isMusicVideo: z.boolean().default(false),
  alternateAudioId: VideoIdSchema.optional(),
  playlistId: z.string().optional(),
})
export type Track = z.infer<typeof TrackSchema>

export const DownloadStatusSchema = z.enum([
  'pending',
  'downloading',
  'transcoding',
  'done',
  'failed',
  'retrying',
  'cancelled',
])
export type DownloadStatus = z.infer<typeof DownloadStatusSchema>

export const DownloadJobSchema = z.object({
  id: z.string().uuid(),
  track: TrackSchema,
  status: DownloadStatusSchema.default('pending'),
  progress: z.number().min(0).max(100).default(0),
  speed: z.string().optional(),
  eta: z.string().optional(),
  error: z.string().optional(),
  outputPath: z.string().optional(),
  attempt: z.number().int().min(0).default(0),
})
export type DownloadJob = z.infer<typeof DownloadJobSchema>

export const SettingsSchema = z.object({
  outputFolder: z.string().default(''),
  bitrate: z.number().int().min(128).max(320).default(256),
  concurrency: z.number().int().min(1).max(10).default(3),
  filenameTemplate: z.enum(['artist-title', 'title-artist', 'title']).default('artist-title'),
  disclaimerAccepted: z.boolean().default(false),
  disclaimerVersion: z.string().default(''),
  disclaimerTimestamp: z.number().optional(),
})
export type Settings = z.infer<typeof SettingsSchema>

export const ProgressEventSchema = z.object({
  jobId: z.string(),
  percent: z.number().min(0).max(100),
  speed: z.string().optional(),
  eta: z.string().optional(),
  status: DownloadStatusSchema,
  error: z.string().optional(),
  outputPath: z.string().optional(),
})
export type ProgressEvent = z.infer<typeof ProgressEventSchema>

export const ImportResultSchema = z.object({
  tracks: z.array(TrackSchema),
  errors: z.array(z.string()),
})
export type ImportResult = z.infer<typeof ImportResultSchema>

export const BrowserSchema = z.enum(['chrome', 'firefox', 'safari', 'edge', 'brave', 'opera'])
export type Browser = z.infer<typeof BrowserSchema>

export const DISCLAIMER_VERSION = '1.0'
