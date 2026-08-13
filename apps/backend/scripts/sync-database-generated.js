/**
 * When npm packs file:../../packages/database (install-links=true), the
 * gitignored generated/prisma tree is omitted. After prisma generate writes
 * into packages/database/generated, copy it into the packed install so
 * require('@ft-transcendence/database') resolves. Symlinked installs need
 * no copy — they already see packages/database/generated.
 */
const fs = require('fs');
const path = require('path');

const backendRoot = path.join(__dirname, '..');
const packedPkg = path.join(
  backendRoot,
  'node_modules',
  '@ft-transcendence',
  'database',
);
const generatedSrc = path.join(
  backendRoot,
  '..',
  '..',
  'packages',
  'database',
  'generated',
);

if (!fs.existsSync(packedPkg)) {
  process.exit(0);
}

if (fs.lstatSync(packedPkg).isSymbolicLink()) {
  process.exit(0);
}

if (!fs.existsSync(path.join(generatedSrc, 'prisma', 'index.js'))) {
  console.error(
    'Prisma client missing at',
    path.join(generatedSrc, 'prisma'),
    '- run db:generate in packages/database first',
  );
  process.exit(1);
}

const generatedDest = path.join(packedPkg, 'generated');
fs.rmSync(generatedDest, { recursive: true, force: true });
fs.cpSync(generatedSrc, generatedDest, { recursive: true });
console.log('Synced packages/database/generated into packed @ft-transcendence/database');
