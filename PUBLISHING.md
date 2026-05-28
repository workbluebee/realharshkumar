# Publishing Workflow

Use this checklist before publishing a new article from Sanity.

## Sanity Fields

- Title: one clear article headline.
- Slug: lowercase, hyphenated, no dates unless the date is part of the idea.
- Excerpt: 1-2 sentences, written like a reader-facing teaser.
- Category: use one of `Marketing`, `Brand Analysis`, `Psychology`, `Strategy`, or `Other`.
- Published date: use the real publish date. Avoid future dates unless you are intentionally scheduling.
- Hero image: add alt text and a short caption when the image adds context.
- Pull quote: one sharp line, not a paragraph.

## Article QA

- Read the whole article once on mobile.
- Check the headline, excerpt, first image, pull quote, and first two paragraphs.
- Replace AI-looking punctuation patterns before publishing, especially repeated long dashes.
- Keep paragraphs short enough for phone reading.
- Make sure every image has a useful caption or no caption at all.
- Confirm the article appears in the right category in the Reading Index.

## After Publishing

- Open `/writings.html` and confirm the article card appears.
- Open the article and confirm the date, read time, pull quote, and footer source line.
- Share the article URL once in a private chat to confirm the preview is acceptable.
- Run a quick mobile check for horizontal scrolling.

## Sanity Studio Access

The website reads published content from Sanity through `/api/sanity`. Keep the Sanity token in Vercel environment variables only, never in frontend files.

For editing from anywhere, deploy Sanity Studio from its own Git repo or from a `/studio` folder to Vercel/Netlify. The Studio is just the editor UI; the content stays in Sanity's hosted Content Lake.
