import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createServiceDetailBlock,
  mergeServiceDetailsForSave,
  normalizeServiceDetailBlocks,
  SERVICE_DETAIL_BLOCKS_SCHEMA_VERSION,
} from '../lib/serviceDetailBlocks.js';

test('story mode blocks keep ordered text, media, grouped images, and CTA items', () => {
  const { blocks, errors } = normalizeServiceDetailBlocks({
    blocks: [{
      id: 'rich-story',
      type: 'rich_text',
      editor_mode: 'story',
      body: '기존 본문',
      story_items: [
        { id: 's1', type: 'text', body: '첫 문단\n직접 줄바꿈', text_size: 'xl', text_weight: 'black' },
        {
          id: 's2',
          type: 'image',
          image: {
            url: '/uploads/detail.jpg',
            alt: '상세 이미지',
            object_position: '80% 25%',
            object_scale: 500,
            natural_width: 1280,
            natural_height: 720,
          },
        },
        {
          id: 's3',
          type: 'image_group',
          variant: 'grid_3',
          frame_ratio: '4:3',
          fit: 'contain',
          images: [
            { url: '/uploads/a.jpg', natural_width: 900, natural_height: 1200 },
            { url: '/uploads/b.jpg' },
          ],
        },
        {
          id: 's4',
          type: 'cta',
          copy: '본문 중간에서 바로 상담으로 연결합니다.',
          button_label: '카카오톡 문의',
          button_href: 'https://pf.kakao.com/example',
        },
      ],
    }],
  });

  assert.deepEqual(errors, []);
  assert.equal(blocks[0].editor_mode, 'story');
  assert.equal(blocks[0].body, '기존 본문');
  assert.equal(blocks[0].story_items.length, 4);
  assert.equal(blocks[0].story_items[0].body, '첫 문단\n직접 줄바꿈');
  assert.equal(blocks[0].story_items[0].text_size, 'xl');
  assert.equal(blocks[0].story_items[0].text_weight, 'black');
  assert.equal(blocks[0].story_items[1].image.object_position, '80% 25%');
  assert.equal(blocks[0].story_items[1].image.object_scale, 250);
  assert.equal(blocks[0].story_items[1].image.natural_width, 1280);
  assert.equal(blocks[0].story_items[2].frame_ratio, '4:3');
  assert.equal(blocks[0].story_items[2].images.length, 2);
  assert.equal(blocks[0].story_items[3].button_href, 'https://pf.kakao.com/example');
});

test('process steps preserve optional images without requiring every step to have one', () => {
  const { blocks, errors } = normalizeServiceDetailBlocks({
    blocks: [{
      id: 'process-1',
      type: 'process',
      steps: [
        {
          step: '01',
          name: '진단',
          desc: '현재 상태를 확인합니다.',
          image: { url: '/uploads/step-1.png', object_scale: 10 },
        },
        {
          step: '02',
          name: '실행',
          desc: '이미지 없이도 저장됩니다.',
        },
      ],
    }],
  });

  assert.deepEqual(errors, []);
  assert.equal(blocks[0].steps.length, 2);
  assert.equal(blocks[0].steps[0].image.url, '/uploads/step-1.png');
  assert.equal(blocks[0].steps[0].image.object_scale, 25);
  assert.equal(Object.hasOwn(blocks[0].steps[1], 'image'), false);
});

