import { embedUrl } from "@/lib/video-embed.mjs";

/**
 * A YouTube or Vimeo player, or a plain link when the URL is not one we can
 * embed. Shared so a video on a creep route and a video inside a guide body
 * behave identically — same no-cookie host, same lazy loading, same framing.
 */
export function VideoEmbed({
  url,
  title = "Video",
  className,
}: {
  url?: string;
  title?: string;
  className?: string;
}) {
  const embed = embedUrl(url);

  if (!embed) {
    // Unrecognised host — a Twitch VOD, a direct file. Still worth offering.
    return url ? (
      <p className={className}>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-gold underline decoration-gold/40 underline-offset-2 hover:decoration-gold"
        >
          Watch the video
        </a>
      </p>
    ) : null;
  }

  return (
    <div className={className}>
      <div className="aspect-video overflow-hidden rounded border border-line bg-bg-deep">
        <iframe
          src={embed}
          title={title}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="size-full"
        />
      </div>
    </div>
  );
}
