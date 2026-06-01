import test from 'node:test';
import assert from 'node:assert/strict';

import { getServiceVideoPlaybackProps } from '../lib/serviceVideoPlayback.js';

test('uploaded videos autoplay muted inline by default', () => {
  const props = getServiceVideoPlaybackProps({});

  assert.equal(props.muted, true);
  assert.equal(props.autoPlay, true);
  assert.equal(props.loop, true);
  assert.equal(props.playsInline, true);
  assert.equal(Object.hasOwn(props, 'controls'), false);
});

test('disabled autoplay omits autoplay prop and exposes controls', () => {
  const props = getServiceVideoPlaybackProps({ autoplay: false });

  assert.equal(props.muted, true);
  assert.equal(props.playsInline, true);
  assert.equal(props.controls, true);
  assert.equal(Object.hasOwn(props, 'autoPlay'), false);
  assert.equal(Object.hasOwn(props, 'loop'), false);
});
