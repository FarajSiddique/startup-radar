import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { CONFIG } from "./config.js";

const ses = new SESv2Client({});

export async function sendDigest(html: string) {
  const date = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  await ses.send(new SendEmailCommand({
    FromEmailAddress: CONFIG.fromEmail,
    Destination: { ToAddresses: [CONFIG.toEmail] },
    Content: { Simple: {
      Subject: { Data: `📡 Startup Radar — ${date}` },
      Body: { Html: { Data: `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:680px">${html}</div>` } },
    }},
  }));
}
