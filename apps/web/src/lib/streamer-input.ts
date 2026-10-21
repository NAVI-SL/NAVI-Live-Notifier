import { AppError } from './errors';
export type Platform = 'youtube' | 'kick';
export function streamerInput(platform: unknown, input: unknown) {
  if ((platform !== 'youtube' && platform !== 'kick') || typeof input !== 'string')
    throw new AppError(400, 'invalid_streamer');
  const userIdentifier = input.trim();
  if (!userIdentifier || userIdentifier.length > 512 || /[\s\p{Cc}\p{Cf}]/u.test(userIdentifier))
    throw new AppError(400, 'invalid_streamer');
  let identifier = userIdentifier;
  if (/^(?:https?:\/\/|www\.|youtube\.com\/|kick\.com\/)/i.test(identifier)) {
    let url: URL;
    try {
      url = new URL(identifier.includes('://') ? identifier : `https://${identifier}`);
    } catch {
      throw new AppError(400, 'invalid_streamer');
    }
    const hosts =
      platform === 'youtube'
        ? ['youtube.com', 'www.youtube.com', 'm.youtube.com']
        : ['kick.com', 'www.kick.com'];
    if (
      url.protocol !== 'https:' ||
      !hosts.includes(url.hostname) ||
      url.port ||
      url.username ||
      url.password
    )
      throw new AppError(400, 'invalid_streamer');
    let path: string;
    try {
      path = decodeURIComponent(url.pathname).replace(/\/$/, '');
    } catch {
      throw new AppError(400, 'invalid_streamer');
    }
    if (platform === 'youtube') {
      if (/^\/channel\/UC[A-Za-z0-9_-]{22}$/.test(path)) identifier = path.slice(9);
      else if (/^\/@[^/]+$/.test(path)) identifier = path.slice(1);
      else throw new AppError(400, 'unsupported_youtube_url');
    } else {
      if (!/^\/[^/]+$/.test(path)) throw new AppError(400, 'invalid_streamer');
      identifier = path.slice(1);
    }
  }
  if (platform === 'kick') {
    if (!/^[a-zA-Z0-9_-]{1,25}$/.test(identifier)) throw new AppError(400, 'invalid_streamer');
    return {
      provider: platform,
      identifier: identifier.toLowerCase(),
      filter: 'slug',
      userIdentifier,
    } as const;
  }
  if (/^UC[A-Za-z0-9_-]{22}$/.test(identifier))
    return { provider: platform, identifier, filter: 'id', userIdentifier } as const;
  identifier = identifier.replace(/^@/, '');
  if (!/^[\p{L}\p{M}\p{N}_.\-·]{1,100}$/u.test(identifier))
    throw new AppError(400, 'invalid_streamer');
  return { provider: platform, identifier, filter: 'forHandle', userIdentifier } as const;
}
