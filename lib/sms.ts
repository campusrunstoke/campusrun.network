/**
 * The carrier-required disclosure shown wherever someone can opt in by text. Toll-free
 * verification reviewers check the opt-in screen for rates, frequency, STOP and HELP, and
 * a terms link — keep this wording in step with the sample messages we registered.
 */
export const SMS_DISCLOSURE =
  "Entering by text: Msg & data rates may apply. Up to 3 msgs per entry. Reply STOP to opt out, HELP for help. Terms & privacy: campusrun.network/terms";

/** Starting wording for a new giveaway — drafts, edited per giveaway in the portal. */
export const DEFAULT_REPLIES = {
  replyEntry:
    "Campus Run x {BRAND}: You're entered in the giveaway! Quick question: {QUESTION} Msg & data rates may apply. Reply STOP to opt out.",
  replyAnswer: "Thanks! Good luck in the giveaway. - Campus Run",
  replyWrongKeyword: "Text {KEYWORD} to enter the {BRAND} giveaway.",
  replyHelp: "Campus Run: questions about the giveaway? Email kasey@campusrun.network. Reply STOP to opt out.",
  replyClosed: "This giveaway has ended. Thanks for your interest! - Campus Run",
};

/** Carrier opt-out / opt-in / help words (CTIA). Matched on the whole message. */
export const STOP_WORDS = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "OPTOUT", "OPT-OUT", "REVOKE"];
export const START_WORDS = ["START", "UNSTOP", "YES"];
export const HELP_WORDS = ["HELP", "INFO"];

// GSM-7: the plain alphabet a standard text uses. One character outside it (a curly
// quote, an emoji) switches the whole message to UCS-2 and shrinks every segment.
const GSM7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXT = "^{}\\[~]|€"; // count as two characters

/**
 * How many billable texts a message is — what Twilio charges for. Used in the portal so
 * wording changes show their cost before they ship.
 */
export function smsSegments(body: string): { segments: number; unicode: boolean; length: number; offenders: string[] } {
  const chars = [...body];
  const offenders = [...new Set(chars.filter((c) => !GSM7.includes(c) && !GSM7_EXT.includes(c)))];
  if (offenders.length) {
    const n = chars.length;
    return { segments: n <= 70 ? 1 : Math.ceil(n / 67), unicode: true, length: n, offenders };
  }
  const n = chars.reduce((s, c) => s + (GSM7_EXT.includes(c) ? 2 : 1), 0);
  return { segments: n <= 160 ? 1 : Math.ceil(n / 153), unicode: false, length: n, offenders: [] };
}

/** Fill {BRAND} / {KEYWORD} / {QUESTION} placeholders in a reply. */
export function fillReply(text: string, v: { brand: string; keyword: string; question: string | null }) {
  return text
    .replaceAll("{BRAND}", v.brand)
    .replaceAll("{KEYWORD}", v.keyword)
    .replaceAll("{QUESTION}", v.question ?? "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Entry codes tie a text entry back to the exact pass (and so card and campaign) it came
 * from. The pass's giveaway button pre-fills "POCARI #7A2F9C": the code is the first six
 * characters of that pass's random serial — unguessable, and unique across thousands of
 * passes. Someone who types just "POCARI" still enters; they're just unattributed.
 */
export const entryCode = (serial: string) => serial.slice(0, 6).toUpperCase();

/** sms:+1…&body=POCARI → sms:+1…&body=POCARI%20%237A2F9C (only for sms: links with a body). */
export function withEntryCode(destination: string, serial: string): string {
  const m = destination.match(/^(sms:[^?&]*[?&](?:.*?&)?body=)([^&]*)(.*)$/i);
  if (!m) return destination;
  const body = decodeURIComponent(m[2].replace(/\+/g, " "));
  return `${m[1]}${encodeURIComponent(`${body} #${entryCode(serial)}`)}${m[3]}`;
}

/** "POCARI #7A2F9C" → "7A2F9C" (any "#" + 6 hex anywhere in the text). */
export const parseEntryCode = (body: string) => body.match(/#\s*([0-9a-f]{6})\b/i)?.[1].toLowerCase() ?? null;
