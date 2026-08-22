import assert from 'node:assert/strict';
import test from 'node:test';
import { mapManager } from './mappers.ts';
import { apiManagerSchema } from './schemas.ts';

function manager(raw: Record<string, unknown>) {
  return apiManagerSchema.parse({ id: '42', managerName: 'Artola', ...raw });
}

test('recupera avatar profundamente anidado en profile/media', () => {
  const mapped = mapManager(manager({
    profile: {
      media: {
        avatar: {
          url: 'https://cdn.example.com/artola.jpg',
        },
      },
    },
  }));

  assert.equal(mapped.avatar, 'https://cdn.example.com/artola.jpg');
});

test('no usa una URL cualquiera del manager como foto', () => {
  const mapped = mapManager(manager({
    website: 'https://example.com/profile/42',
    links: { terms: 'https://example.com/terms' },
  }));

  assert.equal(mapped.avatar, '');
});

test('prioriza avatar conocido frente a otros contenedores', () => {
  const mapped = mapManager(manager({
    avatar: 'https://cdn.example.com/preferred.jpg',
    profile: { image: 'https://cdn.example.com/secondary.jpg' },
  }));

  assert.equal(mapped.avatar, 'https://cdn.example.com/preferred.jpg');
});
