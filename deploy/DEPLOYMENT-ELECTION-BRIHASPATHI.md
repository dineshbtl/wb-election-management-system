# Deploy election.brihaspathi.com with HTTPS (Certbot)

This guide points **http://156.67.110.186:4001** to **https://election.brihaspathi.com** using Nginx and Let's Encrypt (Certbot).

## Prerequisites

- Server: `156.67.110.186` (or wherever the app runs)
- Next.js app running on port **4001** (e.g. `npm run start` or `next start -p 4001`)
- DNS: **election.brihaspathi.com** must point to this server’s public IP (`156.67.110.186`)

## 1. Point DNS to the server

In your DNS provider, add an **A** record:

- **Name:** `election` (or `election.brihaspathi.com` if the zone is `brihaspathi.com`)
- **Type:** A  
- **Value:** `156.67.110.186`  
- **TTL:** 300 (or default)

Wait until it resolves:

```bash
dig +short election.brihaspathi.com
# or
nslookup election.brihaspathi.com
```

## 2. Install Nginx and Certbot (on the server)

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

## 3. Add Nginx site config

```bash
# From project root
sudo cp deploy/nginx-election.brihaspathi.com.conf /etc/nginx/sites-available/election.brihaspathi.com.conf
sudo ln -sf /etc/nginx/sites-available/election.brihaspathi.com.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Ensure the Next.js app is listening on **4001** (e.g. `next start -p 4001` or your process manager).

## 4. Get HTTPS certificate with Certbot

```bash
sudo certbot --nginx -d election.brihaspathi.com
```

- Use an email for expiry/security notices.
- Choose whether to redirect HTTP → HTTPS (recommended: Yes).

Certbot will:

- Obtain a certificate from Let's Encrypt
- Update the Nginx config to use HTTPS and (if chosen) redirect HTTP to HTTPS

## 5. Verify

- **HTTP:** http://election.brihaspathi.com → should redirect to HTTPS (if you chose redirect).
- **HTTPS:** https://election.brihaspathi.com → should show the app (same as http://156.67.110.186:4001).

## 6. Auto-renewal

Certbot installs a cron/systemd timer. Test renewal:

```bash
sudo certbot renew --dry-run
```

## 7. Backend over HTTPS (no mixed-content)

The app used to call the backend at `http://<IP>:1337`. On an HTTPS site that is **mixed content** and is blocked by the browser. Nginx proxies the backend under the same domain:

- **Path:** `/backend-api/` → proxied to `http://183.82.117.36:1337/`
- **.env:** Use `NEXT_PUBLIC_API_URL=https://election.brihaspathi.com/backend-api/api` and `NEXT_PUBLIC_BACKEND_URL=https://election.brihaspathi.com/backend-api`

So all API and upload requests go over HTTPS to the same origin and are not blocked.

**Speedtest (survey creation page):** The speedtest component uses `/speedtest-backend/`, proxied to the PHP backend (e.g. `http://156.67.110.186:8080/`). Set `NEXT_PUBLIC_SPEEDTEST_BACKEND_URL=https://election.brihaspathi.com/speedtest-backend` so the test runs over HTTPS.

## 8. Environment variables (app)

For the app to know its public URL and for speedtest/API:

- **Production `.env`:**
  - `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_BACKEND_URL`: your Strapi/API base (use HTTPS if on same domain or subdomain).
  - `NEXT_PUBLIC_SPEEDTEST_BACKEND_URL`: base URL for speedtest backend (e.g. `https://election.brihaspathi.com` if backend is on same server, or the backend’s HTTPS URL). See `.env.example`.

Rebuild after changing env:

```bash
npm run build && npm run start
# or restart your process manager (pm2/systemd)
```

## Optional: Run Next.js under systemd

Example unit so the app restarts on reboot and listens on 4001:

```ini
# /etc/systemd/system/election-nextjs.service
[Unit]
Description=Election Management Next.js
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/btw-election-management-system
ExecStart=/usr/bin/npm run start
Environment=NODE_ENV=production
Environment=PORT=4001
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now election-nextjs
```
