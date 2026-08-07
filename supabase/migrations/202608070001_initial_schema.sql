--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;

--
-- Name: campaign_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.campaign_status AS ENUM (
    'active',
    'completed',
    'closed',
    'cancelled'
);


--
-- Name: campaign_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.campaign_status_enum AS ENUM (
    'pending_approval',
    'active',
    'rejected',
    'completed',
    'closed'
);


--
-- Name: milestone_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.milestone_status_enum AS ENUM (
    'pending',
    'submitted',
    'approved',
    'rejected'
);


--
-- Name: shelter_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.shelter_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: urgency_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.urgency_level AS ENUM (
    'medium',
    'high',
    'critical'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'donor',
    'shelter',
    'admin'
);


--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(user_id uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role = 'admin'
  );
$$;


--
-- Name: set_hero_certificates_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_hero_certificates_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: wallet_address_exists(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_address_exists(wallet_address_input text) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles
    where lower(wallet_address) = lower(wallet_address_input)
  );
$$;


--
-- Name: wallet_profile_lookup(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_profile_lookup(wallet_address_input text) RETURNS TABLE(role public.user_role, email public.citext, full_name text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select p.role, p.email, p.full_name
  from public.profiles p
  where lower(p.wallet_address) = lower(wallet_address_input)
  limit 1;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_profiles (
    user_id uuid NOT NULL,
    admin_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: campaign_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    requirement text NOT NULL,
    percentage integer NOT NULL,
    status public.milestone_status_enum DEFAULT 'pending'::public.milestone_status_enum NOT NULL,
    proof_url text,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    on_chain_index integer NOT NULL,
    proof_cid text,
    proof_tx_hash text,
    review_tx_hash text,
    release_tx_hash text,
    CONSTRAINT campaign_milestones_on_chain_index_nonnegative CHECK ((on_chain_index >= 0)),
    CONSTRAINT campaign_milestones_percentage_check CHECK (((percentage > 0) AND (percentage <= 100)))
);


--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shelter_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    goal_amount numeric(12,2) NOT NULL,
    current_amount numeric(12,2) DEFAULT 0 NOT NULL,
    urgency_level text DEFAULT 'medium'::text NOT NULL,
    campaign_status public.campaign_status_enum DEFAULT 'pending_approval'::public.campaign_status_enum NOT NULL,
    duration_days integer NOT NULL,
    image_url text,
    contract_address text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    rejection_reason text,
    goal_wei text,
    chain_id bigint,
    factory_address text,
    deployment_tx_hash text,
    on_chain_campaign_key text,
    eth_myr_rate numeric,
    blockchain_deadline timestamp with time zone,
    cancellation_tx_hash text,
    cancelled_at timestamp with time zone,
    cancelled_by uuid,
    CONSTRAINT campaigns_cancellation_tx_hash_format CHECK (((cancellation_tx_hash IS NULL) OR (cancellation_tx_hash ~ '^0x[0-9a-fA-F]{64}$'::text))),
    CONSTRAINT campaigns_duration_days_check CHECK ((duration_days = ANY (ARRAY[30, 60, 90]))),
    CONSTRAINT campaigns_goal_amount_check CHECK ((goal_amount > (0)::numeric)),
    CONSTRAINT campaigns_urgency_level_check CHECK ((urgency_level = ANY (ARRAY['medium'::text, 'high'::text, 'critical'::text])))
);


--
-- Name: donations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    donor_id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    amount numeric NOT NULL,
    currency text DEFAULT 'MYR'::text NOT NULL,
    tx_hash text NOT NULL,
    status text DEFAULT 'confirmed'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    amount_wei text,
    contract_address text,
    refund_tx_hash text,
    refunded_at timestamp with time zone,
    CONSTRAINT donations_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT donations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'failed'::text, 'refunded'::text])))
);


--
-- Name: donor_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donor_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    donor_id uuid NOT NULL,
    campaign_id uuid,
    title text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'info'::text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT donor_notifications_status_check CHECK ((status = ANY (ARRAY['info'::text, 'success'::text, 'warning'::text, 'urgent'::text])))
);


