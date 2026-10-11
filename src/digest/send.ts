import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { CONFIG } from "../config/settings.js";

const ses = new SESv2Client({});

// Keeps the digest at a readable width in wide mail clients
const WRAPPER_STYLE = "font-family:-apple-system,Segoe UI,sans-serif;max-width:680px";

export async function sendDigest(html: string): Promise<void> {
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: CONFIG.fromEmail,
      Destination: { ToAddresses: [CONFIG.toEmail] },
      Content: {
        Simple: {
          Subject: { Data: `📡 Startup Radar — ${date}` },
          Body: { Html: { Data: `<div style="${WRAPPER_STYLE}">${html}</div>` } },
        },
      },
    }),
  );
}
