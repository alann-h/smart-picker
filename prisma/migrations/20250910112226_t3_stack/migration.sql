-- CreateEnum
CREATE TYPE "public"."access_level" AS ENUM ('read', 'write', 'admin');

-- CreateEnum
CREATE TYPE "public"."connection_status" AS ENUM ('healthy', 'warning', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "public"."connection_type" AS ENUM ('none', 'qbo', 'xero');

-- CreateEnum
CREATE TYPE "public"."job_status" AS ENUM ('queued', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "public"."order_status" AS ENUM ('pending', 'checking', 'finalised', 'cancelled', 'assigned');

-- CreateEnum
CREATE TYPE "public"."picking_status" AS ENUM ('pending', 'backorder', 'completed', 'unavailable');

-- CreateEnum
CREATE TYPE "public"."run_status" AS ENUM ('pending', 'checking', 'finalised');

-- CreateEnum
CREATE TYPE "public"."security_event_type" AS ENUM ('login_success', 'login_failure', 'logout', 'password_reset_request', 'password_reset_success', 'user_lockout');

-- CreateTable
CREATE TABLE "public"."companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_name" TEXT NOT NULL,
    "connection_type" "public"."connection_type" NOT NULL DEFAULT 'none',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qbo_token_data" TEXT,
    "xero_token_data" TEXT,
    "qbo_realm_id" TEXT,
    "xero_tenant_id" TEXT,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID,
    "given_name" TEXT NOT NULL,
    "family_name" TEXT,
    "display_email" TEXT NOT NULL,
    "normalised_email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_failed_attempt" TIMESTAMPTZ(6),
    "locked_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "password_reset_token" TEXT,
    "password_reset_expires" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "access_level" "public"."access_level" NOT NULL DEFAULT 'read',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."api_audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "api_endpoint" TEXT NOT NULL,
    "connection_type" "public"."connection_type" NOT NULL,
    "request_method" TEXT NOT NULL,
    "response_status" INTEGER,
    "error_message" TEXT,
    "ip_address" INET,
    "user_agent" TEXT,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."connection_health" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "connection_type" "public"."connection_type" NOT NULL,
    "status" "public"."connection_status" NOT NULL DEFAULT 'healthy',
    "last_check" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_successful_call" TIMESTAMPTZ(6),
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "last_error_message" TEXT,
    "next_check_due" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() + '01:00:00'::interval),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connection_health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" BIGSERIAL NOT NULL,
    "company_id" UUID NOT NULL,
    "product_name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "external_item_id" TEXT,
    "category" TEXT,
    "tax_code_ref" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "quantity_on_hand" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customers" (
    "id" TEXT NOT NULL,
    "company_id" UUID NOT NULL,
    "customer_name" TEXT NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quotes" (
    "id" TEXT NOT NULL,
    "company_id" UUID NOT NULL,
    "customer_id" TEXT NOT NULL,
    "status" "public"."order_status" NOT NULL DEFAULT 'pending',
    "total_amount" DECIMAL(12,2) NOT NULL,
    "preparer_names" TEXT,
    "order_note" TEXT,
    "picker_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quote_number" VARCHAR(50),

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quote_items" (
    "quote_id" TEXT NOT NULL,
    "product_id" BIGINT NOT NULL,
    "product_name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "tax_code_ref" TEXT,
    "original_quantity" DECIMAL(10,2) NOT NULL,
    "picking_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "picking_status" "public"."picking_status" NOT NULL DEFAULT 'pending',

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("quote_id","product_id")
);

-- CreateTable
CREATE TABLE "public"."jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "s3_key" TEXT NOT NULL,
    "status" "public"."job_status" NOT NULL DEFAULT 'queued',
    "progress_percentage" INTEGER NOT NULL DEFAULT 0,
    "progress_message" TEXT DEFAULT 'File is queued for processing.',
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "run_number" BIGINT NOT NULL,
    "status" "public"."run_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."run_items" (
    "id" BIGSERIAL NOT NULL,
    "run_id" UUID NOT NULL,
    "quote_id" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "run_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."kyte_conversions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "kyte_order_number" TEXT NOT NULL,
    "quickbooks_estimate_id" TEXT,
    "quickbooks_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyte_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."security_events" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID,
    "company_id" UUID,
    "email" TEXT,
    "event_type" "public"."security_event_type" NOT NULL,
    "ip_address" INET,
    "user_agent" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "sid" VARCHAR NOT NULL,
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_display_email_key" ON "public"."users"("display_email");

-- CreateIndex
CREATE UNIQUE INDEX "users_normalised_email_key" ON "public"."users"("normalised_email");

-- CreateIndex
CREATE INDEX "users_company_id_idx" ON "public"."users"("company_id");

-- CreateIndex
CREATE INDEX "users_locked_until_idx" ON "public"."users"("locked_until");

-- CreateIndex
CREATE INDEX "users_normalised_email_idx" ON "public"."users"("normalised_email");

