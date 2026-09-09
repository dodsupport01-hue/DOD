# Moving DOD media to Cloudflare R2

Everything here is already wired up in code. This document is the click-path on
the Cloudflare side plus the five values to paste into `backend/.env`.

---

## 0. First, the honest part: R2 is not the main problem

Measured on the live site before any of this:

| Finding | Measurement |
|---|---|
| Homepage HTML re-downloaded on **every** visit | `Cache-Control: no-cache, no-store` — 297 KB, TTFB 1.23 s |
| Images served at full camera resolution | 64 `<img>` on the page, **0** with any resize parameter |
| `<video>` elements built before anyone presses play | **17** |
| YouTube players loaded whether watched or not | 2 iframes, ~1 MB of YouTube JS each |
| Every image and video URL arrives only after an API call to a **free Render instance** | sleeps after 15 min idle, then takes up to ~50 s to answer |

None of those are ImageKit's fault, and none of them are fixed by changing CDN.
They are all fixed in this commit, independently of R2. **Do that part first** —
it is where most of the speed is.

R2 is still worth doing, for one specific reason: **bandwidth**. See below.

---

## 1. Which free tier actually fits this site

| Option | Free allowance | Egress | Resizes images? | Video | Verdict for DOD |
|---|---|---|---|---|---|
| **ImageKit** (today) | 20 GB bandwidth/mo + 20 GB storage | counted | ✅ built in | counted against the same 20 GB | Fine for images. Autoplaying clips will eat the 20 GB. |
| **Cloudinary** (today, for `local-videos`) | 25 "credits"/mo | counted | ✅ | very expensive per GB | Weakest of the three; video burns credits fastest. |
| **Cloudflare R2 + custom domain** | 10 GB storage, 1 M writes, 10 M reads | **free, unmetered** | via Transformations (5 000 unique/mo free) | serves any file, no per-minute charge | ✅ **Best fit.** Unmetered egress is the whole point. |
| Cloudflare Images | — | — | ✅ | — | Paid ($5/mo per 100 k stored). Not needed; R2 + Transformations covers it. |
| Cloudflare Stream | — | — | — | adaptive bitrate | Paid ($5/1 000 min stored). Only worth it if you outgrow plain MP4. |
| Bunny.net | none (≈$1/mo minimum) | $0.01/GB in India | ✅ | ✅ | Genuinely excellent and cheap, but not free. Good plan B. |

**Recommendation: R2 + a custom domain, with Cloudflare Image Transformations
enabled.** Storage is the only thing metered, this site's media is far under
10 GB, and delivery — the part that scales with traffic — costs nothing.

The one thing R2 does *not* do is cut a poster frame out of a video, which
ImageKit does via `/ik-thumbnail.jpg`. After migrating, upload a poster image
with each clip; the admin review form already accepts one, and the site uses it
automatically.

---

## 2. Cloudflare setup (about 10 minutes)

### 2.1 Create the bucket
1. Cloudflare dashboard → **R2 Object Storage** → **Create bucket**
2. Name: `dod-media`
3. Location: **Asia-Pacific (APAC)**
4. Create.

### 2.2 Give it a custom domain — do not skip this
The `*.r2.cloudflarestorage.com` endpoint is **not** CDN-cached and needs signed
requests. Public, cached delivery only happens through a custom domain.

1. Open the bucket → **Settings** → **Public access** → **Custom domains** → **Connect domain**
2. Enter `cdn.dodsmarthealth.com`
3. `dodsmarthealth.com` must be on Cloudflare DNS for this. If it is not yet:
   add the site to Cloudflare (Free plan), then change the nameservers at your
   registrar to the two Cloudflare gives you. Propagation is usually under an hour.
4. Cloudflare creates the DNS record itself. Wait for **Active**.

Check it works — this must return `200`:
```bash
curl -I https://cdn.dodsmarthealth.com/
```

### 2.3 Turn on Image Transformations
1. Dashboard → your domain → **Images** → **Transformations**
2. Enable for `dodsmarthealth.com`
3. Tick **Resize images from any origin** (or restrict it to `cdn.dodsmarthealth.com`)

That switches on the `/cdn-cgi/image/...` URLs the site already generates:
```
https://cdn.dodsmarthealth.com/cdn-cgi/image/width=640,format=auto,quality=auto,fit=scale-down/dod-healthcare/gallery/photo.jpg
```
Free tier is 5 000 *unique* transformations per month. Each (image, width) pair
counts once — cached repeats are free — and the site asks for four widths per
gallery image, so a 60-image gallery is ~240 of the 5 000.

### 2.4 Create an API token
1. R2 → **Manage R2 API Tokens** → **Create API token**
2. Permission: **Object Read & Write**
3. Scope it to the `dod-media` bucket
4. Copy **Access Key ID** and **Secret Access Key** — the secret is shown once.
5. **Account ID** is on the R2 overview page.

### 2.5 Recommended cache rule
Dashboard → **Caching** → **Cache Rules** → Create:
- If `Hostname equals cdn.dodsmarthealth.com`
- Then **Eligible for cache**, Edge TTL **1 year**, Browser TTL **1 year**

Object keys are unique per upload, so a URL's bytes never change and caching
forever is safe.

---

## 3. Backend

```bash
cd backend
npm install                 # brings in @aws-sdk/client-s3
```

Add to `backend/.env` (and to Render → Environment):

```ini
R2_ACCOUNT_ID=<from R2 overview>
R2_ACCESS_KEY_ID=<from the API token>
R2_SECRET_ACCESS_KEY=<from the API token>
R2_BUCKET=dod-media
R2_PUBLIC_BASE=https://cdn.dodsmarthealth.com
```

Leave `STORAGE_DRIVER=imagekit` for now.

### 3.1 Copy the existing media across
```bash
npm run migrate:r2 -- --dry-run   # prints what it would copy, writes nothing
npm run migrate:r2                # does it
```

The script copies from ImageKit and Cloudinary into R2 and repoints each
MongoDB document. It deletes nothing, and it is safe to re-run — anything
already copied is skipped.

### 3.2 Switch new uploads over
```ini
STORAGE_DRIVER=r2
```
Restart the API. Uploads through the admin panel now land in R2.

Deletion keeps working across the mixed state: an R2 key contains a `/` and an
ImageKit fileId does not, so each record is removed from whichever provider
actually holds it.

---

## 4. Front-end

Nothing to change. `window.DOD.img()` in `index.html` already emits
`/cdn-cgi/image/...` for URLs on `cdn.dodsmarthealth.com` and ImageKit `tr=`
parameters for everything still on ImageKit.

If the CDN hostname is ever different, change one line — the `CDN` constant in
the `MEDIA + API RUNTIME` block near the top of `index.html`.

---

## 5. Rolling back

1. Set `STORAGE_DRIVER=imagekit`, restart.
2. Old ImageKit files were never deleted, so anything not yet migrated still works.
3. For records the migration already repointed, re-run `npm run migrate:imagekit`.

Keep ImageKit and Cloudinary alive for at least a week after switching. Delete
nothing until the site has been watched through a full traffic cycle.

---

## 6. Optional: put the whole site behind Cloudflare

Separate from R2, and worth doing. The site is on Hostinger; adding
`dodsmarthealth.com` to Cloudflare (Free) puts the HTML itself on the edge too.
With the `stale-while-revalidate` header now set in `.htaccess`, repeat visitors
get the page from a POP in Mumbai or Delhi instead of a round-trip to the origin.

Turn on: **Auto Minify** off (files are already minified), **Brotli** on,
**Early Hints** on, **HTTP/3** on.
