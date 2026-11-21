export interface ParsedTrailer {
  videoId: string;
  embedUrl: string;
  watchUrl: string;
}

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{6,15}$/;

export function parseTrailerUrl(rawUrl: string | null | undefined): ParsedTrailer | null {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return null;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    let candidateId: string | null = null;

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (parsed.pathname === '/watch') {
        candidateId = parsed.searchParams.get('v');
      } else if (parsed.pathname.startsWith('/embed/') || parsed.pathname.startsWith('/shorts/')) {
        candidateId = parsed.pathname.split('/')[2] ?? null;
      }
    } else if (host === 'youtu.be') {
      candidateId = parsed.pathname.slice(1).split('/')[0] ?? null;
    }

    if (!candidateId || !YOUTUBE_ID_PATTERN.test(candidateId)) {
      return null;
    }

    return {
      videoId: candidateId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${candidateId}?rel=0&modestbranding=1`,
      watchUrl: `https://www.youtube.com/watch?v=${candidateId}`,
    };
  } catch {
    return null;
  }
}
