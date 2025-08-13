# SFSI — Next.js (Netlify Ready)

## Local Dev
```bash
npm install
npm run dev
```

## Deploy to Netlify (Git)
1. Push to GitHub.
2. On Netlify: New site from Git → select repo.
3. Build command: `npm run build`
4. Publish directory: `.next`
5. (Optional) Add env vars: SANITY_PROJECT_ID, SANITY_DATASET, etc.
6. Deploy.

## Deploy via Netlify CLI
```bash
npm i -g netlify-cli
netlify login
netlify init
netlify deploy --build --prod
```
