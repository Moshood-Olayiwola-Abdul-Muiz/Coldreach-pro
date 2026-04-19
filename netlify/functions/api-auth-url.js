import { google } from "googleapis";

export const handler = async (event, context) => {
  let redirectUri = event.queryStringParameters?.redirect_uri;

  if (!redirectUri) {
    const host = event.headers.host;
    const protocol = event.headers["x-forwarded-proto"] || "https";
    redirectUri = `${protocol}://${host}/oauth2callback`;
  }

  const clientId =
    process.env.CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    "677843590105-u5icvnvdbo5vvuvrfr06gl5a8utti468.apps.googleusercontent.com";
  const clientSecret =
    process.env.CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "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";

  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.settings.basic",
  ];

  const state = redirectUri
    ? Buffer.from(JSON.stringify({ redirectUri })).toString("base64")
    : undefined;

  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state,
    redirect_uri: redirectUri,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ url }),
  };
};
