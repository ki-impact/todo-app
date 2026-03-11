# Deployment – todo-app

**Server:** 178.104.27.120
**Domain:** https://todo-app.ki-impact.de
**Platform:** Hetzner VPS + Coolify
**Repo:** github.com/ki-impact/todo-app

---

## Übersicht

```
GitHub (ki-impact/todo-app)
        ↓  push to main
Coolify (178.104.27.120:8000)
        ↓  build & deploy
Next.js App  ←→  PostgreSQL (Docker)
        ↓
Nginx Reverse Proxy
        ↓
https://todo-app.ki-impact.de
```

---

## Schritt 1 – GitHub Repository anlegen

```bash
# Auf GitHub: neues Repo "todo-app" unter ki-impact anlegen (privat)
# Dann lokal:
cd ~/projects/todo-app
git remote add origin https://github.com/ki-impact/todo-app.git
git push -u origin main
```

> Sicherstellen dass `.deployment-config.json`, `.env.local` und
> `.env.production.local` in `.gitignore` stehen (bereits konfiguriert).

---

## Schritt 2 – DNS konfigurieren

Bei deinem DNS-Provider (ki-impact.de) einen A-Record anlegen:

| Typ | Name       | Wert            | TTL  |
|-----|------------|-----------------|------|
| A   | todo-app   | 178.104.27.120  | 300  |

Warten bis der Record propagiert ist (`dig todo-app.ki-impact.de`).

---

## Schritt 3 – Coolify: Datenbank anlegen

1. Coolify öffnen: **http://178.104.27.120:8000**
2. → **Resources** → **New Resource** → **Database** → **PostgreSQL**
3. Einstellungen:

   | Feld              | Wert                  |
   |-------------------|-----------------------|
   | Name              | `todo-app-db`         |
   | Docker Image      | `postgres:15-alpine`  |
   | Database Name     | `todo_app_db`         |
   | Database User     | `todo_app_user`       |
   | Database Password | `tboF6xnttczii5O80PBIrBgj` |

4. → **Save** → **Start**
5. Warten bis Status **Running** (grün)

---

## Schritt 4 – Coolify: Application anlegen

1. → **Resources** → **New Resource** → **Application**
2. → **GitHub** → Repository `ki-impact/todo-app` auswählen
3. Einstellungen:

   | Feld              | Wert                  |
   |-------------------|-----------------------|
   | Branch            | `main`                |
   | Build Pack        | `Nixpacks`            |
   | Port              | `3000`                |
   | Domain            | `todo-app.ki-impact.de` |

4. → **SSL** aktivieren (Let's Encrypt automatisch)

---

## Schritt 5 – Environment Variables in Coolify setzen

In der Application → **Environment Variables** folgende Werte eintragen:

```
DATABASE_URL=postgresql://todo_app_user:tboF6xnttczii5O80PBIrBgj@todo-app-db:5432/todo_app_db
NEXT_PUBLIC_APP_URL=https://todo-app.ki-impact.de
NEXT_PUBLIC_APP_NAME=todo-app
NODE_ENV=production
```

> **Wichtig:** `todo-app-db` ist der interne Docker-Hostname – funktioniert
> nur wenn die DB in Coolify unter diesem Namen angelegt wurde (Schritt 3).

---

## Schritt 6 – Build Command konfigurieren

In der Application → **Build** folgendes einstellen:

**Build Command:**
```bash
npm run build
```

**Start Command:**
```bash
npx prisma migrate deploy && node .next/standalone/server.js
```

> `prisma migrate deploy` führt ausstehende Migrationen automatisch aus
> bevor der Server startet.

Alternativ als zwei separate Commands falls Coolify das unterstützt:
- Pre-deploy: `npx prisma migrate deploy`
- Start: `npm start`

---

## Schritt 7 – Erste Migration erstellen (lokal)

Vor dem ersten Deploy muss eine Migration erzeugt werden:

```bash
cd ~/projects/todo-app

# Datenbank lokal starten
npm run db:start

# Migration erstellen
npx prisma migrate dev --name init

# Migration committen
git add prisma/migrations/
git commit -m "feat: add initial prisma migration"
git push
```

---

## Schritt 8 – Deploy auslösen

In Coolify → Application → **Deploy**

Oder automatisch durch Push auf `main`:
```bash
git push origin main
```

Coolify erkennt den Push via GitHub Webhook und startet automatisch einen neuen Build.

---

## Schritt 9 – Deployment verifizieren

```bash
# DNS check
dig todo-app.ki-impact.de

# App erreichbar?
curl -I https://todo-app.ki-impact.de

# Logs in Coolify prüfen
# → Application → Logs
```

---

## Datenbank-Verbindungen

| Umgebung   | Host          | Port | URL |
|------------|---------------|------|-----|
| Lokal      | localhost     | 5433 | `postgresql://todo_app_user:***@localhost:5433/todo_app_db` |
| Produktion | todo-app-db   | 5432 | `postgresql://todo_app_user:***@todo-app-db:5432/todo_app_db` |

Die vollständigen Credentials inkl. Passwort stehen in `.deployment-config.json`
(lokal, nicht in Git).

---

## Nützliche Commands

```bash
# Lokal – DB starten
npm run db:start

# Lokal – DB stoppen
npm run db:stop

# Lokal – DB Logs
npm run db:logs

# Lokal – Prisma Studio (DB Browser)
npm run db:studio

# Lokal – Migration erstellen
npx prisma migrate dev --name <name>

# Produktion – Migration manuell via Coolify Terminal
npx prisma migrate deploy
```

---

## GitHub Webhook (automatisches Deployment)

Damit Coolify bei jedem Push automatisch deployed:

1. Coolify → Application → **Settings** → **Webhook URL** kopieren
2. GitHub → Repo → **Settings** → **Webhooks** → **Add webhook**
3. Payload URL: den kopierten Webhook einfügen
4. Content type: `application/json`
5. Events: **Just the push event**
6. → **Add webhook**

---

## Troubleshooting

**App startet nicht:**
→ Coolify Logs prüfen, meistens fehlende Env Variable oder DB nicht erreichbar

**DB Connection refused:**
→ Sicherstellen dass `DATABASE_URL` den internen Docker-Hostnamen `todo-app-db`
  verwendet (nicht `localhost`)

**Migration schlägt fehl:**
→ `npx prisma migrate status` im Coolify Terminal prüfen

**SSL-Zertifikat fehlt:**
→ DNS muss erst vollständig propagiert sein, dann in Coolify SSL erneuern
