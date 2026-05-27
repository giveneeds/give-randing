#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'docs', 'reference-data', 'threads-curated');
const INDEX = path.join(DIR, 'index.json');

function fail(message) {
  console.error(`[threads-curated:check] ${message}`);
  process.exitCode = 1;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  if (!fs.existsSync(INDEX)) {
    fail(`index.json 없음: ${INDEX}`);
    return;
  }

  const rows = readJson(INDEX);
  if (!Array.isArray(rows)) {
    fail('index.json 루트는 배열이어야 합니다.');
    return;
  }

  const ids = new Set();
  for (const [idx, row] of rows.entries()) {
    const label = row?.id || `row_${idx}`;
    if (!row?.id) fail(`${label}: id 누락`);
    if (!row?.file) fail(`${label}: file 누락`);
    if (row?.id && ids.has(row.id)) fail(`${label}: 중복 id`);
    if (row?.id) ids.add(row.id);

    const filePath = path.join(DIR, row.file || '');
    if (!row?.file || !fs.existsSync(filePath)) {
      fail(`${label}: 파일 없음 (${row?.file || 'unknown'})`);
      continue;
    }

    const body = fs.readFileSync(filePath, 'utf8');
    const heading = String(row.id).replace(/^ref-/i, 'REF-');
    if (!body.includes(`## ${heading}`)) {
      fail(`${label}: ${row.file} 안에 "## ${heading}" 카드가 없음`);
    }

    for (const key of ['pillars', 'treatments', 'patterns', 'topics', 'keywords']) {
      if (row[key] && !Array.isArray(row[key])) fail(`${label}: ${key}는 배열이어야 함`);
    }
  }

  if (!process.exitCode) {
    console.log(`[threads-curated:check] OK (${rows.length} references)`);
  }
}

main();
