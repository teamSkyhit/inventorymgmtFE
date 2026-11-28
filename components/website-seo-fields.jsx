'use client';

import { useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  slugify,
  cleanSlugInput,
  parseKeywords,
  SEO_TITLE_MAX,
  SEO_DESCRIPTION_MAX,
  SEO_KEYWORDS_MAX,
  VIDEO_URL_MAX,
} from '@/lib/website-seo';

function Counter({ value, max }) {
  const n = (value || '').trim().length;
  return (
    <span className={`text-xs ${n > max ? 'text-destructive' : 'text-muted-foreground'}`}>
      {n}/{max}
    </span>
  );
}

function FieldError({ message }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

/**
 * URL slug (required), SEO title, meta description, keywords and video URL for
 * a product shown on the website. The slug follows the product name until
 * someone edits it by hand.
 */
export default function WebsiteSeoFields({ values, onChange, productName, errors = {}, idPrefix = '' }) {
  const lastName = useRef(productName);

  useEffect(() => {
    const autoSlug = !values.websiteSlug || values.websiteSlug === slugify(lastName.current);
    if (autoSlug && productName && slugify(productName) !== values.websiteSlug) {
      onChange('websiteSlug', slugify(productName));
    }
    lastName.current = productName;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productName]);

  const id = (name) => `${idPrefix}${name}`;
  const keywordCount = parseKeywords(values.seoKeywords).length;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={id('websiteSlug')}>URL Slug *</Label>
        <Input
          id={id('websiteSlug')}
          placeholder="e.g. brass-ganesh-idol"
          value={values.websiteSlug}
          onChange={(e) => onChange('websiteSlug', cleanSlugInput(e.target.value))}
          maxLength={255}
          className={errors.websiteSlug ? 'border-destructive' : ''}
        />
        <FieldError message={errors.websiteSlug} />
        <p className="text-xs text-muted-foreground">
          Used in the website URL: /products/<strong>{values.websiteSlug || 'your-slug'}</strong>. Filled in from
          the name; you can change it.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={id('seoTitle')}>SEO Title (Optional)</Label>
          <Counter value={values.seoTitle} max={SEO_TITLE_MAX} />
        </div>
        <Input
          id={id('seoTitle')}
          placeholder={productName || 'Shown as the page title in Google'}
          value={values.seoTitle}
          onChange={(e) => onChange('seoTitle', e.target.value)}
          className={errors.seoTitle ? 'border-destructive' : ''}
        />
        <FieldError message={errors.seoTitle} />
        <p className="text-xs text-muted-foreground">Best under 60 characters. Empty = product name.</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={id('seoDescription')}>Meta Description (Optional)</Label>
          <Counter value={values.seoDescription} max={SEO_DESCRIPTION_MAX} />
        </div>
        <Textarea
          id={id('seoDescription')}
          rows={3}
          placeholder="Short summary shown under the title in Google search results"
          value={values.seoDescription}
          onChange={(e) => onChange('seoDescription', e.target.value)}
          className={errors.seoDescription ? 'border-destructive' : ''}
        />
        <FieldError message={errors.seoDescription} />
        <p className="text-xs text-muted-foreground">Empty = start of the product description.</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={id('seoKeywords')}>Keywords (Optional)</Label>
          <span className={`text-xs ${keywordCount > SEO_KEYWORDS_MAX ? 'text-destructive' : 'text-muted-foreground'}`}>
            {keywordCount}/{SEO_KEYWORDS_MAX}
          </span>
        </div>
        <Input
          id={id('seoKeywords')}
          placeholder="brass idol, ganesh, pooja items"
          value={values.seoKeywords}
          onChange={(e) => onChange('seoKeywords', e.target.value)}
          className={errors.seoKeywords ? 'border-destructive' : ''}
        />
        <FieldError message={errors.seoKeywords} />
        <p className="text-xs text-muted-foreground">Separate with commas.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={id('videoUrl')}>Video URL (Optional)</Label>
        <Input
          id={id('videoUrl')}
          type="url"
          placeholder="https://youtu.be/..."
          value={values.videoUrl}
          onChange={(e) => onChange('videoUrl', e.target.value)}
          maxLength={VIDEO_URL_MAX}
          className={errors.videoUrl ? 'border-destructive' : ''}
        />
        <FieldError message={errors.videoUrl} />
        <p className="text-xs text-muted-foreground">
          A https link: YouTube, Instagram, Vimeo or a direct .mp4. Upload the video there and paste the link.
        </p>
      </div>
    </div>
  );
}
