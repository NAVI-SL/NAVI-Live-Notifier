'use client';
import { useState } from 'react';
import { guildIconUrl } from '../lib/dashboard-model';
export function GuildIcon({ id, name, icon }: { id: string; name: string; icon: string | null }) {
  const [failed, setFailed] = useState(false);
  const url = guildIconUrl(id, icon);
  return (
    <span className="guild-icon" aria-hidden="true">
      {url && !failed ? (
        <img
          src={url}
          width={56}
          height={56}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        name.trim().slice(0, 2).toUpperCase() || 'DS'
      )}
    </span>
  );
}
