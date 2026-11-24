CREATE TYPE "public"."history_era" AS ENUM('ww1', 'ww2');--> statement-breakpoint
CREATE TABLE "history_questions" (
	"id" integer PRIMARY KEY NOT NULL,
	"era" "history_era" NOT NULL,
	"period" text NOT NULL,
	"prompt" text NOT NULL,
	"hint" text NOT NULL,
	"answer_label" text NOT NULL,
	"explanation" text NOT NULL,
	"sources" jsonb NOT NULL,
	"data" jsonb NOT NULL
);
