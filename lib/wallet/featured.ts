import type { LinkAction } from "./types";

/**
 * Apple's Featured Actions — the tappable buttons under an iOS 27 poster pass. Shared by
 * the pass builder and the designer so the preview can never disagree with the real pass.
 *
 * Apple writes the button wording from the action type; we only choose the type. These
 * are the types that actually render on posterGeneric (tested on device). "place" never
 * rendered — tested six ways — so it isn't offered.
 */
export const APPLE_BUTTONS = {
  viewOffersRewards: "View Offers and Rewards",
  order: "Order Delivery and Pickup",
  shop: "Shop Online or In-App",
  membershipBenefits: "View Membership Benefits",
} as const;
export type FeaturedType = keyof typeof APPLE_BUTTONS;

/** Stored in wallet_links.featured_type to keep a link off the front (back of pass only). */
export const FEATURED_NONE = "none";

/** Apple's cap: at most two buttons on the front. */
export const MAX_FEATURED = 2;

/** Which button a link gets when no type is chosen. */
export const DEFAULT_TYPE: Partial<Record<LinkAction, string>> = {
  giveaway: "viewOffersRewards",
  map: "order",
  website: "shop",
  shop: "shop",
  video: "watchTrailer",
};

/** Front-of-pass priority when more links qualify than Apple allows. */
export const FEATURED_ORDER: LinkAction[] = ["giveaway", "map", "website", "shop", "video"];

type LinkLike = { action: string; featuredType?: string | null };

/** The (at most two) links that become front buttons, in order, with their Apple type. */
export function featuredLinks<T extends LinkLike>(links: T[]): { link: T; type: string }[] {
  return FEATURED_ORDER.flatMap((action) => {
    const link = links.find((l) => l.action === action);
    if (!link || link.featuredType === FEATURED_NONE) return [];
    const type = link.featuredType || DEFAULT_TYPE[action];
    return type ? [{ link, type }] : [];
  }).slice(0, MAX_FEATURED);
}

/** The words a person sees on the button, when we know them. */
export const appleButtonLabel = (type: string | null | undefined) =>
  type ? (APPLE_BUTTONS as Record<string, string>)[type] ?? null : null;
