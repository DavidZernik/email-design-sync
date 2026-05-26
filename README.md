# Email Design Sync

Turn a Figma email design into bullet-proof HTML that renders correctly in Gmail, Apple Mail, Outlook, and the other major clients.

**Live demo:** https://email-design-sync.onrender.com/

> **Current state:** Connecting your own Figma account is intentionally gated behind a "request access" modal while the real Figma → HTML pipeline is being hardened on real designs. The demo path (Try the demo → preview → Convert) is fully working and shows the intended UX end to end.

## What you see when you visit

1. **Try the demo** loads a pre-baked AT&T iPhone SE newsletter as the "input" Figma design and renders it in an iframe.
2. **Convert Figma Design to HTML** plays a 10-second futuristic rendering overlay (five stages, dynamic labels for the priority email clients you ticked), then drops the final HTML into a Preview + Code tab below. Copy it or download the standalone `.html`.
3. **Option 2 (Connect your own Figma)** validates the format of the access token and file key. If both pass, a modal opens directing the visitor to `david@blueinboxllc.com` for access. No real Figma API call happens here yet.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Browser (React web app, src/web/)                       │
│  - WebApp.tsx: main component, demo + access-gate logic  │
│  - sampleEmail.html: hardcoded AT&T iPhone SE design     │
│  - render overlay, code/preview tabs                     │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│  Express server (server/server.js)                       │
│  - serves /dist (compiled React app)                     │
│  - serves /public (sample email images)                  │
│  - proxies Figma REST API for the real-Figma flow        │
│    (currently unreachable from the UI by design)         │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│  Render (https://email-design-sync.onrender.com)         │
│  - free tier, auto-deploys on push to main               │
│  - deploy hook configured                                │
└──────────────────────────────────────────────────────────┘
```

**Sample email images** are referenced as absolute GitHub raw URLs (`raw.githubusercontent.com/DavidZernik/email-design-sync/main/public/images/...`) so the downloaded HTML renders correctly anywhere it lands (Gmail composer, ESP, local file).

**There is also a Figma plugin** (`code.ts`, `manifest.json`, `webpack.config.js`) that compiles to a Figma desktop plugin. It is not how the live demo is reached, and is not the focus of the current iteration. The plugin's actual HTML-conversion logic lives in `src/utils/` (`htmlGenerator.ts`, `warningDetector.ts`, `zipCreator.ts`) and is shared with the web app for when the real-Figma path is unblocked.

## Project structure

```
email-design-sync/
├── server/
│   └── server.js                # Express server
├── public/
│   └── images/                  # Sample email assets (served at /images)
├── src/
│   ├── web/                     # Web app (the live site)
│   │   ├── WebApp.tsx           # Main component
│   │   ├── sampleEmail.html     # Demo email content
│   │   ├── demoFixture.ts       # Demo metadata
│   │   ├── index.tsx, index.html
│   │   └── html.d.ts
│   ├── ui/                      # Shared React components
│   │   ├── components/          # ClientSelector, CodePreview, ExportButton, etc.
│   │   └── styles.css           # App palette: black / white / #2d601d
│   └── utils/                   # HTML generation logic (used by plugin path)
├── code.ts                      # Figma plugin entry (sandbox)
├── manifest.json                # Figma plugin manifest
├── ui.html                      # Figma plugin UI shell
├── webpack.config.js            # Builds the plugin
├── webpack.web.config.js        # Builds the web app
└── dist/                        # Build output (gitignored)
```

## Running locally

```bash
npm install
npm run build:web          # compile React app into dist/
node server/server.js      # serves on http://localhost:3000
```

Open `http://localhost:3000` and click **Try the demo**. The Figma plugin build (`npm run build`) is unrelated to the web app.

## Deploy

`main` auto-deploys to Render. Build command: `npm install && npm run build:web`. Start command: `node server/server.js`. Health check: `/api/health`. No environment variables required.

## Next iteration idea (2026-05-26)

Instead of generating HTML directly from Figma frames (fragile across email clients), use an LLM to read the Figma file, decompose it into sections (hero, feature row, CTA, footer, etc.), and match each section to the closest block from a curated library of pre-tested bullet-proof email templates. The LLM only outputs block IDs + content slots (headline text, image URL, button label); the blocks themselves handle the rendering, so output always renders correctly across Gmail, Apple Mail, Outlook.

Tradeoff: output matches the closest available block rather than Figma 1:1. The Figma becomes a brief, not the source of truth.

Design requirement: confidence threshold or explicit "no block matches, needs new template" output, otherwise the library silently degrades into "whatever's closest" and emails start feeling off-brand. Seed with ~10-20 well-chosen blocks before the matching layer is useful.

## License

MIT
