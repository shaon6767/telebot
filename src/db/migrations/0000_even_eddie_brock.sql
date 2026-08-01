CREATE TYPE "public"."subscriber_status" AS ENUM('active', 'expired');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"telegram_chat_id" bigint NOT NULL,
	"owner_telegram_id" bigint NOT NULL,
	"name" text NOT NULL,
	"price_bdt" integer NOT NULL,
	"duration_days" integer NOT NULL,
	"bkash_number" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "groups_telegram_chat_id_unique" UNIQUE("telegram_chat_id")
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"telegram_user_id" bigint NOT NULL,
	"status" "subscriber_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"reminder_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"telegram_user_id" bigint NOT NULL,
	"reference_code" text NOT NULL,
	"trx_id" text NOT NULL,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"approved_by" bigint,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_trx_id_unique" UNIQUE("trx_id")
);
--> statement-breakpoint
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subscribers_group_user_unique" ON "subscribers" USING btree ("group_id","telegram_user_id");--> statement-breakpoint
CREATE INDEX "subscribers_expires_at_idx" ON "subscribers" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "transactions_group_user_status_idx" ON "transactions" USING btree ("group_id","telegram_user_id","status");