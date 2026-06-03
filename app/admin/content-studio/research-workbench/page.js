import fs from 'fs/promises';
import path from 'path';
import ResearchWorkbenchClient from './ResearchWorkbenchClient';

const DOC_GROUPS = [
  {
    key: 'persona',
    title: '타겟 페르소나',
    paths: ['docs/content-personas.md'],
  },
  {
    key: 'pillars',
    title: '콘텐츠 기둥 · 의도',
    paths: ['config/content-pillars.json'],
  },
  {
    key: 'tone',
    title: '발행 톤 · 구조 가이드',
    directory: 'docs/content-logic/threads',
    extension: '.md',
  },
  {
    key: 'realbody',
    title: '실제 톤 샘플 (realbody)',
    directory: 'docs/reference-data',
    startsWith: 'threads-realbody-',
    extension: '.json',
  },
  {
    key: 'curated',
    title: 'Threads 레퍼런스 노트',
    directory: 'docs/reference-data/threads-curated',
    extension: '.md',
  },
];

async function listGroupFiles(group) {
  if (group.paths) return group.paths;

  const entries = await fs.readdir(path.join(/* turbopackIgnore: true */ process.cwd(), group.directory));
  return entries
    .filter((name) => (!group.startsWith || name.startsWith(group.startsWith)))
    .filter((name) => (!group.extension || name.endsWith(group.extension)))
    .sort()
    .map((name) => `${group.directory}/${name}`);
}

async function readTextFile(relativePath) {
  const absolutePath = path.join(/* turbopackIgnore: true */ process.cwd(), relativePath);
  const raw = await fs.readFile(absolutePath, 'utf8');
  const content = relativePath.endsWith('.json')
    ? JSON.stringify(JSON.parse(raw), null, 2)
    : raw;

  return {
    path: relativePath,
    content,
    lineCount: content.split('\n').length,
    charCount: content.length,
  };
}

async function loadInternalDocs() {
  const groups = await Promise.all(
    DOC_GROUPS.map(async (group) => {
      const files = await listGroupFiles(group);
      const loadedFiles = await Promise.all(files.map(readTextFile));

      return {
        key: group.key,
        title: group.title,
        files: loadedFiles,
        totalLines: loadedFiles.reduce((sum, file) => sum + file.lineCount, 0),
        totalChars: loadedFiles.reduce((sum, file) => sum + file.charCount, 0),
      };
    })
  );

  return groups;
}

export default async function ResearchWorkbenchPage() {
  const internalDocs = await loadInternalDocs();
  const writerModel = process.env.OPENAI_THREAD_MODEL || 'gpt-4o-mini';
  return <ResearchWorkbenchClient internalDocs={internalDocs} writerModel={writerModel} />;
}
