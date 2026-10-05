## Deploying to DigitalOcean App Platform

The repo includes a `.do/app.yaml` spec for a Static Site component. Use the
DigitalOcean App Platform UI (`Create → App Platform → use Existing Spec`) or
`doctl apps create --spec .do/app.yaml` (ask for approval first, per repo
process).

### One-time DO setup checklist
1. App Platform → Create App → Source: GitHub `mvcyclist/gym` (branch
   `do-app-platform-migration`), or use the spec from this branch.
2. Component type: Static Site (spec in `.do/app.yaml`).
3. Env vars (Build & Run scope): `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY` (secret), optional `VITE_AUTH_REDIRECT_URL`.

### One-time Supabase Auth setup (no schema/data changes)
- Authentication → URL Configuration → Redirect URLs: add
  `https://<your-app>.ondigitalocean.app/**`.
- Site URL may be set to the DO domain.

### Notes
- Vite base path changed from `/gym/` to `/` for a dedicated domain
  (`vercel.json` is left untouched so the existing Vercel deployment keeps
  working until the old config is removed in a separate change or at cutover).
- `catchall_document: index.html` provides the SPA fallback.
