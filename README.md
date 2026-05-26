# Email Design Sync - Figma Plugin

A Figma plugin that exports your designs as production-ready HTML email code. Transform your auto-layout frames into table-based HTML emails that work across modern email clients.

## Features

- 🎨 **Clean UI** - Modern React-based interface within Figma
- 📧 **Email Client Support** - Target Gmail, Apple Mail, Yahoo, and more
- 🏗️ **Auto-Layout Conversion** - Automatically converts Figma auto-layout frames to table-based HTML
- 🖼️ **Image Extraction** - Extracts images and packages them in a ZIP file
- ⚠️ **Warning System** - Detects email design anti-patterns before export
- 📋 **Code Preview** - Syntax-highlighted HTML preview with copy/download options
- 🎯 **Template Library** - Pre-built email templates to get started quickly
- ⚙️ **Customizable Settings** - Control max width, minification, and more

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the plugin:
   ```bash
   npm run build
   ```
4. In Figma Desktop:
   - Go to `Plugins` → `Development` → `Import plugin from manifest...`
   - Select the `manifest.json` file from this directory

## Development

To develop with hot reloading:

```bash
npm run watch
```

Then in Figma, load the plugin and it will automatically reload when you make changes.

## Usage

1. **Select a Frame or Component** - Select an auto-layout frame or component in your Figma file
2. **Choose Target Clients** - Select which email clients you want to optimize for
3. **Configure Settings** - Set max width (default 600px) and other options
4. **Export** - Click "Export to HTML" to generate the email code
5. **Review Warnings** - Check any compatibility warnings before using the code
6. **Copy or Download** - Copy the HTML to clipboard or download as ZIP with images

## Email Design Guidelines

This plugin works best with:
- ✅ Auto-layout frames (horizontal or vertical)
- ✅ Solid color backgrounds
- ✅ Standard web fonts (Arial, Helvetica, Georgia, etc.)
- ✅ Simple layouts without absolute positioning

Limited support for:
- ⚠️ Image backgrounds (may not work in all clients)
- ⚠️ Gradient fills
- ⚠️ Custom fonts (will fallback to safe fonts)
- ⚠️ Complex overlays or absolute positioning

## Project Structure

```
emaildesignsync/
├── code.ts              # Main plugin code (runs in Figma sandbox)
├── manifest.json        # Plugin manifest
├── ui.html             # Plugin UI entry point
├── server/
│   └── server.js       # Express web server for web interface
├── src/
│   ├── ui/             # React UI components (used by plugin)
│   │   ├── components/ # UI components
│   │   ├── App.tsx     # Plugin app component
│   │   └── styles.css  # Styles
│   ├── web/            # Web interface components
│   │   ├── index.tsx   # Web app entry point
│   │   ├── index.html  # Web interface HTML
│   │   └── WebApp.tsx  # Web app component (uses REST API)
│   └── utils/          # Utility functions
│       ├── htmlGenerator.ts    # HTML generation logic
│       ├── warningDetector.ts  # Warning detection
│       └── zipCreator.ts       # ZIP file creation
├── webpack.config.js   # Webpack config for plugin build
├── webpack.web.config.js # Webpack config for web interface
└── dist/               # Built files (generated)
```

## Web Interface

The project now includes a standalone web interface that can interact with Figma through the REST API without needing to run the plugin inside Figma.

### Running the Web Interface

1. **Install dependencies** (if you haven't already):
   ```bash
   npm install
   ```

2. **Build and start the web server**:
   ```bash
   npm run start
   ```
   
   Or for development (rebuilds automatically):
   ```bash
   npm run dev:web
   ```

3. **Open your browser**:
   Navigate to `http://localhost:3000`

4. **Connect to Figma**:
   - Get your Figma Personal Access Token from [Figma Settings](https://www.figma.com/developers/api#access-tokens)
   - Enter your access token in the web interface
   - Enter your Figma file key (extract from the Figma file URL: `figma.com/file/[FILE_KEY]/...`)
   - Click "Load File" to fetch nodes from your Figma file

5. **Export Email HTML**:
   - Select a frame or component from the loaded nodes
   - Configure settings (target clients, max width, etc.)
   - Click "Export to HTML" to generate the email code

### Web Interface Features

- 🌐 **Standalone Web App** - No need to install the plugin in Figma
- 🔑 **Figma API Integration** - Connect directly to Figma files via REST API
- 📁 **File Browser** - Load and browse nodes from any Figma file
- ✨ **Same Features** - All the same email export capabilities as the plugin

## Building for Production

### Plugin Build
```bash
npm run build
```

This creates optimized files in the `dist/` directory for the Figma plugin.

### Web Interface Build
```bash
npm run build:web
```

This builds the web interface assets.

## Technologies

- TypeScript
- React
- Webpack
- react-syntax-highlighter
- JSZip

## Next iteration idea (2026-05-26)

Instead of generating HTML directly from Figma frames (fragile across email clients), use an LLM to read the Figma file, decompose it into sections (hero, feature row, CTA, footer, etc.), and match each section to the closest block from a curated library of pre-tested bulletproof email templates. The LLM only outputs block IDs + content slots (headline text, image URL, button label); the blocks themselves handle the rendering, so output always renders correctly across Gmail / Apple Mail / Outlook.

Tradeoff: output matches the closest available block rather than Figma 1:1. The Figma becomes a brief, not the source of truth.

Design requirement: confidence threshold or explicit "no block matches, needs new template" output — otherwise the library silently degrades into "whatever's closest" and emails start feeling off-brand. Seed with ~10-20 well-chosen blocks before the matching layer is useful.

## License

MIT

