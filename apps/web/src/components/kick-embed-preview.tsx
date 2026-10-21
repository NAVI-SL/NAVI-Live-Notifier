import type { NotificationMessage } from '@navi/core';

/** Illustrative dashboard sample, never a live status assertion or Discord send. */
export function KickEmbedPreview({
  message,
  displayName,
}: {
  message: NotificationMessage;
  displayName: string;
}) {
  const embed = message.embeds?.[0];
  if (!embed) return null;
  const category =
    embed.fields?.find((field) => field.name === 'Category')?.value ?? 'Category unavailable';
  return (
    <section className="kick-preview" aria-label="Kick embed sample preview">
      <div className="kick-preview-embed">
        <div className="kick-preview-heading">
          <div className="kick-preview-author">
            <span
              className="kick-preview-avatar"
              role="img"
              aria-label="Sample streamer profile picture"
            >
              {displayName.slice(0, 1).toUpperCase()}
            </span>
            <a href={embed.author.url} target="_blank" rel="noopener noreferrer">
              {embed.author.name}
            </a>
          </div>
          <div className="kick-preview-cover" role="img" aria-label="Sample category cover">
            {category}
            <small>SAMPLE COVER</small>
          </div>
        </div>
        <p>
          <strong>Stream title:</strong>{' '}
          {embed.description.replace(/^\*\*Stream title:\*\* /, '').replace(/\\(.)/g, '$1')}
        </p>
        <div className="kick-preview-art" role="img" aria-label="Sample livestream preview image">
          <span>STREAM PREVIEW</span>
          <small>ILLUSTRATIVE SAMPLE • NO LIVE DATA</small>
        </div>
        <p>
          <strong>Category:</strong> {category}
        </p>
        <small className="kick-preview-brand">Kick • Live notification sample</small>
      </div>
      <div className="kick-preview-buttons">
        {message.components
          ?.flatMap((row) => row.components)
          .map((button) => (
            <a key={button.label} href={button.url} target="_blank" rel="noopener noreferrer">
              {button.emoji?.name} {button.label} ↗
            </a>
          ))}
      </div>
      <p className="muted">
        Sample artwork only. Automatic alerts use current Kick API profile, category and stream
        images when available. No message was sent; everyone mentions are suppressed.
      </p>
    </section>
  );
}
