# Integrating With HubSpot I: Foundations Practicum

This repository is for the **Integrating With HubSpot I: Foundations** course practicum. This practicum is one of two requirements for receiving your certification. You must also take the exam and receive a passing grade (at least 75%).

**Full Directions:** [Practicum Instructions](https://app.hubspot.com/academy/l/tracks/1092124/1093824/5493?language=en)

**HubSpot Developer Test Account Custom Objects URL:** https://app.hubspot.com/contacts/l/objects/${custom-obj-number}/views/all/list

---

## Project Status

This is a **starter template** with a modern TypeScript/Express stack. The following routes need to be implemented to complete the practicum:

- [ ] **Route 1**: GET route for homepage - fetches custom object data from HubSpot API
- [ ] **Route 2**: GET route for form page - renders form to create/update custom objects
- [ ] **Route 3**: POST route for form submission - creates/updates custom objects via HubSpot API

See `src/index.ts` lines 23-33 for TODO comments and sample code (lines 35-77).

---

## Tech Stack

### Core
- **Runtime**: Node.js with ES Modules (`"type": "module"`)
- **Language**: TypeScript 5.9
- **Framework**: Express 5.x
- **HTTP Client**: Axios for HubSpot API calls
- **Templating**: Pug (with layout system)

### Build & Optimization
- **Bundler**: Webpack 5
  - **Server Bundle**: `webpack.server.config.ts` - bundles TypeScript to optimized CommonJS (`dist/index.cjs`)
  - **Client Bundle**: `webpack.config.ts` - minifies browser JavaScript with Terser
- **TypeScript Compiler**: `tsc` for type checking
- **CSS Processing**: PostCSS with Tailwind CSS 4.x and cssnano
- **Package Manager**: pnpm

### Development Tools
- **Hot Reload**: `tsx` watch mode for development
- **Concurrent Tasks**: `concurrently` for running dev servers
- **Build Optimization**: TerserPlugin for minification (removes console.log, debugger, comments)

---

## Project Structure

```
brad-hanks-iwh-i-practicum/
├── src/
│   ├── index.ts                    # Main Express server (routes go here)
│   ├── env.d.ts                    # Environment variable types
│   └── types/
│       ├── index.ts                # Type exports barrel
│       ├── hubspot.ts              # HubSpot API response types
│       └── forms.ts                # Form data types
├── views/
│   ├── layout.pug                  # Base layout template (head, fonts, footer)
│   └── contacts.pug                # Sample template (commented out example)
├── public/
│   ├── css/
│   │   ├── style.css               # Source CSS (Tailwind directives)
│   │   └── output.css              # Processed CSS (generated, gitignored)
│   └── js/
│       ├── theme.js                # Theme toggle logic
│       ├── sorting.js              # Client-side sorting
│       ├── tailwind-config.js      # Tailwind configuration
│       └── *.min.js                # Minified versions (generated, gitignored)
├── dist/
│   ├── index.cjs                   # Bundled server (CommonJS, optimized)
│   └── index.cjs.map               # Source map for debugging
├── .env                            # Environment variables (gitignored)
├── .env.example                    # Environment template
├── tsconfig.json                   # TypeScript configuration
├── webpack.server.config.ts        # Server bundling config (Node.js target)
├── webpack.config.ts               # Client bundling config (browser target)
├── postcss.config.ts               # PostCSS + Tailwind config
└── package.json                    # Dependencies and scripts
```

---

## Getting Started

### 1. Installation

```bash
pnpm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` and add your HubSpot credentials:
```env
ACCESS_TOKEN=your-hubspot-private-app-access-token
CUSTOM_OBJECT_TYPE=2-XXXXXXX
```

**Important**: Never commit `.env` to Git. It's already in `.gitignore`.

### 3. Development

Start the development server with hot-reload:

```bash
pnpm dev
```

This runs:
- `tsx watch src/index.ts` - TypeScript server with hot-reload
- `postcss --watch` - CSS processing with Tailwind

Visit: `http://localhost:3000`

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server with hot-reload (TypeScript + CSS) |
| `pnpm build` | Production build (clean → bundle server → bundle client → process CSS) |
| `pnpm start` | Run production build (`node dist/index.cjs`) |
| `pnpm clean` | Remove `dist/` directory |
| `pnpm typecheck` | Type-check without building |
| `pnpm build:server` | Bundle server code with Webpack (production mode) |
| `pnpm build:server:dev` | Bundle server code (development mode, larger output) |
| `pnpm build:client` | Bundle client JavaScript (production mode) |
| `pnpm build:client:dev` | Bundle client JavaScript (development mode) |
| `pnpm build:css` | Process CSS with PostCSS + Tailwind |

---

## Build Process

### Production Build (`pnpm build`)

Runs in sequence:

1. **Clean**: `rm -rf dist`
2. **Bundle Server**: `webpack.server.config.ts`
   - Entry: `src/index.ts`
   - Output: `dist/index.cjs` (~1KB minified)
   - Target: Node.js (CommonJS)
   - Externals: `express`, `axios`, `path`, etc. (not bundled)
   - Optimization: Terser minification, 2-pass compression, preserves function/class names
3. **Bundle Client**: `webpack.config.ts`
   - Entries: `public/js/{theme,sorting,tailwind-config}.js`
   - Outputs: `public/js/*.min.js`
   - Target: Browser (ES5)
   - Optimization: Terser minification, removes `console.log`, strips comments
4. **Process CSS**: PostCSS
   - Input: `public/css/style.css`
   - Output: `public/css/output.css`
   - Plugins: Tailwind CSS, cssnano (minification)

### What Gets Optimized

**Server Code** (`src/index.ts` → `dist/index.cjs`):
- Minified and bundled (62% size reduction)
- Source maps generated
- Function/class names preserved for stack traces
- Console logs preserved (server needs logs)

**Client Code** (`public/js/*.js` → `public/js/*.min.js`):
- Minified with Terser
- Console.log statements removed
- Comments stripped
- Source files kept (not overwritten)

**CSS** (`public/css/style.css` → `public/css/output.css`):
- Tailwind classes processed
- Unused styles purged
- Minified with cssnano

---

## TypeScript Configuration

**Compiler Options** (`tsconfig.json`):
- Target: ES2022
- Module: NodeNext (ES modules with `import`/`export`)
- Strict mode enabled
- Declaration files (`.d.ts`) generated
- Source maps enabled

**Excludes**:
- Root-level `.ts` files (Webpack/PostCSS configs)
- `node_modules`
- `dist`
- `src/types` (types don't need compilation)

---

## Custom Object Schema

The TypeScript types are pre-configured for a custom object with these properties:

**Properties** (see `src/types/hubspot.ts`):
- `name`: string (e.g., neighborhood name)
- `homeownership_rate`: string (percentage)
- `median_home_age`: string (years)

You can modify these types to match your custom object schema.

---

## Practicum Requirements

### Must Complete:
1. ✅ Create a HubSpot developer test account
2. ✅ Add the custom objects URL to this README (line 8)
3. ⬜ Implement Route 1: GET homepage (`/`) - fetch custom objects from HubSpot
4. ⬜ Implement Route 2: GET form page - render Pug template with form
5. ⬜ Implement Route 3: POST form submission - create/update custom object
6. ⬜ Create at least one new Pug template for the homepage
7. ✅ Do NOT commit `.env` or access tokens to Git
8. ✅ Ensure all work is your own (revision history will be checked)
9. ⬜ Merge working branches into `main` before submission

### Sample Code Reference

See commented code in `src/index.ts` (lines 35-77) for:
- `app.get('/contacts')` - Example GET route with HubSpot API
- `app.post('/update')` - Example POST route with HubSpot API

### HubSpot API Endpoints

**Custom Objects**:
```javascript
// GET all custom objects
const url = `https://api.hubspot.com/crm/v3/objects/${process.env.CUSTOM_OBJECT_TYPE}`;

// POST create custom object
const url = `https://api.hubspot.com/crm/v3/objects/${process.env.CUSTOM_OBJECT_TYPE}`;

// PATCH update custom object
const url = `https://api.hubspot.com/crm/v3/objects/${process.env.CUSTOM_OBJECT_TYPE}/${objectId}`;
```

**Headers**:
```javascript
{
  Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
  'Content-Type': 'application/json'
}
```

---

## Tips

- **Commit often**: Push small changes frequently
- **Test your API calls**: Use the HubSpot API reference docs
- **Use the sample code**: The commented code in `index.ts` shows the pattern
- **Check types**: Run `pnpm typecheck` to catch errors early
- **Test production build**: Run `pnpm build && pnpm start` before submitting
- **Get creative**: The custom object subject is up to you!

---

## Security Notes

- ⚠️ **Never commit** `.env` or access tokens to Git
- ⚠️ **Use a test account** for this practicum (not your production HubSpot account)
- ✅ `.env` is already in `.gitignore`
- ✅ Access token is loaded from `process.env.ACCESS_TOKEN`

---

## Dependencies

### Production
- `express` (^5.2.1) - Web framework
- `axios` (^1.13.2) - HTTP client for HubSpot API
- `pug` (^3.0.3) - Template engine
- `dotenv` (^17.2.3) - Environment variable loader

### Development
- `typescript` (^5.9.3)
- `webpack` (^5.96.1) + `webpack-cli` (^5.1.4)
- `ts-loader` (^9.5.4) - TypeScript loader for Webpack
- `webpack-node-externals` (^3.0.0) - Exclude node_modules from server bundle
- `terser-webpack-plugin` (^5.3.11) - JavaScript minification
- `tsx` (^4.21.0) - TypeScript execution for dev/build
- `tailwindcss` (^4.1.18) + `@tailwindcss/postcss` (^4.1.18)
- `postcss` (^8.5.6) + `postcss-cli` (^11.0.1)
- `cssnano` (^7.0.6) - CSS minification
- `concurrently` (^9.2.1) - Run multiple dev servers
- `@types/*` - TypeScript definitions

---

## Troubleshooting

**Port 3000 already in use**:
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Or set a different port
PORT=3001 pnpm dev
```

**Build fails with module errors**:
```bash
pnpm clean
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

**TypeScript errors**:
```bash
pnpm typecheck
```

**HubSpot API 401 Unauthorized**:
- Check `.env` has correct `ACCESS_TOKEN`
- Verify token has access to custom objects in HubSpot settings

---

## License

ISC

## Author

bradhanks
