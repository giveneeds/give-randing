import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createServiceVideoStoragePath,
  MAX_SERVICE_VIDEO_BYTES,
  normalizeServiceMediaFolder,
  validateServiceVideoUploadInput,
} from '../lib/serviceMediaUpload.js';

test('service media folder accepts only service and service draft paths', () => {
  assert.deepEqual(normalizeServiceMediaFolder('services/service-1'), {
    ok: true,
    folder: 'services/service-1',
  });
  assert.deepEqual(normalizeServiceMediaFolder('services/drafts/draft_1'), {
    ok: true,
    folder: 'services/drafts/draft_1',
  });

  assert.equal(normalizeServiceMediaFolder('../x').ok, false);
  assert.equal(normalizeServiceMediaFolder('https://example.com/x').ok, false);
  assert.equal(normalizeServiceMediaFolder('services/../../x').ok, false);
  assert.equal(normalizeServiceMediaFolder('campaigns/abc').ok, false);
  assert.equal(normalizeServiceMediaFolder('services/a/b/c').ok, false);
});

test('service video upload validation enforces size and MIME-extension pairing', () => {
  const valid = validateServiceVideoUploadInput({
    kind: 'video',
    file_name: 'demo.mp4',
    file_type: 'video/mp4',
    file_size: 1024,
    folder: 'services/service-1',
  });

  assert.equal(valid.ok, true);
  assert.equal(valid.ext, 'mp4');
  assert.equal(createServiceVideoStoragePath(valid, 'one.mp4'), 'services/service-1/videos/one.mp4');

  assert.equal(validateServiceVideoUploadInput({
    kind: 'video',
    file_name: 'demo.exe',
    file_type: 'application/octet-stream',
    file_size: 1024,
    folder: 'services/service-1',
  }).ok, false);

  assert.equal(validateServiceVideoUploadInput({
    kind: 'video',
    file_name: 'demo.mp4',
    file_type: 'video/webm',
    file_size: 1024,
    folder: 'services/service-1',
  }).ok, false);

  assert.equal(validateServiceVideoUploadInput({
    kind: 'video',
    file_name: 'demo.webm',
    file_type: 'video/webm',
    file_size: MAX_SERVICE_VIDEO_BYTES + 1,
    folder: 'services/service-1',
  }).ok, false);
});
