# Bored Box

A chunky, playful arcade of tiny browser games for when you're bored.

## Games

- Snek, Matchup, Xs & Os, Zap, 2048
- Echo, Whack, Showdown, Lights Out

## Run

```bash
npm install
npm run dev
```

## Deploy (Netlify)

```bash
npm run build
npx netlify deploy --prod --dir=out
```

Static export lands in `out/` (see `netlify.toml`).

## Home Screen

Open the site on your phone → Share / Add to Home Screen. Uses `apple-touch-icon` + web manifest.