-- CreateIndex
CREATE INDEX "users_password_reset_token_idx" ON "public"."users"("password_reset_token");

-- CreateIndex
CREATE INDEX "user_permissions_company_id_idx" ON "public"."user_permissions"("company_id");

-- CreateIndex
CREATE INDEX "user_permissions_user_id_idx" ON "public"."user_permissions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_user_id_company_id_key" ON "public"."user_permissions"("user_id", "company_id");

-- CreateIndex
CREATE INDEX "api_audit_log_company_id_idx" ON "public"."api_audit_log"("company_id");

-- CreateIndex
CREATE INDEX "api_audit_log_connection_type_idx" ON "public"."api_audit_log"("connection_type");

-- CreateIndex
CREATE INDEX "api_audit_log_timestamp_idx" ON "public"."api_audit_log"("timestamp");

-- CreateIndex
CREATE INDEX "api_audit_log_user_id_idx" ON "public"."api_audit_log"("user_id");

-- CreateIndex
CREATE INDEX "connection_health_company_id_idx" ON "public"."connection_health"("company_id");

-- CreateIndex
CREATE INDEX "connection_health_next_check_due_idx" ON "public"."connection_health"("next_check_due");

-- CreateIndex
CREATE INDEX "connection_health_status_idx" ON "public"."connection_health"("status");

-- CreateIndex
CREATE UNIQUE INDEX "connection_health_company_id_connection_type_key" ON "public"."connection_health"("company_id", "connection_type");

-- CreateIndex
CREATE INDEX "products_company_archived_category_idx" ON "public"."products"("company_id", "is_archived", "category");

-- CreateIndex
CREATE INDEX "products_company_id_idx" ON "public"."products"("company_id");

-- CreateIndex
CREATE INDEX "products_company_sku_idx" ON "public"."products"("company_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_company_id_sku_key" ON "public"."products"("company_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_company_id_external_item_id_key" ON "public"."products"("company_id", "external_item_id");

-- CreateIndex
CREATE INDEX "customers_company_id_idx" ON "public"."customers"("company_id");

-- CreateIndex
CREATE INDEX "customers_id_idx" ON "public"."customers"("id");

-- CreateIndex
CREATE INDEX "quotes_company_customer_date_idx" ON "public"."quotes"("company_id", "customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "quotes_company_id_idx" ON "public"."quotes"("company_id");

-- CreateIndex
CREATE INDEX "quotes_company_status_date_idx" ON "public"."quotes"("company_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "quotes_customer_id_idx" ON "public"."quotes"("customer_id");

-- CreateIndex
CREATE INDEX "quotes_id_idx" ON "public"."quotes"("id");

-- CreateIndex
CREATE INDEX "quote_items_product_id_idx" ON "public"."quote_items"("product_id");

-- CreateIndex
CREATE INDEX "quote_items_quote_product_idx" ON "public"."quote_items"("quote_id", "product_id");

-- CreateIndex
CREATE INDEX "jobs_company_id_idx" ON "public"."jobs"("company_id");

-- CreateIndex
CREATE INDEX "runs_company_id_idx" ON "public"."runs"("company_id");

-- CreateIndex
CREATE INDEX "run_items_run_priority_idx" ON "public"."run_items"("run_id", "priority" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "run_items_run_id_quote_id_key" ON "public"."run_items"("run_id", "quote_id");

-- CreateIndex
CREATE INDEX "kyte_conversions_company_id_idx" ON "public"."kyte_conversions"("company_id");

-- CreateIndex
CREATE INDEX "kyte_conversions_created_at_idx" ON "public"."kyte_conversions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "kyte_conversions_status_idx" ON "public"."kyte_conversions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "kyte_conversions_company_id_kyte_order_number_key" ON "public"."kyte_conversions"("company_id", "kyte_order_number");

-- CreateIndex
CREATE INDEX "security_events_company_id_idx" ON "public"."security_events"("company_id");

-- CreateIndex
CREATE INDEX "security_events_ip_address_idx" ON "public"."security_events"("ip_address");

-- CreateIndex
CREATE INDEX "security_events_timestamp_idx" ON "public"."security_events"("timestamp");

-- CreateIndex
CREATE INDEX "security_events_user_id_idx" ON "public"."security_events"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expire_idx" ON "public"."sessions"("expire");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_permissions" ADD CONSTRAINT "user_permissions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."api_audit_log" ADD CONSTRAINT "api_audit_log_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."api_audit_log" ADD CONSTRAINT "api_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."connection_health" ADD CONSTRAINT "connection_health_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."customers" ADD CONSTRAINT "customers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."quote_items" ADD CONSTRAINT "quote_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."quote_items" ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."jobs" ADD CONSTRAINT "jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."runs" ADD CONSTRAINT "runs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."run_items" ADD CONSTRAINT "run_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."run_items" ADD CONSTRAINT "run_items_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."kyte_conversions" ADD CONSTRAINT "kyte_conversions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."security_events" ADD CONSTRAINT "security_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."security_events" ADD CONSTRAINT "security_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