--
-- Name: donor_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donor_profiles (
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: donor_saved_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donor_saved_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    donor_id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: donor_support_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donor_support_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    donor_id uuid NOT NULL,
    campaign_id uuid,
    shelter_id uuid,
    request_type text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_response text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT donor_support_requests_request_type_check CHECK ((request_type = ANY (ARRAY['general_question'::text, 'campaign_report'::text, 'shelter_report'::text, 'donation_issue'::text, 'milestone_concern'::text, 'misuse_of_funds'::text, 'other'::text]))),
    CONSTRAINT donor_support_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'reviewing'::text, 'resolved'::text, 'rejected'::text])))
);


--
-- Name: hero_certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hero_certificates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    donor_id uuid NOT NULL,
    certificate_number text NOT NULL,
    donor_name text NOT NULL,
    donor_email text NOT NULL,
    donor_wallet_address text,
    badge_level text DEFAULT 'hero'::text NOT NULL,
    achieved_at timestamp with time zone,
    issued_by_wallet text NOT NULL,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    certificate_storage_path text,
    emailed_from text,
    emailed_to text,
    sent_at timestamp with time zone,
    delivery_status text DEFAULT 'draft'::text NOT NULL,
    provider_message_id text,
    delivery_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT hero_certificates_badge_level_check CHECK ((badge_level = 'hero'::text)),
    CONSTRAINT hero_certificates_delivery_status_check CHECK ((delivery_status = ANY (ARRAY['draft'::text, 'sending'::text, 'sent'::text, 'failed'::text]))),
    CONSTRAINT hero_certificates_sent_fields_check CHECK (((delivery_status <> 'sent'::text) OR ((sent_at IS NOT NULL) AND (emailed_from IS NOT NULL) AND (emailed_to IS NOT NULL))))
);


--
-- Name: TABLE hero_certificates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.hero_certificates IS 'Tracks one emailed Hero Donor certificate per donor.';


--
-- Name: COLUMN hero_certificates.delivery_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hero_certificates.delivery_status IS 'Certificate email state: draft, sending, sent, or failed.';


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    role public.user_role NOT NULL,
    full_name text NOT NULL,
    email public.citext NOT NULL,
    wallet_address text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    account_status text DEFAULT 'active'::text NOT NULL,
    deactivation_reason text,
    deactivated_at timestamp with time zone,
    deactivated_by uuid,
    CONSTRAINT profiles_account_status_check CHECK ((account_status = ANY (ARRAY['active'::text, 'deactivated'::text])))
);


--
-- Name: shelter_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shelter_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    shelter_name text NOT NULL,
    registration_id text NOT NULL,
    contact_phone text NOT NULL,
    website_url text,
    shelter_address text NOT NULL,
    organization_description text NOT NULL,
    proof_document_path text,
    status public.shelter_status DEFAULT 'pending'::public.shelter_status NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shelter_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shelter_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shelter_id uuid NOT NULL,
    campaign_id uuid,
    event_key text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'info'::text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT shelter_notifications_status_check CHECK ((status = ANY (ARRAY['info'::text, 'success'::text, 'warning'::text, 'urgent'::text])))
);


