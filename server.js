import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createClassifier, validateInput, TAXONOMY } from './server/jev.js';

const root = path.dirname(fileURLToPath(import.meta.url));
// Environment takes precedence. Preserve the existing homelab credential reference;
// never return credentials or upstream bodies to the browser or log them.
let apiKey = process.env.TYPESAFE_API_KEY;
if (!apiKey) {
  try {
    const text = fs.readFileSync(path.join(os.homedir(), '.dsh/.credentials.yaml'), 'utf8');
    const value = text.match(/^\s*TYPESAFE_API_KEY:\s*(.+?)\s*$/m)?.[1];
    apiKey = value?.replace(/^(['"])(.*)\1$/, '$2');
  } catch { /* Missing credentials produce an explicit unavailable state. */ }
}

// Pure zero-spend demo mode: simulate Jev System 1 locally unless LIVE_API=true is explicitly set
const isSimulated = process.env.LIVE_API !== 'true';
const classifier = createClassifier({ apiKey: apiKey || 'simulated-demo-key', simulated: isSimulated });
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  if (req.method === 'POST') {
    if (req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({ error: 'Cross-site requests are not allowed' });
    const origin = req.get('origin');
    if (origin) {
      try { if (new URL(origin).host !== req.get('host')) return res.status(403).json({ error: 'Origin does not match this application' }); }
      catch { return res.status(403).json({ error: 'Invalid origin' }); }
    }
    if (!req.is('application/json')) return res.status(415).json({ error: 'Use application/json' });
  }
  next();
});
app.use(express.json({ limit: '8kb' }));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'public/data/blocks.json'), 'utf8'));
app.get('/api/blocks', (_req, res) => res.json({ blocks: catalog }));
app.get('/api/programs', (_req, res) => res.json({ programs: TAXONOMY.programs, defaultProgramId: TAXONOMY.defaultProgramId, defaultPolicy: TAXONOMY.defaultPolicy }));
app.get('/api/health', (_req, res) => res.json({
  status: 'ok',
  apiKeyPresent: Boolean(apiKey || isSimulated),
  blocksCount: catalog.length,
  mode: isSimulated ? 'demo-simulated' : 'upstream-live'
}));
app.get('/api/telemetry', (_req, res) => res.json(classifier.status()));
app.post('/api/classify', async (req, res) => {
  let input;
  try { input = validateInput(req.body); }
  catch (error) { return res.status(400).json({ error: error.message, source: 'error' }); }
  try { res.json(await classifier.classify(input)); }
  catch (error) {
    res.status(error.status || 502).json({ source: 'error', error: error.status ? error.message : 'Jev is unavailable or returned an invalid response. Cargo held for retry.' });
  }
});
app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown API route' }));
app.use(express.static(path.join(root, 'public'), { index: false }));
app.use(express.static(path.join(root, 'dist')));
app.get('/', (_req, res) => res.sendFile(path.join(root, 'dist/index.html')));
app.use((error, _req, res, _next) => res.status(error.type === 'entity.too.large' ? 413 : 400).json({ source: 'error', error: 'Invalid JSON request body' }));
const port = Number(process.env.PORT || 3333);
const server = app.listen(port, '0.0.0.0', () => console.log(`Factory server listening on port ${port}; ${catalog.length} catalog entries`));
process.on('SIGTERM', () => server.close());