test('process and effects variants preserve optional fields through save', () => {
  const effectBlock = createServiceDetailBlock('effects');
  const processBlock = createServiceDetailBlock('process');

  assert.equal(effectBlock.variant, 'benefit_cards');
  assert.equal(processBlock.variant, 'timeline');

  const { details, errors } = mergeServiceDetailsForSave(
    {},
    {
      blocks: [
        {
          id: 'effects-variant',
          type: 'effects',
          variant: 'unknown_variant',
          cards: [
            { metric: '문의 전환 +32%', is_featured: true },
            { before: '문의가 흩어짐', after: '상담 흐름이 정리됨' },
          ],
        },
        {
          id: 'process-variant',
          type: 'process',
          variant: 'default',
          steps: [
            { step: '01', duration: '1주' },
            { step: '02', deliverable: '전략 리포트' },
          ],
        },
        {
          id: 'effects-story',
          type: 'effects',
          variant: 'metric_focus',
          editor_mode: 'story',
          story_items: [{ type: 'text', body: '스토리형 효과 설명' }],
          cards: [{ title: '기본 카드도 보존' }],
        },
      ],
    }
  );

  assert.deepEqual(errors, []);
  assert.equal(details.blocks_schema_version, SERVICE_DETAIL_BLOCKS_SCHEMA_VERSION);
  assert.equal(details.blocks[0].variant, 'benefit_cards');
  assert.equal(details.blocks[0].cards.length, 2);
  assert.equal(details.blocks[0].cards[0].metric, '문의 전환 +32%');
  assert.equal(details.blocks[0].cards[0].is_featured, true);
  assert.equal(details.blocks[0].cards[1].before, '문의가 흩어짐');
  assert.equal(details.blocks[0].cards[1].after, '상담 흐름이 정리됨');
  assert.equal(details.blocks[1].variant, 'timeline');
  assert.equal(details.blocks[1].steps.length, 2);
  assert.equal(details.blocks[1].steps[0].duration, '1주');
  assert.equal(details.blocks[1].steps[1].deliverable, '전략 리포트');
  assert.equal(details.blocks[2].variant, 'metric_focus');
  assert.equal(details.blocks[2].editor_mode, 'story');
  assert.equal(details.blocks[2].story_items[0].body, '스토리형 효과 설명');
});

test('case proof keeps metric media, testimonials, and legacy quote fallback', () => {
  const { blocks, errors } = normalizeServiceDetailBlocks({
    blocks: [{
      id: 'case-proof-1',
      type: 'case_proof',
      media_frame_ratio: '3:4',
      media_fit: 'cover',
      quote: '기존 한 줄 후기는 보존됩니다.',
      metrics: [{
        title: '문의 240%',
        desc: '캠페인 이후 상담 문의 증가',
        media: {
          type: 'youtube',
          url: 'https://youtu.be/dQw4w9WgXcQ',
          thumbnail_url: '/uploads/youtube-thumb.jpg',
        },
      }],
      testimonials: [{
        quote: '사진과 함께 보니 실제 사례처럼 보입니다.',
        author: '브랜드 담당자',
        media: {
          type: 'image',
          url: '/uploads/review.jpg',
          natural_width: 640,
          natural_height: 960,
        },
      }],
    }],
  });

  assert.deepEqual(errors, []);
  assert.equal(blocks[0].media_frame_ratio, '3:4');
  assert.equal(blocks[0].media_fit, 'cover');
  assert.equal(blocks[0].quote, '기존 한 줄 후기는 보존됩니다.');
  assert.equal(blocks[0].metrics[0].media.type, 'youtube');
  assert.equal(blocks[0].metrics[0].media.video_id, 'dQw4w9WgXcQ');
  assert.equal(blocks[0].metrics[0].media.thumbnail_url, '/uploads/youtube-thumb.jpg');
  assert.equal(blocks[0].testimonials[0].media.image.natural_height, 960);
});

test('case proof creates a testimonial from legacy quote when no testimonials exist', () => {
  const { blocks, errors } = normalizeServiceDetailBlocks({
    blocks: [{
      id: 'legacy-case-proof',
      type: 'case_proof',
      quote: '기존 quote만 있는 데이터',
    }],
  });

  assert.deepEqual(errors, []);
  assert.equal(blocks[0].testimonials.length, 1);
  assert.equal(blocks[0].testimonials[0].quote, '기존 quote만 있는 데이터');
});

test('merge for save writes schema version and keeps story fields in blocks JSON', () => {
  const { details, errors } = mergeServiceDetailsForSave(
    { existing: 'kept' },
    {
      blocks: [{
        id: 'intro-story',
        type: 'intro',
        editor_mode: 'story',
        headline: '핵심 소개',
        story_items: [{ type: 'text', body: '소개 본문' }],
      }],
    }
  );

  assert.deepEqual(errors, []);
  assert.equal(details.existing, 'kept');
  assert.equal(details.blocks_schema_version, SERVICE_DETAIL_BLOCKS_SCHEMA_VERSION);
  assert.equal(details.blocks[0].editor_mode, 'story');
  assert.equal(details.blocks[0].story_items[0].body, '소개 본문');
});