--
-- Name: shelter_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shelter_profiles (
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    shelter_image_url text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_profiles admin_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_profiles
    ADD CONSTRAINT admin_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: campaign_milestones campaign_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_milestones
    ADD CONSTRAINT campaign_milestones_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: donations donations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT donations_pkey PRIMARY KEY (id);


--
-- Name: donations donations_tx_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT donations_tx_hash_key UNIQUE (tx_hash);


--
-- Name: donor_notifications donor_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donor_notifications
    ADD CONSTRAINT donor_notifications_pkey PRIMARY KEY (id);


--
-- Name: donor_profiles donor_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donor_profiles
    ADD CONSTRAINT donor_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: donor_saved_campaigns donor_saved_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donor_saved_campaigns
    ADD CONSTRAINT donor_saved_campaigns_pkey PRIMARY KEY (id);


--
-- Name: donor_saved_campaigns donor_saved_campaigns_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donor_saved_campaigns
    ADD CONSTRAINT donor_saved_campaigns_unique UNIQUE (donor_id, campaign_id);


--
-- Name: donor_support_requests donor_support_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donor_support_requests
    ADD CONSTRAINT donor_support_requests_pkey PRIMARY KEY (id);


--
-- Name: hero_certificates hero_certificates_certificate_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hero_certificates
    ADD CONSTRAINT hero_certificates_certificate_number_key UNIQUE (certificate_number);


--
-- Name: hero_certificates hero_certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hero_certificates
    ADD CONSTRAINT hero_certificates_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_wallet_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_wallet_address_key UNIQUE (wallet_address);


--
-- Name: shelter_applications shelter_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shelter_applications
    ADD CONSTRAINT shelter_applications_pkey PRIMARY KEY (id);


--
-- Name: shelter_applications shelter_applications_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shelter_applications
    ADD CONSTRAINT shelter_applications_user_id_key UNIQUE (user_id);


--
-- Name: shelter_notifications shelter_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shelter_notifications
    ADD CONSTRAINT shelter_notifications_pkey PRIMARY KEY (id);


--
-- Name: shelter_notifications shelter_notifications_shelter_id_event_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shelter_notifications
    ADD CONSTRAINT shelter_notifications_shelter_id_event_key_key UNIQUE (shelter_id, event_key);


--
-- Name: shelter_profiles shelter_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shelter_profiles
    ADD CONSTRAINT shelter_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: campaign_milestones_campaign_on_chain_index_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX campaign_milestones_campaign_on_chain_index_unique ON public.campaign_milestones USING btree (campaign_id, on_chain_index);


--
-- Name: campaigns_deployment_tx_hash_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX campaigns_deployment_tx_hash_unique ON public.campaigns USING btree (lower(deployment_tx_hash)) WHERE (deployment_tx_hash IS NOT NULL);


--
-- Name: donations_refund_tx_hash_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX donations_refund_tx_hash_unique ON public.donations USING btree (lower(refund_tx_hash)) WHERE (refund_tx_hash IS NOT NULL);


--
-- Name: donations_tx_hash_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX donations_tx_hash_unique ON public.donations USING btree (lower(tx_hash));


--
-- Name: hero_certificates_delivery_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hero_certificates_delivery_status_idx ON public.hero_certificates USING btree (delivery_status, created_at DESC);


--
-- Name: hero_certificates_donor_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX hero_certificates_donor_id_unique ON public.hero_certificates USING btree (donor_id);


--
-- Name: profiles_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profiles_role_idx ON public.profiles USING btree (role);


--
-- Name: profiles_wallet_address_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profiles_wallet_address_idx ON public.profiles USING btree (wallet_address);


--
-- Name: shelter_applications_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shelter_applications_status_idx ON public.shelter_applications USING btree (status);


--
-- Name: shelter_notifications_shelter_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shelter_notifications_shelter_created_idx ON public.shelter_notifications USING btree (shelter_id, created_at DESC);


--
-- Name: shelter_notifications_visible_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shelter_notifications_visible_idx ON public.shelter_notifications USING btree (shelter_id, created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: hero_certificates hero_certificates_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER hero_certificates_set_updated_at BEFORE UPDATE ON public.hero_certificates FOR EACH ROW EXECUTE FUNCTION public.set_hero_certificates_updated_at();


--
-- Name: profiles profiles_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: shelter_applications shelter_applications_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER shelter_applications_set_updated_at BEFORE UPDATE ON public.shelter_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: admin_profiles admin_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_profiles
    ADD CONSTRAINT admin_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: campaign_milestones campaign_milestones_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_milestones
    ADD CONSTRAINT campaign_milestones_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaigns campaigns_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.profiles(id);


--
-- Name: campaigns campaigns_shelter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_shelter_id_fkey FOREIGN KEY (shelter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: donations donations_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT donations_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: donations donations_donor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT donations_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES public.profiles(id);


--
-- Name: donor_notifications donor_notifications_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donor_notifications
    ADD CONSTRAINT donor_notifications_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: donor_notifications donor_notifications_donor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donor_notifications
    ADD CONSTRAINT donor_notifications_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES public.profiles(id);


--
-- Name: donor_profiles donor_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donor_profiles
    ADD CONSTRAINT donor_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: donor_saved_campaigns donor_saved_campaigns_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donor_saved_campaigns
    ADD CONSTRAINT donor_saved_campaigns_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: donor_saved_campaigns donor_saved_campaigns_donor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donor_saved_campaigns
    ADD CONSTRAINT donor_saved_campaigns_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES public.profiles(id);


--
-- Name: donor_support_requests donor_support_requests_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donor_support_requests
    ADD CONSTRAINT donor_support_requests_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: donor_support_requests donor_support_requests_donor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donor_support_requests
    ADD CONSTRAINT donor_support_requests_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES public.profiles(id);


--
-- Name: donor_support_requests donor_support_requests_shelter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donor_support_requests
    ADD CONSTRAINT donor_support_requests_shelter_id_fkey FOREIGN KEY (shelter_id) REFERENCES public.profiles(id);


--
-- Name: hero_certificates hero_certificates_donor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hero_certificates
    ADD CONSTRAINT hero_certificates_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_deactivated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_deactivated_by_fkey FOREIGN KEY (deactivated_by) REFERENCES public.profiles(id);


--
-- Name: shelter_applications shelter_applications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shelter_applications
    ADD CONSTRAINT shelter_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);


--
-- Name: shelter_applications shelter_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shelter_applications
    ADD CONSTRAINT shelter_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: shelter_notifications shelter_notifications_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shelter_notifications
    ADD CONSTRAINT shelter_notifications_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: shelter_notifications shelter_notifications_shelter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shelter_notifications
    ADD CONSTRAINT shelter_notifications_shelter_id_fkey FOREIGN KEY (shelter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: shelter_profiles shelter_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shelter_profiles
    ADD CONSTRAINT shelter_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: admin_profiles Admins can insert own admin profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert own admin profile" ON public.admin_profiles FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: shelter_applications Admins can review shelter applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can review shelter applications" ON public.shelter_applications FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: admin_profiles Admins can view admin profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view admin profiles" ON public.admin_profiles FOR SELECT USING (((user_id = auth.uid()) OR public.is_admin(auth.uid())));


--
-- Name: donor_profiles Donors can insert own donor profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Donors can insert own donor profile" ON public.donor_profiles FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: donor_profiles Donors can view own donor profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Donors can view own donor profile" ON public.donor_profiles FOR SELECT USING (((user_id = auth.uid()) OR public.is_admin(auth.uid())));


--
-- Name: shelter_applications Shelters can submit own application; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shelters can submit own application" ON public.shelter_applications FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: shelter_applications Shelters can update own pending application; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shelters can update own pending application" ON public.shelter_applications FOR UPDATE USING (((user_id = auth.uid()) AND (status = 'pending'::public.shelter_status))) WITH CHECK ((user_id = auth.uid()));


--
-- Name: shelter_applications Shelters can view own application; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shelters can view own application" ON public.shelter_applications FOR SELECT USING (((user_id = auth.uid()) OR public.is_admin(auth.uid())));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((id = auth.uid()));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (((id = auth.uid()) OR public.is_admin(auth.uid())));


--
-- Name: admin_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: campaign_milestones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.campaign_milestones ENABLE ROW LEVEL SECURITY;

--
-- Name: campaigns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

--
-- Name: donations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

--
-- Name: donor_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.donor_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: donor_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.donor_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: donor_saved_campaigns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.donor_saved_campaigns ENABLE ROW LEVEL SECURITY;

--
-- Name: donor_support_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.donor_support_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: hero_certificates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hero_certificates ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: shelter_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shelter_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: shelter_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shelter_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: shelter_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shelter_profiles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


