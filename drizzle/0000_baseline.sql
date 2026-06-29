CREATE TYPE "public"."activity_parent_table" AS ENUM('contacts', 'deals', 'companies', 'bird_dogs', 'issues');--> statement-breakpoint
CREATE TYPE "public"."note_type" AS ENUM('manual', 'call_log', 'form_submission');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('task', 'call', 'email', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'acquisitions_manager', 'closer', 'bird_dog_manager', 'bird_dog', 'transaction_coord', 'underwriter', 'dispo_manager', 'cfo', 'due_diligence', 'viewer', 'bd_level_1', 'bd_level_2', 'bd_level_3', 'park_manager');--> statement-breakpoint
CREATE TYPE "public"."bd_exit_kind" AS ENUM('break', 'leave');--> statement-breakpoint
CREATE TYPE "public"."bird_dog_acquisition_level" AS ENUM('onboarding', 'junior', 'senior');--> statement-breakpoint
CREATE TYPE "public"."training_status" AS ENUM('no', 'in_progress', 'yes');--> statement-breakpoint
CREATE TYPE "public"."company_employee_bucket" AS ENUM('under_10', '10_50', '50_200', '200_1000', '1000_plus');--> statement-breakpoint
CREATE TYPE "public"."company_relationship_to_park" AS ENUM('realtor', 'owner', 'owner_realtor');--> statement-breakpoint
CREATE TYPE "public"."company_revenue_bucket" AS ENUM('under_1m', '1m_5m', '5m_20m', '20m_50m', '50m_100m', '100m_plus');--> statement-breakpoint
CREATE TYPE "public"."bulk_email_status" AS ENUM('single_opt_in', 'double_opt_in', 'opted_out', 'hard_bounced');--> statement-breakpoint
CREATE TYPE "public"."buyer_gp_lp" AS ENUM('investor_only', 'operator_only', 'operator_or_investor', 'operator_open_to_wedge', 'no_rvp_parks');--> statement-breakpoint
CREATE TYPE "public"."buyer_lead_source" AS ENUM('investor_popup', 'seller_popup', 'buyer_popup', 'emailed_in', 'rv_broker', 'fb_messenger_inbound', 'facebook_inbound_message', 'facebook_groups', 'meetup', 'reza_outreach', 'dan_outreach', 'travis_outreach', 'pace_zoom_call');--> statement-breakpoint
CREATE TYPE "public"."buyer_qualification_tier" AS ENUM('tier_1_experienced_rvp_network', 'tier_2_experienced_re_new_to_rvp', 'tier_3_re_investor_small_scale', 'tier_4_new_re_investor_250k_dp', 'tier_5_new_re_investor_100k_dp');--> statement-breakpoint
CREATE TYPE "public"."buyer_status" AS ENUM('new_waiting_to_connect', 'active_looking', 'active_looking_hot', 'deal_under_contract', 'closed_bought_with_us', 'paused_new_minimal_cash', 'paused_temporary', 'unresponsive', 'disqualified');--> statement-breakpoint
CREATE TYPE "public"."deployable_cash_bucket" AS ENUM('under_100k', '100k_250k', '250k_500k', '500k_1m', '1m_plus');--> statement-breakpoint
CREATE TYPE "public"."exchange_1031_bucket" AS ENUM('none', 'under_250k', '250k_500k', '500k_1m', '1m_plus');--> statement-breakpoint
CREATE TYPE "public"."fastest_turnaround" AS ENUM('asap', 'this_quarter', 'this_year', 'sooner_than_later');--> statement-breakpoint
CREATE TYPE "public"."financing_options" AS ENUM('must_be_creative', 'creative_or_conventional');--> statement-breakpoint
CREATE TYPE "public"."max_deal_size_bucket" AS ENUM('under_1m', '1m_5m', '5m_plus');--> statement-breakpoint
CREATE TYPE "public"."time_since_last_activity" AS ENUM('today_hot', 'this_week', 'this_month', 'more_than_month_cold');--> statement-breakpoint
CREATE TYPE "public"."call_disposition" AS ENUM('first_contact_attempted', 'first_contact_made', 'interested_negotiating', 'gathering_docs', 'not_selling_7d', 'not_selling_14d', 'not_selling_30d', 'not_selling_45d', 'not_selling_90d', 'not_pursuing_dnc');--> statement-breakpoint
CREATE TYPE "public"."deal_lead_source" AS ENUM('bird_dog', 'direct_seller_rvx_website', 'outside_source_rvx_website');--> statement-breakpoint
CREATE TYPE "public"."deal_priority" AS ENUM('cold', 'warm', 'hot');--> statement-breakpoint
CREATE TYPE "public"."dispo_stage" AS ENUM('sent_to_primary_buyer', 'sending_to_buyer_2_3_4', 'send_to_rv_park_groups', 'post_to_subto_group', 'send_to_email_list');--> statement-breakpoint
CREATE TYPE "public"."escrow_fee_responsibility" AS ENUM('buyer', 'seller', 'buyer_seller_50_50');--> statement-breakpoint
CREATE TYPE "public"."park_type" AS ENUM('long_term', 'short_term', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."recent_activity_bucket" AS ENUM('last_week', 'last_month', 'more_than_month');--> statement-breakpoint
CREATE TYPE "public"."title_policy_responsibility" AS ENUM('seller', 'buyer');--> statement-breakpoint
CREATE TYPE "public"."transfer_tax_responsibility" AS ENUM('100_seller', '100_buyer', '50_50');--> statement-breakpoint
CREATE TYPE "public"."weekly_offer_review" AS ENUM('passed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."dd_capx_type" AS ENUM('roads', 'water_lines', 'sewer_lines', 'gas', 'electricity', 'landscaping', 'buildings', 'park_owned_homes', 'other');--> statement-breakpoint
CREATE TYPE "public"."dd_checklist_section" AS ENUM('contracts_legal', 'quotes_needed', 'financial_resident', 'city_county_state', 'market_demographics', 'utilities_infra', 'physical_inspections', 'park_owned_homes', 'budgets_valuation');--> statement-breakpoint
CREATE TYPE "public"."dd_comparable_type" AS ENUM('rv_or_mh_park', 'apartment', 'single_family');--> statement-breakpoint
CREATE TYPE "public"."dd_contact_category" AS ENUM('purchase', 'government', 'utility', 'vendor', 'market');--> statement-breakpoint
CREATE TYPE "public"."dd_noi_direction" AS ENUM('increase_income', 'reduce_expense');--> statement-breakpoint
CREATE TYPE "public"."dd_poh_category" AS ENUM('park_owned_home', 'building_or_structure');--> statement-breakpoint
CREATE TYPE "public"."feedback_kind" AS ENUM('feature', 'bug');--> statement-breakpoint
CREATE TYPE "public"."feedback_status" AS ENUM('new', 'in_progress', 'done', 'wontfix');--> statement-breakpoint
CREATE TYPE "public"."hire_category" AS ENUM('leadership', 'acquisition');--> statement-breakpoint
CREATE TYPE "public"."hire_status" AS ENUM('draft', 'finance_review', 'founder_review', 'requester_review', 'finalized', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."hire_type" AS ENUM('employee', 'contractor_1099', 'vendor');--> statement-breakpoint
CREATE TYPE "public"."bird_dog_status_group" AS ENUM('intake', 'interviewing', 'agreement', 'onboarding', 'active', 'active_half', 'on_watch', 'paused', 'executive', 'inactive', 'denied');--> statement-breakpoint
CREATE TYPE "public"."deal_status_role" AS ENUM('am', 'uw', 'closer', 'pm', 'tc', 'dm', 'drip', 'parked', 'closed', 'dead', 'misc');--> statement-breakpoint
CREATE TYPE "public"."notification_kind" AS ENUM('deal_ready_for_review', 'deal_status_changed', 'new_lead', 'bird_dog_application', 'team_invite', 'password_reset', 'bd_exit');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed', 'logged_only');--> statement-breakpoint
CREATE TYPE "public"."message_template_kind" AS ENUM('dispo', 'follow_up', 'intro', 'ncnda_invite', 'custom');--> statement-breakpoint
CREATE TYPE "public"."issue_priority" AS ENUM('red', 'orange', 'green');--> statement-breakpoint
CREATE TYPE "public"."issue_status" AS ENUM('open', 'discussing', 'solved');--> statement-breakpoint
CREATE TYPE "public"."raw_lead_outcome" AS ENUM('no_answer', 'voicemail', 'busy', 'wrong_number', 'connected_interested', 'connected_not_selling', 'connected_thinking', 'connected_selling_to_family', 'connected_future_maybe', 'connected_manager_only', 'qualified', 'do_not_call', 'bad_contact_info', 'email_follow_up');--> statement-breakpoint
CREATE TYPE "public"."raw_lead_status" AS ENUM('pool', 'claimed', 'converted', 'dead', 'duplicate');--> statement-breakpoint
CREATE TYPE "public"."reimbursement_status" AS ENUM('pending', 'approved', 'purchased', 'fulfilled', 'declined');--> statement-breakpoint
CREATE TABLE "note_mentions" (
	"id" text PRIMARY KEY NOT NULL,
	"note_id" text NOT NULL,
	"mentioned_user_id" text NOT NULL,
	"parent_table" "activity_parent_table" NOT NULL,
	"parent_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_table" "activity_parent_table" NOT NULL,
	"parent_id" text NOT NULL,
	"body" text NOT NULL,
	"type" "note_type" DEFAULT 'manual' NOT NULL,
	"author_id" text,
	"legacy_ontraport_id" integer,
	"legacy_author_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_table" "activity_parent_table" NOT NULL,
	"parent_id" text NOT NULL,
	"subject" text NOT NULL,
	"body" text,
	"type" "task_type" DEFAULT 'task' NOT NULL,
	"assignee_id" text,
	"created_by_id" text,
	"due_at" timestamp,
	"completed_at" timestamp,
	"completed_by_id" text,
	"outcome" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"body" text NOT NULL,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"actor_name" text,
	"actor_email" text,
	"action" text NOT NULL,
	"target_kind" text,
	"target_id" text,
	"target_label" text,
	"meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"suspended_at" timestamp,
	"suspended_by_id" text,
	"deleted_at" timestamp,
	"deleted_by_id" text,
	"onboarded_at" timestamp,
	"onboarding_acks" jsonb,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bd_exit_surveys" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" "bd_exit_kind" NOT NULL,
	"answers" jsonb NOT NULL,
	"parks_released" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bird_dogs" (
	"id" text PRIMARY KEY NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text,
	"cell_phone" text,
	"facebook_url" text,
	"profile_image_url" text,
	"status_code" text,
	"acquisition_level" "bird_dog_acquisition_level",
	"application_qualified" boolean,
	"application_acks" text,
	"start_date" date,
	"agreement_sign_date" date,
	"follow_up_meeting_at" timestamp,
	"send_agreement" boolean DEFAULT false NOT NULL,
	"send_onboarding_packet" boolean DEFAULT false NOT NULL,
	"send_training_videos" boolean DEFAULT false NOT NULL,
	"rvx_agreement_signed" boolean DEFAULT false NOT NULL,
	"auto_send_termination_email" boolean DEFAULT false NOT NULL,
	"manually_remove_from_tracker" boolean DEFAULT false NOT NULL,
	"is_in_discord" boolean DEFAULT false NOT NULL,
	"kicked_from_discord" boolean DEFAULT false NOT NULL,
	"give_access_to_tracker" boolean DEFAULT false NOT NULL,
	"resume_url" text,
	"w9_url" text,
	"signed_agreement_url" text,
	"completed_training" boolean DEFAULT false NOT NULL,
	"ethics_training_status" "training_status",
	"why_join_rvx" text,
	"how_heard_about_rvx" text,
	"current_w2" text,
	"prior_w2" text,
	"w2_goals" text,
	"hospitality_background" text,
	"business_ops_background" text,
	"weekly_execution_plan" text,
	"game_plan_forward" text,
	"rv_class" text,
	"rv_rig" text,
	"years_full_time_traveling" text,
	"subto_member" boolean DEFAULT false NOT NULL,
	"subto_since" text,
	"gator_member" boolean DEFAULT false NOT NULL,
	"gator_since" text,
	"top_tier_member" boolean DEFAULT false NOT NULL,
	"top_tier_since" text,
	"owners_club_member" boolean DEFAULT false NOT NULL,
	"owners_club_since" text,
	"zero_down_member" boolean DEFAULT false NOT NULL,
	"zero_down_since" text,
	"bulk_email_opted_out" boolean DEFAULT false NOT NULL,
	"owner_id" text,
	"user_id" text,
	"last_portal_visit_at" timestamp,
	"legacy_ontraport_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by_id" text,
	"last_activity_at" timestamp,
	"last_email_received_at" timestamp,
	"last_email_sent_at" timestamp,
	"last_sms_received_at" timestamp,
	"last_sms_sent_at" timestamp,
	"last_call_logged_at" timestamp,
	"last_note" text,
	"ip_address" text,
	CONSTRAINT "bird_dogs_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "command_rocks" (
	"id" text PRIMARY KEY NOT NULL,
	"assignee_id" text NOT NULL,
	"title" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"period" text DEFAULT 'quarter' NOT NULL,
	"done_at" timestamp,
	"done_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"relationship_to_park" "company_relationship_to_park" NOT NULL,
	"seller_first_name" text,
	"seller_last_name" text,
	"email" text,
	"phone" text,
	"office_phone" text,
	"address" text,
	"city" text,
	"state" text,
	"zipcode" text,
	"facebook_page" text,
	"instagram_name" text,
	"description" text,
	"annual_revenue" "company_revenue_bucket",
	"employee_count" "company_employee_bucket",
	"profile_image_url" text,
	"ip_address" text,
	"owner_id" text,
	"bulk_email_opted_out" boolean DEFAULT false NOT NULL,
	"legacy_ontraport_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by_id" text,
	"last_activity_at" timestamp,
	"last_email_received_at" timestamp,
	"last_email_sent_at" timestamp,
	"last_sms_received_at" timestamp,
	"last_sms_sent_at" timestamp,
	"last_call_logged_at" timestamp,
	"last_note" text
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text,
	"phone" text,
	"sms_number" text,
	"office_phone" text,
	"fax" text,
	"title" text,
	"timezone" text,
	"birthday" date,
	"address" text,
	"address_2" text,
	"city" text,
	"state" text,
	"zip" text,
	"country" text,
	"website" text,
	"facebook_link" text,
	"instagram_link" text,
	"linkedin_link" text,
	"twitter_link" text,
	"blinq_profile" text,
	"profile_image_url" text,
	"status" "buyer_status",
	"qualification_tier" "buyer_qualification_tier",
	"score" integer,
	"buyer_number" integer,
	"top_tier" boolean DEFAULT false NOT NULL,
	"time_since_last_activity" time_since_last_activity,
	"park_type_preferences" text[],
	"target_states" text[],
	"strict_states" boolean DEFAULT false NOT NULL,
	"pads_desired_min" integer,
	"amount_of_pads_desired_bucket" text,
	"max_deal_size" "max_deal_size_bucket",
	"min_noi_usd" numeric(14, 2),
	"park_with_restaurant" boolean,
	"open_to_leased_land" boolean NOT NULL,
	"deployable_cash" "deployable_cash_bucket",
	"will_use_1031" boolean,
	"using_1031_amount" "exchange_1031_bucket",
	"pof_amount" numeric(14, 2),
	"can_produce_pof" boolean,
	"pof_file_url" text,
	"pof_auth_form_url" text,
	"pof_consent_form_url" text,
	"financing_options" "financing_options",
	"current_financing_resources" text[],
	"fastest_turnaround" "fastest_turnaround",
	"investor_type" text[],
	"gp_lp" "buyer_gp_lp",
	"rei_experience_outside_rvp" text[],
	"rvp_closed_in_past_bucket" text,
	"twelve_month_goals_bucket" text,
	"buyers_valuable_skills" text[],
	"describe_skill_experience" text,
	"skillset" text[],
	"signed_ncnda" boolean DEFAULT false NOT NULL,
	"signed_ncnda_at" timestamp,
	"signed_ncnda_link" text,
	"nda_acceptance_checkbox" boolean DEFAULT false NOT NULL,
	"sms_permission" boolean DEFAULT false NOT NULL,
	"bulk_email_status" "bulk_email_status" DEFAULT 'single_opt_in',
	"bulk_sms_opted_out" boolean DEFAULT false NOT NULL,
	"subto_member" boolean DEFAULT false NOT NULL,
	"subto_member_since" text,
	"owners_club_member" boolean DEFAULT false NOT NULL,
	"gator_member" boolean DEFAULT false NOT NULL,
	"top_tier_member" boolean DEFAULT false NOT NULL,
	"intake_interview_date" date,
	"name_of_llc" text,
	"buyers_additional_comments" text,
	"buyers_anything_else_popup" text,
	"min_return_required" text,
	"first_lead_source" text,
	"first_medium" text,
	"first_campaign" text,
	"first_content" text,
	"first_term" text,
	"last_lead_source" text,
	"last_medium" text,
	"last_campaign" text,
	"last_content" text,
	"last_term" text,
	"buyer_lead_source" "buyer_lead_source",
	"referring_page" text,
	"ip_address" text,
	"user_agent" text,
	"internal_notes_buyer_contact" text,
	"internal_notes_buyer_criteria" text,
	"internal_notes_qualify_credibility" text,
	"owner_id" text,
	"company_id" text,
	"legacy_ontraport_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by_id" text,
	"last_activity_at" timestamp,
	"last_email_received_at" timestamp,
	"last_email_sent_at" timestamp,
	"last_sms_received_at" timestamp,
	"last_sms_sent_at" timestamp,
	"last_call_logged_at" timestamp,
	"last_note" text,
	CONSTRAINT "contacts_buyer_number_unique" UNIQUE("buyer_number")
);
--> statement-breakpoint
CREATE TABLE "daily_briefs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"for_date" date NOT NULL,
	"content_md" text NOT NULL,
	"model" text,
	"tokens_in" integer,
	"tokens_out" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aa_rounds" (
	"id" text PRIMARY KEY NOT NULL,
	"deal_id" text NOT NULL,
	"round_number" integer NOT NULL,
	"sent_at" date,
	"accepted_at" date,
	"rejected_at" date,
	"contingent_note" text,
	"contract_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"profile_image_url" text,
	"park_address" text,
	"park_city" text,
	"park_state" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"park_type" "park_type",
	"pads_count" integer,
	"cabins_count" text,
	"tent_sites_count" text,
	"hotel_motel_count" text,
	"total_units" integer,
	"acres_count" text,
	"full_hookup_pads" text,
	"water_system_type" text,
	"septic_system_type" text,
	"septic_count_last_serviced" text,
	"electrical_detail" text,
	"pads_on_separate_meters" text,
	"occupancy_pct" numeric(5, 2),
	"mix_use" text,
	"amenities" text[],
	"google_map_url" text,
	"spatial_picture_url" text,
	"listing_link" text,
	"property_website" text,
	"has_restaurant" boolean DEFAULT false NOT NULL,
	"repairs_or_deferred_maintenance" text,
	"what_makes_this_special" text,
	"motivation_to_sell" text,
	"looking_to_retire" text,
	"ideally_close_date" text,
	"manager_in_place" text,
	"owns_other_parks" text,
	"other_income_streams" text,
	"any_other_debts_liens" text,
	"taxes_current" text,
	"owned_the_park_long" text,
	"permission_to_share_financials" boolean,
	"important_seller_terms" text,
	"list_price" numeric(14, 2),
	"list_noi" numeric(14, 2),
	"list_cap_rate" text,
	"open_to_creative" boolean DEFAULT false NOT NULL,
	"agreed_purchase_price" numeric(14, 2),
	"agreed_cap_rate" text,
	"cash_offer" numeric(14, 2),
	"seller_finance_down_payment" numeric(14, 2),
	"seller_finance_amount" numeric(14, 2),
	"seller_finance_interest_rate" text,
	"seller_finance_amort_years" text,
	"seller_finance_balloon_years" text,
	"hybrid_purchase_price" numeric(14, 2),
	"hybrid_down_payment" numeric(14, 2),
	"hybrid_interest_rate" numeric(6, 3),
	"hybrid_amort_years" integer,
	"bank_interest_rate" text,
	"bank_amort_years" text,
	"equity_contribution" numeric(14, 2),
	"total_assignment_payout" numeric(14, 2),
	"expected_win_percent" integer,
	"current_mortgage_debt" text,
	"current_mortgage_payment" text,
	"current_mortgage_interest_rate" text,
	"current_mortgage_balloon_date" text,
	"status_code" text,
	"dispo_stage" "dispo_stage",
	"deal_priority" "deal_priority",
	"call_disposition" "call_disposition",
	"weekly_offer_review" "weekly_offer_review",
	"recent_activity" "recent_activity_bucket",
	"ready_for_review" boolean DEFAULT false NOT NULL,
	"update_status_ready_for_uw" boolean DEFAULT false NOT NULL,
	"lead_source" "deal_lead_source",
	"bird_dog_id" text,
	"bird_dog_first_name" text,
	"bird_dog_last_name" text,
	"bird_dog_phone" text,
	"bird_dog_email" text,
	"bird_dog_additional_notes" text,
	"bird_dog_shared_drive_url" text,
	"update_to_bird_dog" text,
	"bird_dog_lead_non_rvx" boolean DEFAULT false NOT NULL,
	"marketing_package_url" text,
	"p_and_l_url" text,
	"appraisal_url" text,
	"additional_financials_url" text,
	"additional_financials_url_2" text,
	"additional_file_1_url" text,
	"additional_file_2_url" text,
	"additional_file_3_url" text,
	"rvx_one_pager_url" text,
	"rvx_five_pager_url" text,
	"buyer_level_1_financials_url" text,
	"buyer_full_due_diligence_url" text,
	"data_room_url" text,
	"create_data_room_url" text,
	"emd_due_date" date,
	"emd_amount" numeric(14, 2),
	"emd_deposited" date,
	"escrow_opened" date,
	"inspection_period_end" date,
	"psa_coe_date" date,
	"updated_coe_date_2" date,
	"updated_coe_date_3" date,
	"closer_last_touch" timestamp,
	"escrow_fee_responsibility" "escrow_fee_responsibility",
	"transfer_tax_responsibility" "transfer_tax_responsibility",
	"title_policy_responsibility" "title_policy_responsibility",
	"ai_summary_md" text,
	"shareable_ai_summary" text,
	"acquisition_manager_notes" text,
	"offer_delivery_internal_notes" text,
	"closer_final_notes" text,
	"phase_4_internal_notes" text,
	"phase_5_internal_notes" text,
	"confirmed_buyer_id" text,
	"secondary_buyer_id" text,
	"seller_company_id" text,
	"owner_id" text,
	"ops_owner_id" text,
	"bulk_email_opted_out" boolean DEFAULT false NOT NULL,
	"legacy_ontraport_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by_id" text,
	"last_activity_at" timestamp,
	"last_email_received_at" timestamp,
	"last_email_sent_at" timestamp,
	"last_sms_received_at" timestamp,
	"last_sms_sent_at" timestamp,
	"last_call_logged_at" timestamp,
	"last_note" text,
	"ip_address" text
);
--> statement-breakpoint
CREATE TABLE "loi_rounds" (
	"id" text PRIMARY KEY NOT NULL,
	"deal_id" text NOT NULL,
	"round_number" integer NOT NULL,
	"sent_at" date,
	"accepted_at" date,
	"rejected_at" date,
	"contingent_note" text,
	"contract_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "psa_rounds" (
	"id" text PRIMARY KEY NOT NULL,
	"deal_id" text NOT NULL,
	"round_number" integer NOT NULL,
	"sent_at" date,
	"accepted_at" date,
	"rejected_at" date,
	"contingent_note" text,
	"contract_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "do_next_skips" (
	"user_id" text NOT NULL,
	"item_kind" text NOT NULL,
	"item_id" text NOT NULL,
	"skipped_for_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "do_next_skips_user_id_item_kind_item_id_skipped_for_date_pk" PRIMARY KEY("user_id","item_kind","item_id","skipped_for_date")
);
--> statement-breakpoint
CREATE TABLE "dd_capx_items" (
	"id" text PRIMARY KEY NOT NULL,
	"deal_id" text NOT NULL,
	"type" "dd_capx_type" NOT NULL,
	"description" text,
	"expected_cost" numeric(14, 2),
	"timeline" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dd_checklist_items" (
	"id" text PRIMARY KEY NOT NULL,
	"deal_id" text NOT NULL,
	"section" "dd_checklist_section" NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer NOT NULL,
	"date_ordered" date,
	"scheduled_completion" date,
	"done_at" timestamp,
	"done_by_id" text,
	"notes" text,
	"artifact_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dd_comparables" (
	"id" text PRIMARY KEY NOT NULL,
	"deal_id" text NOT NULL,
	"type" "dd_comparable_type" NOT NULL,
	"name" text,
	"address" text,
	"city" text,
	"state" text,
	"zip" text,
	"phone" text,
	"spaces_or_units" text,
	"rent_low" numeric(10, 2),
	"rent_high" numeric(10, 2),
	"occupied_count" integer,
	"vacant_count" integer,
	"utilities_included" text,
	"move_in_specials" text,
	"sales_price" numeric(12, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dd_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"deal_id" text NOT NULL,
	"category" "dd_contact_category" NOT NULL,
	"role" text NOT NULL,
	"contact_name" text,
	"phone" text,
	"fax" text,
	"email" text,
	"address" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dd_negotiation_items" (
	"id" text PRIMARY KEY NOT NULL,
	"deal_id" text NOT NULL,
	"problem" text NOT NULL,
	"solution" text,
	"estimated_cost" numeric(14, 2),
	"timeline" text,
	"resolved_at" timestamp,
	"resolution" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dd_noi_items" (
	"id" text PRIMARY KEY NOT NULL,
	"deal_id" text NOT NULL,
	"direction" "dd_noi_direction" NOT NULL,
	"item" text NOT NULL,
	"noi_impact" numeric(14, 2),
	"timeline" text,
	"implemented_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dd_park_owned_homes" (
	"id" text PRIMARY KEY NOT NULL,
	"deal_id" text NOT NULL,
	"category" "dd_poh_category" DEFAULT 'park_owned_home' NOT NULL,
	"space_number_or_type" text,
	"status" text,
	"year" text,
	"size" text,
	"condition" text,
	"market_value" numeric(12, 2),
	"list_of_repairs" text,
	"cost_of_repairs" numeric(12, 2),
	"use" text,
	"title_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dd_rent_roll_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"deal_id" text NOT NULL,
	"as_of_date" date DEFAULT now() NOT NULL,
	"space_number" text,
	"resident_name" text,
	"security_deposit" numeric(10, 2),
	"move_in_date" date,
	"delinquent_balance" numeric(10, 2),
	"lot_rent" numeric(10, 2),
	"rental_home_rent" numeric(10, 2),
	"note_payment" numeric(10, 2),
	"other_charges" numeric(10, 2),
	"payments_received" numeric(10, 2),
	"utility_billback" numeric(10, 2),
	"total_due" numeric(10, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dd_walk_throughs" (
	"id" text PRIMARY KEY NOT NULL,
	"deal_id" text NOT NULL,
	"inspected_at" date NOT NULL,
	"inspected_by_id" text,
	"problems_found" text,
	"problems_corrected" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "feedback_kind" NOT NULL,
	"status" "feedback_status" DEFAULT 'new' NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"body" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"internal_notes" text,
	"submitted_by_id" text,
	"resolved_at" timestamp,
	"resolved_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hire_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"candidate_name" text NOT NULL,
	"candidate_email" text,
	"candidate_phone" text,
	"type" "hire_type" DEFAULT 'contractor_1099' NOT NULL,
	"status" "hire_status" DEFAULT 'draft' NOT NULL,
	"category" "hire_category" DEFAULT 'leadership' NOT NULL,
	"for_unit" text,
	"role_title" text,
	"roles_and_duties" text,
	"finance_notes" text,
	"founder_notes" text,
	"requester_final_notes" text,
	"requested_by_id" text,
	"finalized_at" timestamp,
	"withdrawn_at" timestamp,
	"withdrawn_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by_id" text
);
--> statement-breakpoint
CREATE TABLE "bird_dog_statuses" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"group" "bird_dog_status_group" NOT NULL,
	"sort_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"legacy_ontraport_value" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_statuses" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"role" "deal_status_role" NOT NULL,
	"sort_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"legacy_ontraport_value" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"recipient_email" text NOT NULL,
	"subject" text NOT NULL,
	"body_md" text NOT NULL,
	"payload" jsonb,
	"provider_message_id" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"kind" "message_template_kind" DEFAULT 'custom' NOT NULL,
	"subject" text NOT NULL,
	"body_text" text NOT NULL,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role" "user_role" NOT NULL,
	"permission_key" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_role_permission_key_pk" PRIMARY KEY("role","permission_key")
);
--> statement-breakpoint
CREATE TABLE "saved_views" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"scope" text NOT NULL,
	"label" text NOT NULL,
	"params" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_pinned" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"priority" "issue_priority" DEFAULT 'green' NOT NULL,
	"status" "issue_status" DEFAULT 'open' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_by_id" text,
	"assignee_id" text,
	"due_at" timestamp,
	"solved_at" timestamp,
	"solved_by_id" text,
	"solution_summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by_id" text
);
--> statement-breakpoint
CREATE TABLE "ops_content" (
	"scope" text PRIMARY KEY NOT NULL,
	"body_md" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by_id" text
);
--> statement-breakpoint
CREATE TABLE "level10_action_items" (
	"id" text PRIMARY KEY NOT NULL,
	"meeting_date" date NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"body" text NOT NULL,
	"assignee_id" text,
	"completed_at" timestamp,
	"completed_by_id" text,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "level10_meetings" (
	"id" text PRIMARY KEY NOT NULL,
	"meeting_date" date NOT NULL,
	"segue_notes" text,
	"headlines_notes" text,
	"employee_headline_notes" text,
	"conclude_notes" text,
	"rating" integer,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "level10_scorecard_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"meeting_date" date NOT NULL,
	"position" integer NOT NULL,
	"metric" text NOT NULL,
	"target" text NOT NULL,
	"actual_num" integer NOT NULL,
	"format" text NOT NULL,
	"snapshot_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_lead_dispositions" (
	"id" text PRIMARY KEY NOT NULL,
	"raw_lead_id" text NOT NULL,
	"by_user_id" text,
	"outcome" "raw_lead_outcome" NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_lead_skips" (
	"id" text PRIMARY KEY NOT NULL,
	"raw_lead_id" text NOT NULL,
	"by_user_id" text,
	"reason" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_leads" (
	"id" text PRIMARY KEY NOT NULL,
	"park_name" text,
	"street" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"owner_name" text,
	"owner_phone" text,
	"owner_email" text,
	"pads" integer,
	"listing_status" text,
	"source" text,
	"imported_notes" text,
	"raw_data" jsonb,
	"status" "raw_lead_status" DEFAULT 'pool' NOT NULL,
	"claimed_by_id" text,
	"claimed_at" timestamp,
	"call_attempts" integer DEFAULT 0 NOT NULL,
	"last_call_at" timestamp,
	"last_call_by_id" text,
	"converted_deal_id" text,
	"converted_at" timestamp,
	"next_follow_up_at" timestamp,
	"follow_up_cadence_days" integer,
	"follow_up_set_by_id" text,
	"upload_batch_id" text,
	"uploaded_by_id" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reimbursement_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"park_name" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"needed_by" timestamp,
	"item_description" text NOT NULL,
	"reason" text,
	"product_url" text,
	"amount_cents" integer,
	"status" "reimbursement_status" DEFAULT 'pending' NOT NULL,
	"requested_by_id" text,
	"approved_at" timestamp,
	"approved_by_id" text,
	"purchased_at" timestamp,
	"purchased_by_id" text,
	"fulfilled_at" timestamp,
	"fulfilled_by_id" text,
	"declined_at" timestamp,
	"declined_by_id" text,
	"decline_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by_id" text
);
--> statement-breakpoint
CREATE TABLE "pool_distributions" (
	"id" text PRIMARY KEY NOT NULL,
	"quarter" text NOT NULL,
	"total_cents" integer NOT NULL,
	"split" jsonb NOT NULL,
	"notes" text,
	"recorded_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pool_members" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"seat_start_at" date NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"added_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_list_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"scope" text NOT NULL,
	"columns" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note_mentions" ADD CONSTRAINT "note_mentions_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_mentions" ADD CONSTRAINT "note_mentions_mentioned_user_id_user_id_fk" FOREIGN KEY ("mentioned_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_completed_by_id_user_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bd_exit_surveys" ADD CONSTRAINT "bd_exit_surveys_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bird_dogs" ADD CONSTRAINT "bird_dogs_status_code_bird_dog_statuses_code_fk" FOREIGN KEY ("status_code") REFERENCES "public"."bird_dog_statuses"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bird_dogs" ADD CONSTRAINT "bird_dogs_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bird_dogs" ADD CONSTRAINT "bird_dogs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bird_dogs" ADD CONSTRAINT "bird_dogs_deleted_by_id_user_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_rocks" ADD CONSTRAINT "command_rocks_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_rocks" ADD CONSTRAINT "command_rocks_done_by_id_user_id_fk" FOREIGN KEY ("done_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_deleted_by_id_user_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_deleted_by_id_user_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_briefs" ADD CONSTRAINT "daily_briefs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aa_rounds" ADD CONSTRAINT "aa_rounds_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_status_code_deal_statuses_code_fk" FOREIGN KEY ("status_code") REFERENCES "public"."deal_statuses"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_bird_dog_id_bird_dogs_id_fk" FOREIGN KEY ("bird_dog_id") REFERENCES "public"."bird_dogs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_confirmed_buyer_id_contacts_id_fk" FOREIGN KEY ("confirmed_buyer_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_secondary_buyer_id_contacts_id_fk" FOREIGN KEY ("secondary_buyer_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_seller_company_id_companies_id_fk" FOREIGN KEY ("seller_company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_ops_owner_id_user_id_fk" FOREIGN KEY ("ops_owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_deleted_by_id_user_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loi_rounds" ADD CONSTRAINT "loi_rounds_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "psa_rounds" ADD CONSTRAINT "psa_rounds_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "do_next_skips" ADD CONSTRAINT "do_next_skips_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dd_capx_items" ADD CONSTRAINT "dd_capx_items_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dd_checklist_items" ADD CONSTRAINT "dd_checklist_items_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dd_checklist_items" ADD CONSTRAINT "dd_checklist_items_done_by_id_user_id_fk" FOREIGN KEY ("done_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dd_comparables" ADD CONSTRAINT "dd_comparables_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dd_contacts" ADD CONSTRAINT "dd_contacts_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dd_negotiation_items" ADD CONSTRAINT "dd_negotiation_items_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dd_noi_items" ADD CONSTRAINT "dd_noi_items_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dd_park_owned_homes" ADD CONSTRAINT "dd_park_owned_homes_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dd_rent_roll_entries" ADD CONSTRAINT "dd_rent_roll_entries_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dd_walk_throughs" ADD CONSTRAINT "dd_walk_throughs_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dd_walk_throughs" ADD CONSTRAINT "dd_walk_throughs_inspected_by_id_user_id_fk" FOREIGN KEY ("inspected_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD CONSTRAINT "feedback_submissions_submitted_by_id_user_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD CONSTRAINT "feedback_submissions_resolved_by_id_user_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hire_requests" ADD CONSTRAINT "hire_requests_requested_by_id_user_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hire_requests" ADD CONSTRAINT "hire_requests_deleted_by_id_user_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_solved_by_id_user_id_fk" FOREIGN KEY ("solved_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_deleted_by_id_user_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops_content" ADD CONSTRAINT "ops_content_updated_by_id_user_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level10_action_items" ADD CONSTRAINT "level10_action_items_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level10_action_items" ADD CONSTRAINT "level10_action_items_completed_by_id_user_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level10_action_items" ADD CONSTRAINT "level10_action_items_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level10_meetings" ADD CONSTRAINT "level10_meetings_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_lead_dispositions" ADD CONSTRAINT "raw_lead_dispositions_raw_lead_id_raw_leads_id_fk" FOREIGN KEY ("raw_lead_id") REFERENCES "public"."raw_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_lead_dispositions" ADD CONSTRAINT "raw_lead_dispositions_by_user_id_user_id_fk" FOREIGN KEY ("by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_lead_skips" ADD CONSTRAINT "raw_lead_skips_raw_lead_id_raw_leads_id_fk" FOREIGN KEY ("raw_lead_id") REFERENCES "public"."raw_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_lead_skips" ADD CONSTRAINT "raw_lead_skips_by_user_id_user_id_fk" FOREIGN KEY ("by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_leads" ADD CONSTRAINT "raw_leads_claimed_by_id_user_id_fk" FOREIGN KEY ("claimed_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_leads" ADD CONSTRAINT "raw_leads_last_call_by_id_user_id_fk" FOREIGN KEY ("last_call_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_leads" ADD CONSTRAINT "raw_leads_converted_deal_id_deals_id_fk" FOREIGN KEY ("converted_deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_leads" ADD CONSTRAINT "raw_leads_follow_up_set_by_id_user_id_fk" FOREIGN KEY ("follow_up_set_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_leads" ADD CONSTRAINT "raw_leads_uploaded_by_id_user_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_leads" ADD CONSTRAINT "raw_leads_deleted_by_id_user_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_requested_by_id_user_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_approved_by_id_user_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_purchased_by_id_user_id_fk" FOREIGN KEY ("purchased_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_fulfilled_by_id_user_id_fk" FOREIGN KEY ("fulfilled_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_declined_by_id_user_id_fk" FOREIGN KEY ("declined_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_deleted_by_id_user_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_distributions" ADD CONSTRAINT "pool_distributions_recorded_by_id_user_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_members" ADD CONSTRAINT "pool_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_members" ADD CONSTRAINT "pool_members_added_by_id_user_id_fk" FOREIGN KEY ("added_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_list_preferences" ADD CONSTRAINT "user_list_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "note_mentions_for_user_idx" ON "note_mentions" USING btree ("mentioned_user_id","read_at","created_at");--> statement-breakpoint
CREATE INDEX "note_mentions_note_idx" ON "note_mentions" USING btree ("note_id");--> statement-breakpoint
CREATE INDEX "notes_parent_idx" ON "notes" USING btree ("parent_table","parent_id","created_at");--> statement-breakpoint
CREATE INDEX "notes_author_idx" ON "notes" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "notes_legacy_idx" ON "notes" USING btree ("legacy_ontraport_id");--> statement-breakpoint
CREATE INDEX "tasks_parent_idx" ON "tasks" USING btree ("parent_table","parent_id","due_at");--> statement-breakpoint
CREATE INDEX "tasks_assignee_open_idx" ON "tasks" USING btree ("assignee_id","completed_at","due_at");--> statement-breakpoint
CREATE INDEX "tasks_due_idx" ON "tasks" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "announcements_feed_idx" ON "announcements" USING btree ("deleted_at","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_log_created_at_idx" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_log_actor_idx" ON "admin_audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "bd_exit_surveys_recent_idx" ON "bd_exit_surveys" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bird_dogs_email_idx" ON "bird_dogs" USING btree ("email");--> statement-breakpoint
CREATE INDEX "bird_dogs_status_idx" ON "bird_dogs" USING btree ("status_code");--> statement-breakpoint
CREATE INDEX "bird_dogs_owner_idx" ON "bird_dogs" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "bird_dogs_legacy_idx" ON "bird_dogs" USING btree ("legacy_ontraport_id");--> statement-breakpoint
CREATE INDEX "command_rocks_assignee_idx" ON "command_rocks" USING btree ("assignee_id","period","position");--> statement-breakpoint
CREATE INDEX "contacts_email_idx" ON "contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "contacts_status_idx" ON "contacts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contacts_qual_tier_idx" ON "contacts" USING btree ("qualification_tier");--> statement-breakpoint
CREATE INDEX "contacts_owner_idx" ON "contacts" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "contacts_legacy_idx" ON "contacts" USING btree ("legacy_ontraport_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_briefs_user_date_idx" ON "daily_briefs" USING btree ("user_id","for_date");--> statement-breakpoint
CREATE INDEX "deals_status_idx" ON "deals" USING btree ("status_code");--> statement-breakpoint
CREATE INDEX "deals_park_state_idx" ON "deals" USING btree ("park_state");--> statement-breakpoint
CREATE INDEX "deals_priority_idx" ON "deals" USING btree ("deal_priority");--> statement-breakpoint
CREATE INDEX "deals_closer_last_touch_idx" ON "deals" USING btree ("closer_last_touch");--> statement-breakpoint
CREATE INDEX "deals_owner_idx" ON "deals" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "deals_confirmed_buyer_idx" ON "deals" USING btree ("confirmed_buyer_id");--> statement-breakpoint
CREATE INDEX "deals_seller_company_idx" ON "deals" USING btree ("seller_company_id");--> statement-breakpoint
CREATE INDEX "deals_bird_dog_idx" ON "deals" USING btree ("bird_dog_id");--> statement-breakpoint
CREATE INDEX "deals_legacy_idx" ON "deals" USING btree ("legacy_ontraport_id");--> statement-breakpoint
CREATE INDEX "dd_capx_deal_idx" ON "dd_capx_items" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "dd_checklist_deal_idx" ON "dd_checklist_items" USING btree ("deal_id","sort_order");--> statement-breakpoint
CREATE INDEX "dd_comparable_deal_idx" ON "dd_comparables" USING btree ("deal_id","type");--> statement-breakpoint
CREATE INDEX "dd_contacts_deal_idx" ON "dd_contacts" USING btree ("deal_id","category");--> statement-breakpoint
CREATE INDEX "dd_neg_deal_idx" ON "dd_negotiation_items" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "dd_noi_deal_idx" ON "dd_noi_items" USING btree ("deal_id","direction");--> statement-breakpoint
CREATE INDEX "dd_poh_deal_idx" ON "dd_park_owned_homes" USING btree ("deal_id","category");--> statement-breakpoint
CREATE INDEX "dd_rent_roll_deal_idx" ON "dd_rent_roll_entries" USING btree ("deal_id","as_of_date");--> statement-breakpoint
CREATE INDEX "dd_walk_deal_idx" ON "dd_walk_throughs" USING btree ("deal_id","inspected_at");--> statement-breakpoint
CREATE INDEX "feedback_queue_idx" ON "feedback_submissions" USING btree ("status","position");--> statement-breakpoint
CREATE INDEX "feedback_status_idx" ON "feedback_submissions" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "hire_requests_status_idx" ON "hire_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "hire_requests_requester_idx" ON "hire_requests" USING btree ("requested_by_id");--> statement-breakpoint
CREATE INDEX "hire_requests_category_idx" ON "hire_requests" USING btree ("category","status");--> statement-breakpoint
CREATE INDEX "saved_views_user_scope_idx" ON "saved_views" USING btree ("user_id","scope","sort_order");--> statement-breakpoint
CREATE INDEX "issues_lanes_idx" ON "issues" USING btree ("status","priority","position");--> statement-breakpoint
CREATE INDEX "issues_assignee_idx" ON "issues" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "level10_action_by_meeting_idx" ON "level10_action_items" USING btree ("meeting_date","position");--> statement-breakpoint
CREATE INDEX "level10_action_by_assignee_idx" ON "level10_action_items" USING btree ("assignee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "level10_meeting_date_unique" ON "level10_meetings" USING btree ("meeting_date");--> statement-breakpoint
CREATE INDEX "level10_meeting_by_date_idx" ON "level10_meetings" USING btree ("meeting_date");--> statement-breakpoint
CREATE UNIQUE INDEX "level10_snap_by_date_pos_unique" ON "level10_scorecard_snapshots" USING btree ("meeting_date","position");--> statement-breakpoint
CREATE INDEX "level10_snap_by_meeting_idx" ON "level10_scorecard_snapshots" USING btree ("meeting_date");--> statement-breakpoint
CREATE INDEX "raw_lead_disp_lead_idx" ON "raw_lead_dispositions" USING btree ("raw_lead_id","created_at");--> statement-breakpoint
CREATE INDEX "raw_lead_disp_by_user_idx" ON "raw_lead_dispositions" USING btree ("by_user_id","created_at");--> statement-breakpoint
CREATE INDEX "raw_lead_skips_by_user_idx" ON "raw_lead_skips" USING btree ("by_user_id","created_at");--> statement-breakpoint
CREATE INDEX "raw_lead_skips_lead_idx" ON "raw_lead_skips" USING btree ("raw_lead_id");--> statement-breakpoint
CREATE INDEX "raw_leads_pool_idx" ON "raw_leads" USING btree ("status","call_attempts","created_at");--> statement-breakpoint
CREATE INDEX "raw_leads_claimed_idx" ON "raw_leads" USING btree ("claimed_by_id","status");--> statement-breakpoint
CREATE INDEX "raw_leads_address_idx" ON "raw_leads" USING btree ("street","city","state");--> statement-breakpoint
CREATE INDEX "raw_leads_batch_idx" ON "raw_leads" USING btree ("upload_batch_id");--> statement-breakpoint
CREATE INDEX "raw_leads_follow_up_idx" ON "raw_leads" USING btree ("last_call_by_id","next_follow_up_at");--> statement-breakpoint
CREATE INDEX "reimbursement_requests_status_idx" ON "reimbursement_requests" USING btree ("status","requested_at");--> statement-breakpoint
CREATE INDEX "reimbursement_requests_requester_idx" ON "reimbursement_requests" USING btree ("requested_by_id");--> statement-breakpoint
CREATE INDEX "pool_distributions_recent_idx" ON "pool_distributions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pool_members_user_idx" ON "pool_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_list_preferences_user_scope_idx" ON "user_list_preferences" USING btree ("user_id","scope");