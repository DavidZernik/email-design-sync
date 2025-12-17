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
├── ui.html             # UI entry point
├── src/
│   ├── ui/             # React UI components
│   │   ├── components/ # UI components
│   │   ├── App.tsx     # Main app component
│   │   └── styles.css  # Styles
│   └── utils/          # Utility functions
│       ├── htmlGenerator.ts    # HTML generation logic
│       ├── warningDetector.ts  # Warning detection
│       └── zipCreator.ts       # ZIP file creation
└── dist/               # Built files (generated)
```

## Building for Production

```bash
npm run build
```

This creates optimized files in the `dist/` directory.

## Technologies

- TypeScript
- React
- Webpack
- react-syntax-highlighter
- JSZip

## License

MIT

