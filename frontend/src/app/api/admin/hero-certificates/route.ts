import { NextRequest, NextResponse } from "next/server";
import { isAdminWallet } from "@/lib/admin-wallets";
import { sendHeroCertificateEmail, getCertificateSender } from "@/lib/certificate-email";
import { generateHeroCertificatePdf } from "@/lib/hero-certificate";
import { getRoleBadgeSummary } from "@/lib/role-nft";
import { createAdminClient } from "@/lib/supabase/admin";
import { walletSessionMatches } from "@/lib/wallet-session";

const certificateFields =
  "id, donor_id, certificate_number, issued_at, sent_at, delivery_status, emailed_to, delivery_error";

function createCertificateNumber() {
  const year = new Date().getUTCFullYear();
  return `PCH-HERO-${year}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  let certificateId: string | null = null;
  const supabase = createAdminClient();

  try {
    const body = (await request.json()) as { walletAddress?: string; donorId?: string };
    const walletAddress = String(body.walletAddress ?? "").trim();
    const donorId = String(body.donorId ?? "").trim();

    if (!walletSessionMatches(request, walletAddress)) {
      return NextResponse.json({ message: "Wallet authentication is required." }, { status: 401 });
    }
    if (!(await isAdminWallet(walletAddress))) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }
    if (!donorId) {
      return NextResponse.json({ message: "Donor is required." }, { status: 400 });
    }

    const { data: donor, error: donorError } = await supabase
      .from("profiles")
      .select("id, role, full_name, email, wallet_address, account_status")
      .eq("id", donorId)
      .eq("role", "donor")
      .maybeSingle();

    if (donorError) throw donorError;
    if (!donor || donor.account_status !== "active") {
      return NextResponse.json({ message: "Active donor account not found." }, { status: 404 });
    }
    if (!donor.wallet_address) {
      return NextResponse.json({ message: "The donor does not have a wallet address." }, { status: 400 });
    }
    if (!donor.email || !validEmail(donor.email)) {
      return NextResponse.json({ message: "The donor does not have a valid email address." }, { status: 400 });
    }

    const badge = await getRoleBadgeSummary(donor.wallet_address);
    if (badge.donorLevel !== "hero") {
      return NextResponse.json({ message: "This donor has not achieved Hero Donor status." }, { status: 409 });
    }

    const { data: existing, error: existingError } = await supabase
      .from("hero_certificates")
      .select(certificateFields)
      .eq("donor_id", donor.id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing?.delivery_status === "sent" && existing.sent_at) {
      return NextResponse.json(
        { message: "This Hero Donor certificate has already been sent." },
        { status: 409 },
      );
    }
    if (existing?.delivery_status === "sending") {
      return NextResponse.json({ message: "This certificate is already being sent." }, { status: 409 });
    }

    const certificateNumber = existing?.certificate_number ?? createCertificateNumber();
    const issuedAt = existing?.issued_at ? new Date(existing.issued_at) : new Date();
    const sender = getCertificateSender();

    if (existing) {
      certificateId = existing.id;
      const { error } = await supabase
        .from("hero_certificates")
        .update({
          donor_name: donor.full_name || "Hero Donor",
          donor_email: donor.email,
          donor_wallet_address: donor.wallet_address,
          issued_by_wallet: walletAddress.toLowerCase(),
          emailed_from: sender.email,
          emailed_to: donor.email,
          delivery_status: "sending",
          delivery_error: null,
        })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { data: created, error } = await supabase
        .from("hero_certificates")
        .insert({
          donor_id: donor.id,
          certificate_number: certificateNumber,
          donor_name: donor.full_name || "Hero Donor",
          donor_email: donor.email,
          donor_wallet_address: donor.wallet_address,
          badge_level: "hero",
          achieved_at: new Date().toISOString(),
          issued_by_wallet: walletAddress.toLowerCase(),
          emailed_from: sender.email,
          emailed_to: donor.email,
          delivery_status: "sending",
        })
        .select(certificateFields)
        .single();
      if (error) throw error;
      certificateId = created.id;
    }

    const pdf = await generateHeroCertificatePdf({
      certificateNumber,
      donorName: donor.full_name || "Hero Donor",
      donorWalletAddress: donor.wallet_address,
      issuedAt,
    });
    const delivery = await sendHeroCertificateEmail({
      recipientEmail: donor.email,
      recipientName: donor.full_name || "Hero Donor",
      certificateNumber,
      pdf,
    });

    const sentAt = new Date().toISOString();
    const { data: certificate, error: updateError } = await supabase
      .from("hero_certificates")
      .update({
        delivery_status: "sent",
        sent_at: sentAt,
        emailed_from: delivery.sender,
        emailed_to: donor.email,
        provider_message_id: delivery.providerMessageId,
        delivery_error: null,
      })
      .eq("id", certificateId)
      .select(certificateFields)
      .single();
    if (updateError) throw updateError;

    return NextResponse.json({ certificate, message: `Certificate sent to ${donor.email}.` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send the certificate.";
    if (certificateId) {
      await supabase
        .from("hero_certificates")
        .update({ delivery_status: "failed", delivery_error: message })
        .eq("id", certificateId);
    }
    return NextResponse.json({ message }, { status: 500 });
  }
}
