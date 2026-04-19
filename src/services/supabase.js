import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required.");
}

export const serviceClient = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

export function createUserClient(userJwt) {
  if (!userJwt) throw new Error("Missing user token");
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${userJwt}`,
      },
    },
  });
}

export async function requireUserSession(userJwt) {
  const client = createUserClient(userJwt);
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) {
    throw new Error("Invalid or expired Supabase session.");
  }
  return { user: data.user, client };
}

export async function saveLeadViaRpc(userClient, payload) {
  const { data, error } = await userClient.rpc("insert_lead_if_not_exists", {
    store_url: payload.store_url,
    platform: payload.platform,
    email: payload.email,
    phone: payload.phone,
    social_links: payload.social_links,
    source: payload.source,
  });

  if (error) throw error;
  return data;
}
