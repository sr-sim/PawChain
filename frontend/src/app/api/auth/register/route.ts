import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Role = "donor" | "shelter" | "admin";

function readText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function isRole(value: string): value is Role {
  return value === "donor" || value === "shelter" || value === "admin";
}

function getErrorFields(error: unknown) {
  if (error instanceof Error) {
    const extra = error as Error & {
      code?: string;
      details?: string;
    };

    return {
      message: error.message,
      code: extra.code,
      details: extra.details,
    };
  }

  if (typeof error === "object" && error !== null) {
    const extra = error as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
    };

    return {
      message:
        typeof extra.message === "string" ? extra.message : "Unable to create account.",
      code: typeof extra.code === "string" ? extra.code : undefined,
      details: typeof extra.details === "string" ? extra.details : undefined,
    };
  }

  return {
    message: "Unable to create account.",
    code: undefined,
    details: undefined,
  };
}

function getRegisterError(error: unknown) {
  const { message: rawMessage, code, details: rawDetails } = getErrorFields(error);
  const message = rawMessage.toLowerCase();
  const details = String(rawDetails ?? "").toLowerCase();

  if (message.includes("rate limit")) {
    return {
      message:
        "Supabase signup email limit reached. Please wait a while, then try again with a new email.",
      status: 429,
    };
  }

  if (
    message.includes("already registered") ||
    message.includes("user already exists") ||
    message.includes("email already")
  ) {
    return {
      message:
        "This email already has a PawChain account. Please login instead.",
      status: 409,
    };
  }

  if (
    code === "23505" &&
    (message.includes("wallet") ||
      message.includes("profiles_wallet_address") ||
      details.includes("wallet"))
  ) {
    return {
      message:
        "This connected wallet is already linked to another PawChain account. Please connect a different wallet to register.",
      status: 409,
    };
  }

  if (
    code === "23505" &&
    (message.includes("email") || details.includes("email"))
  ) {
    return {
      message:
        "This email already has a PawChain account. Please login instead.",
      status: 409,
    };
  }

  if (message.includes("password")) {
    return {
      message:
        "Password is not accepted. Please use at least 6 characters.",
      status: 400,
    };
  }

  return { message: rawMessage || "Unable to create account.", status: 500 };
}

async function walletAlreadyExists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  walletAddress: string,
) {
  const normalizedWallet = walletAddress.toLowerCase();

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "wallet_address_exists",
    {
      wallet_address_input: normalizedWallet,
    },
  );

  if (!rpcError) {
    return Boolean(rpcResult);
  }

  const { data: existingWalletProfile } = await supabase
    .from("profiles")
    .select("id")
    .ilike("wallet_address", walletAddress)
    .maybeSingle();

  return Boolean(existingWalletProfile);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const formData = await request.formData();

  const role = readText(formData, "role");
  const fullName = readText(formData, "fullName");
  const email = readText(formData, "email");
  const password = readText(formData, "password");
  const confirmPassword = readText(formData, "confirmPassword");
  const walletAddress = readText(formData, "walletAddress");

  try {
    if (!isRole(role)) {
      return NextResponse.json(
        { message: "Invalid role selected." },
        { status: 400 },
      );
    }

    if (role === "admin") {
      return NextResponse.json(
        { message: "Admin accounts cannot be created from this form." },
        { status: 403 },
      );
    }

    if (!walletAddress) {
      return NextResponse.json(
        { message: "Wallet is not connected." },
        { status: 400 },
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { message: "Passwords do not match." },
        { status: 400 },
      );
    }

    if (await walletAlreadyExists(supabase, walletAddress)) {
      return NextResponse.json(
        {
          message:
            "This connected wallet is already linked to another PawChain account. Please connect a different wallet to register.",
        },
        { status: 409 },
      );
    }

    const { data: signUpData, error: signUpError } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
            wallet_address: walletAddress,
          },
        },
      });

    if (signUpError) throw signUpError;
    if (!signUpData.user) throw new Error("Unable to create account.");

    const userId = signUpData.user.id;

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      role,
      full_name: fullName,
      email,
      wallet_address: walletAddress,
    });

    if (profileError) throw profileError;

    if (role === "donor") {
      const { error } = await supabase.from("donor_profiles").insert({
        user_id: userId,
      });

      if (error) throw error;

      return NextResponse.json({
        status: "success",
        message: "Donor account created successfully.",
      });
    }

    const proofDocument = formData.get("proofDocument");
    const proofDocumentPath =
      proofDocument instanceof File && proofDocument.name
        ? proofDocument.name
        : null;

    const { error } = await supabase.from("shelter_applications").insert({
      user_id: userId,
      shelter_name: readText(formData, "shelterName"),
      registration_id: readText(formData, "registrationId"),
      contact_phone: readText(formData, "contactPhone"),
      website_url: readText(formData, "websiteUrl") || null,
      shelter_address: readText(formData, "shelterAddress"),
      organization_description: readText(formData, "organizationDescription"),
      proof_document_path: proofDocumentPath,
    });

    if (error) throw error;

    return NextResponse.json({
      status: "pending",
      message: "Shelter application submitted for admin review.",
      application: {
        status: "pending",
        shelterName: readText(formData, "shelterName"),
        registrationId: readText(formData, "registrationId"),
        contactPhone: readText(formData, "contactPhone"),
        websiteUrl: readText(formData, "websiteUrl") || null,
        shelterAddress: readText(formData, "shelterAddress"),
        organizationDescription: readText(formData, "organizationDescription"),
        proofDocumentPath,
        submittedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const registerError = getRegisterError(error);

    return NextResponse.json(
      {
        message: registerError.message,
      },
      { status: registerError.status },
    );
  }
}
