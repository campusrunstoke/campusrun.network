/** Shared wallet enums mirrored from the DB schema, importable by client + edge-safe code. */
export type DeviceType = "ios" | "android" | "other";
export type LinkAction = "map" | "website" | "video" | "shop";
export type WalletEventType = "tap" | "pass_added" | "pass_removed" | "click" | "redemption";
export type RedemptionMethod = "staff_scan" | "receipt" | "shopify" | "promo_code" | "manual";

export const LINK_ACTIONS: LinkAction[] = ["map", "website", "video", "shop"];
