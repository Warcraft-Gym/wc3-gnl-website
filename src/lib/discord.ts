import "server-only";
import { DISCORD_URL } from "./links";

export type DiscordCommunity = {
  members: number;
  online: number;
};

const INVITE_CODE = DISCORD_URL.split("/").pop() ?? "";

/** Live member / online counts for the Gym Discord, from the public invite
 *  endpoint (no auth). Cached for ten minutes; null if Discord is unhappy so
 *  the page still renders. */
export async function getDiscordCommunity(): Promise<DiscordCommunity | null> {
  if (!INVITE_CODE) return null;
  try {
    const res = await fetch(
      `https://discord.com/api/v10/invites/${INVITE_CODE}?with_counts=true`,
      { next: { revalidate: 600 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      approximate_member_count?: number;
      approximate_presence_count?: number;
    };
    if (typeof data.approximate_member_count !== "number") return null;
    return {
      members: data.approximate_member_count,
      online: data.approximate_presence_count ?? 0,
    };
  } catch {
    return null;
  }
}
