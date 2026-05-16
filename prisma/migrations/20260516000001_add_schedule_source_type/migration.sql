-- AddScheduleSourceType: extend ScheduleBlock with sourceType, sourceId, color, notes
-- Run: prisma migrate deploy

-- Create the enum type
CREATE TYPE "ScheduleSourceType" AS ENUM (
  'PLAYLIST',
  'PODCAST_EPISODE',
  'RECORDING',
  'TRACK',
  'RANDOM_ALL',
  'LIVE_SLOT'
);

-- Add new columns to ScheduleBlock
ALTER TABLE "ScheduleBlock"
  ADD COLUMN "sourceType" "ScheduleSourceType" NOT NULL DEFAULT 'RANDOM_ALL',
  ADD COLUMN "sourceId"   TEXT,
  ADD COLUMN "color"      TEXT,
  ADD COLUMN "notes"      TEXT;

-- Backfill: blocks that have a playlistId should have sourceType = 'PLAYLIST'
UPDATE "ScheduleBlock"
  SET "sourceType" = 'PLAYLIST'
  WHERE "playlistId" IS NOT NULL;

-- Add index for efficient schedule resolution by station + day + hour
CREATE INDEX "ScheduleBlock_stationId_dayOfWeek_startHour_idx"
  ON "ScheduleBlock" ("stationId", "dayOfWeek", "startHour");
