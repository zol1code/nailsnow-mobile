
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STRIPE_API_VERSION = "2026-09-30.endive";

// These URLs return the designer to the NailsNow app.
const RETURN_URL = "https://zol1code.github.io/nailsnow-stripe-return-3./";
const REFRESH_URL = "https://zol1code.github.io/nailsnow-stripe-return-3./";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const jsonResponse = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !serviceRoleKey ||
      !stripeSecretKey
    ) {
      throw new Error("Missing required environment variables.");
    }

    if (!stripeSecretKey.startsWith("sk_test_")) {
      throw new Error("Only Stripe test mode is allowed.");
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Authentication required." }, 401);
    }

    const token = authHeader.replace("Bearer ", "");

    const authClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse({ error: "Invalid session." }, 401);
    }

    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    // Only designers can access Stripe onboarding.
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (profile?.user_type !== "designer") {
      return jsonResponse(
        { error: "Only designers can set up payments." },
        403,
      );
    }

    // Retrieve the existing Stripe test account.
    const { data: stripeAccount, error: accountError } =
      await adminClient
        .from("designer_stripe_accounts")
        .select("stripe_account_id, livemode")
        .eq("designer_id", user.id)
        .eq("livemode", false)
        .maybeSingle();

    if (accountError) throw accountError;

    if (!stripeAccount?.stripe_account_id) {
      return jsonResponse(
        {
          error:
            "Stripe account not found. Create your Stripe account first.",
          result: "account_not_found",
        },
        404,
      );
    }

    const stripeAccountId = stripeAccount.stripe_account_id;

    // Create a fresh, single-use Stripe onboarding link.
    const stripeResponse = await fetch(
      "https://api.stripe.com/v2/core/account_links",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/json",
          "Stripe-Version": STRIPE_API_VERSION,
        },
        body: JSON.stringify({
          account: stripeAccountId,
          use_case: {
            type: "account_onboarding",
            account_onboarding: {
              return_url: RETURN_URL,
              refresh_url: REFRESH_URL,
            },
          },
        }),
      },
    );

    const stripeData = await stripeResponse.json();

    if (!stripeResponse.ok) {
      console.error("Stripe Account Link error:", stripeData);

      return jsonResponse(
        {
          error:
            stripeData?.error?.message ||
            "Could not create Stripe onboarding link.",
        },
        400,
      );
    }

    const accountLink =
      stripeData?.v2?.core?.account_link ?? stripeData;

    if (!accountLink?.url) {
      console.error("Unexpected Stripe response:", stripeData);
      throw new Error("Stripe did not return an onboarding URL.");
    }

    return jsonResponse({
      result: "onboarding_link_created",
      livemode: false,
      stripe_account_id: stripeAccountId,
      url: accountLink.url,
      expires_at: accountLink.expires_at ?? null,
    });
  } catch (error) {
    console.error("Create Connect Account Link error:", error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      500,
    );
  }
});
