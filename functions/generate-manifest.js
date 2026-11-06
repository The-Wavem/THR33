const path = require('path');
const { loadStack } = require(path.join(__dirname, 'node_modules/firebase-functions/lib/runtime/loader'));
const { stackToWire } = require(path.join(__dirname, 'node_modules/firebase-functions/lib/runtime/manifest'));
const fs = require('fs');

async function generate() {
  const stack = await loadStack(__dirname);
  const wire = stackToWire(stack);
  const targetPath = path.join(__dirname, 'functions.yaml');
  fs.writeFileSync(targetPath, JSON.stringify(wire, null, 2), 'utf8');
}

generate().catch(err => {
  console.error("Erro ao gerar manifest:", err);
  process.exit(1);
});
