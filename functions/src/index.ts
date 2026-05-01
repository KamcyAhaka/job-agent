import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import {MatchedJob} from "./types";
import "dotenv/config";

admin.initializeApp();
const db = admin.firestore();

/**
 * Verify request is genuinely from Slack
 * @param {functions.https.Request} req - Request object
 * @return {boolean} True if request is valid, false otherwise
 */
function isValidSlackRequest(req: functions.https.Request): boolean {
  return req.body?.token === process.env.SLACK_VERIFICATION_TOKEN;
}

export const slackJobs = functions.https.onRequest(async (req, res) => {
  if (!isValidSlackRequest(req)) {
    res.status(403).send("Unauthorized");
    return;
  }

  const text: string = req.body.text?.trim() ?? "";
  const [command, ...args] = text.split(" ");

  try {
    let responseText = "";

    switch (command) {
    case "latest":
    case "": {
      const limit = parseInt(args[0] ?? "5", 10);
      const snapshot = await db
        .collection("job_leads")
        .orderBy("savedAt", "desc")
        .limit(limit)
        .get();

      const jobs = snapshot.docs.map((d) => d.data() as MatchedJob);

      if (!jobs.length) {
        responseText = "No job leads found yet.";
        break;
      }

      responseText = jobs.map((j) =>
        `*<${j.url}|${j.title}>* @ ${j.company} — ⭐${j.matchScore}/10\n` +
        `📍 ${j.location} | 💡 ${j.matchReason}`
      ).join("\n\n");
      break;
    }

    case "today": {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const snapshot = await db
        .collection("job_leads")
        .where("savedAt", ">=", startOfDay)
        .orderBy("savedAt", "desc")
        .get();

      const jobs = snapshot.docs.map((d) => d.data() as MatchedJob);
      responseText = jobs.length ?
        `📅 *${jobs.length} job${jobs.length > 1 ? "s" : ""} found today:*\n\n` +
            jobs.map((j) =>
              `*<${j.url}|${j.title}>* @ ${j.company} — ⭐${j.matchScore}/10`
            ).join("\n") :
        "No jobs found today yet.";
      break;
    }

    case "help":
    default:
      responseText = [
        "*📋 /jobs commands:*",
        "`/jobs` or `/jobs latest` — Show 5 most recent leads",
        "`/jobs latest 10` — Show last N leads",
        "`/jobs today` — Show leads found today",
        "`/jobs help` — Show this message",
      ].join("\n");
    }

    res.json({
      response_type: "in_channel",
      text: responseText,
    });
  } catch (err) {
    console.error(err);
    res.json({text: "❌ Something went wrong. Check the logs."});
  }
});
