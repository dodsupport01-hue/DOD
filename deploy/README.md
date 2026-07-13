# Migrating dodsmarthealth.com from Vercel to a Hostinger VPS

Auto-deploy stays: every push to `main` ships to the VPS via GitHub Actions.

**Do steps 1–6 before touching DNS.** The site keeps running on Vercel the whole
time; you only cut over in step 7, once the new server is proven.

---

## What you have today

| Piece | Where it runs | Changes? |
|---|---|---|
| Static site (`index.html`, CSS, JS, images) | Vercel | → moves to VPS |
| Admin panel (`/admin`) | Vercel | → moves to VPS |
| Backend API | Render (`dod-healthcare-api.onrender.com`) | **stays on Render** |
| `vercel.json` (redirects, headers, caching) | Vercel | → replaced by nginx config |

The backend is a separate service and is **not** part of this migration. The
site will keep calling Render exactly as it does now.

---

## 1. Point a test subdomain at the VPS

Get your VPS IP from hPanel (**VPS → Overview**). In your DNS provider add:

```
A    vps    <YOUR_VPS_IP>     TTL 300
```

This gives you `vps.dodsmarthealth.com` to test with, without touching the
live site.

---

## 2. Prepare the server

SSH in as root (hPanel shows the credentials):

```bash
ssh root@<YOUR_VPS_IP>

# Base packages
apt update && apt upgrade -y
apt install -y nginx rsync ufw

# Firewall: SSH + HTTP + HTTPS only
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# A non-root user for deploys
adduser --disabled-password --gecos "" deploy
mkdir -p /home/deploy/.ssh && chmod 700 /home/deploy/.ssh

# Let that user reload nginx (and only that) without a password
echo 'deploy ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /bin/systemctl reload nginx' \
  > /etc/sudoers.d/deploy-nginx
chmod 440 /etc/sudoers.d/deploy-nginx

# Where the site lives
mkdir -p /var/www/dod
chown -R deploy:deploy /var/www/dod
```

---

## 3. Create the deploy SSH key

**On your own machine**, not the server:

```bash
ssh-keygen -t ed25519 -f dod_deploy_key -N "" -C "github-actions"
```

That makes two files. Install the **public** half on the VPS:

```bash
# paste the contents of dod_deploy_key.pub
ssh root@<YOUR_VPS_IP> \
  "cat >> /home/deploy/.ssh/authorized_keys && \
   chmod 600 /home/deploy/.ssh/authorized_keys && \
   chown -R deploy:deploy /home/deploy/.ssh" < dod_deploy_key.pub
```

Check it works:

```bash
ssh -i dod_deploy_key deploy@<YOUR_VPS_IP> "echo connected"
```

---

## 4. Add the GitHub secrets

In GitHub: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
|---|---|
| `VPS_HOST` | your VPS IP |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | the **entire** contents of the *private* key `dod_deploy_key`, including the `BEGIN`/`END` lines |

> The private key is a server credential. Never commit it — it stays only in
> GitHub Secrets and on your machine. Delete your local copy once this works.

---

## 5. Install the nginx config

The site config lives in `sites-available`; the cache `map` **must** go in
`conf.d` (a `map` is only valid at `http{}` level).

```bash
# from your machine, in the repo
scp deploy/nginx.conf           root@<VPS_IP>:/etc/nginx/sites-available/dodsmarthealth
scp deploy/nginx-cache-map.conf root@<VPS_IP>:/etc/nginx/conf.d/dod-cache.conf

ssh root@<VPS_IP>
ln -sf /etc/nginx/sites-available/dodsmarthealth /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t          # MUST say "syntax is ok" / "test is successful"
systemctl reload nginx
```

If `nginx -t` complains, fix it before going further — do not cut DNS over to a
server whose config does not parse.

---

## 6. First deploy + test on the subdomain

Push to `main` (or run the workflow by hand from the **Actions** tab). Then, to
test before DNS moves, add the test host temporarily to `server_name`:

```bash
# on the VPS, in /etc/nginx/sites-available/dodsmarthealth
#   server_name dodsmarthealth.com;
# becomes
#   server_name dodsmarthealth.com vps.dodsmarthealth.com;
nginx -t && systemctl reload nginx
```

Now check `http://vps.dodsmarthealth.com`:

- [ ] Home page loads, styling intact
- [ ] Sections fill in (brands, gallery, videos) — they call the Render API
- [ ] `/admin` loads and you can log in
- [ ] `/features` redirects to `/#features`
- [ ] Images and CSS load (no 404s in DevTools)

Fix anything broken **now**, while the live site is still safely on Vercel.

---

## 7. Cut DNS over

Only once step 6 is fully green.

Lower the TTL a few hours ahead if you can. Then repoint:

```
A     @      <YOUR_VPS_IP>
A     www    <YOUR_VPS_IP>
```

(Remove the old Vercel `A` / `CNAME` records.)

Propagation is usually minutes, but allow up to a few hours.

---

## 8. HTTPS

Once DNS resolves to the VPS — **not before**, Let's Encrypt validates over the
live domain:

```bash
ssh root@<VPS_IP>
apt install -y certbot python3-certbot-nginx
certbot --nginx -d dodsmarthealth.com -d www.dodsmarthealth.com
```

Certbot rewrites the config for HTTPS and installs a renewal timer. Verify:

```bash
certbot renew --dry-run
curl -I https://dodsmarthealth.com     # expect HTTP/2 200
```

---

## 9. Update the backend's CORS allowlist

Your API only accepts requests from known origins. It already lists
`https://dodsmarthealth.com` and `https://www.dodsmarthealth.com`, so **no
change is needed** if you keep the same domain.

If you serve the site from any *new* hostname, add it to `allowedOrigins` in
`backend/server.js` and redeploy on Render — otherwise every API call fails and
the sections go blank.

---

## 10. Clean up

Once the VPS has served the live domain happily for a few days:

- Remove the domain from the Vercel project (or delete the project)
- Delete the temporary `vps` DNS record and drop it from `server_name`
- Delete your local copy of the private key
- `vercel.json` / `netlify.toml` can stay in the repo — they're inert, and
  useful if you ever move back

---

## How deploys work now

`git push origin main` → GitHub Actions → `rsync` to `/var/www/dod` → nginx reload.

Watch a run in the **Actions** tab. `rsync --delete` keeps the server byte-identical
to the repo, so a file deleted in git is deleted on the server too.

The workflow excludes `backend/`, `deploy/`, `.git`, `.github`, and `node_modules`,
so server source and CI config are never published.

---

## Rollback

If the VPS goes wrong after cutover, point DNS back at Vercel — it stays deployed
and will start serving again as soon as DNS propagates. That's your safety net,
which is why step 10 (removing Vercel) comes last.
