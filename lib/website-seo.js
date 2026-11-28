// Website SEO tags, video link and URL slug (rules match the backend's
// src/utils/websiteSeo.ts).

export const SEO_TITLE_MAX = 70;
export const SEO_DESCRIPTION_MAX = 160;
export const SEO_KEYWORDS_MAX = 20;
export const SEO_KEYWORD_MAX_LENGTH = 50;
export const VIDEO_URL_MAX = 500;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "Ganesh Idol (Brass)" -> "ganesh-idol-brass" */
export function slugify(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255)
    .replace(/-+$/g, '');
}

/** Keep typing friendly: lowercase, anything else becomes a single hyphen. */
export function cleanSlugInput(value) {
  return (value || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
}

export function parseKeywords(text) {
  const seen = new Set();
  const out = [];
  for (const k of (text || '').split(',')) {
    const v = k.trim().replace(/\s+/g, ' ');
    if (!v || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    out.push(v);
  }
  return out;
}

/**
 * Check the website fields of a product form shown on the website.
 * Returns { field: message } for the first problem, or null when all is fine.
 */
export function validateWebsiteFields(form) {
  const slug = (form.websiteSlug || '').replace(/^-+|-+$/g, '');
  if (!slug) return { websiteSlug: 'URL slug is required when "Show on website" is on' };
  if (!SLUG_RE.test(slug)) {
    return { websiteSlug: 'URL slug may only use lowercase letters, numbers and single hyphens' };
  }
  if ((form.seoTitle || '').trim().length > SEO_TITLE_MAX) {
    return { seoTitle: `SEO title must be at most ${SEO_TITLE_MAX} characters` };
  }
  if ((form.seoDescription || '').trim().length > SEO_DESCRIPTION_MAX) {
    return { seoDescription: `Meta description must be at most ${SEO_DESCRIPTION_MAX} characters` };
  }
  const keywords = parseKeywords(form.seoKeywords);
  if (keywords.length > SEO_KEYWORDS_MAX) return { seoKeywords: `At most ${SEO_KEYWORDS_MAX} keywords` };
  if (keywords.some((k) => k.length > SEO_KEYWORD_MAX_LENGTH)) {
    return { seoKeywords: `Each keyword must be at most ${SEO_KEYWORD_MAX_LENGTH} characters` };
  }
  const video = (form.videoUrl || '').trim();
  if (video) {
    let url;
    try {
      url = new URL(video);
    } catch {
      return { videoUrl: 'Video URL must be a valid link' };
    }
    if (url.protocol !== 'https:') return { videoUrl: 'Video URL must start with https://' };
  }
  return null;
}

/** Form values -> API payload fields. */
export function websiteFieldsPayload(form) {
  return {
    websiteSlug: (form.websiteSlug || '').replace(/^-+|-+$/g, '') || null,
    seoTitle: (form.seoTitle || '').trim() || null,
    seoDescription: (form.seoDescription || '').trim() || null,
    seoKeywords: parseKeywords(form.seoKeywords),
    videoUrl: (form.videoUrl || '').trim() || null,
  };
}

/** API product -> form values. */
export function websiteFieldsFromProduct(product) {
  return {
    websiteSlug: product?.websiteSlug || '',
    seoTitle: product?.seoTitle || '',
    seoDescription: product?.seoDescription || '',
    seoKeywords: (product?.seoKeywords || []).join(', '),
    videoUrl: product?.videoUrl || '',
  };
}

export const emptyWebsiteFields = {
  websiteSlug: '',
  seoTitle: '',
  seoDescription: '',
  seoKeywords: '',
  videoUrl: '',
};
