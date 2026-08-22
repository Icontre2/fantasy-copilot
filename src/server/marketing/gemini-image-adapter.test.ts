import assert from 'node:assert/strict';
import test from 'node:test';
import { GEMINI_IMAGE_DEFAULT_MODEL, GeminiImageGeneratorAdapter } from './gemini-image-adapter.ts';

test('Nano Banana usa el modelo barato por defecto y añade los guardrails de LigaLab', async () => {
  let requestBody = '';
  const adapter = new GeminiImageGeneratorAdapter({
    apiKey: 'test-key',
    fetchImpl: (async (_url: string | URL | Request, init?: RequestInit) => {
      requestBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({ output_image: { data: 'aW1hZ2U=', mime_type: 'image/png' } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch,
  });

  const result = await adapter.generar({ contentId: 'LL-20260822-999', prompt: 'Tarjeta sobre una duda Fantasy.' });
  const body = JSON.parse(requestBody);

  assert.equal(body.model, GEMINI_IMAGE_DEFAULT_MODEL);
  assert.equal(body.response_format.aspect_ratio, '4:5');
  assert.match(body.input, /NO generes ni recrees una interfaz de LigaLab/i);
  assert.match(body.input, /captura real/i);
  assert.match(body.input, /No inventes un HEX/i);
  assert.match(result.url, /^data:image\/png;base64,/);
  assert.match(result.provider, /^gemini:/);
});

test('sin GEMINI_API_KEY no hace ninguna llamada de red', async () => {
  let llamadas = 0;
  const adapter = new GeminiImageGeneratorAdapter({
    apiKey: '',
    fetchImpl: (async () => {
      llamadas += 1;
      throw new Error('no debería llegar aquí');
    }) as typeof fetch,
  });

  await assert.rejects(
    () => adapter.generar({ contentId: 'LL-1', prompt: 'algo' }),
    /Falta GEMINI_API_KEY/,
  );
  assert.equal(llamadas, 0);
});

test('un error upstream no se convierte en una imagen inventada', async () => {
  const adapter = new GeminiImageGeneratorAdapter({
    apiKey: 'test-key',
    fetchImpl: (async () => new Response('quota exceeded', { status: 429 })) as typeof fetch,
  });

  await assert.rejects(
    () => adapter.generar({ contentId: 'LL-1', prompt: 'algo' }),
    /Gemini Image respondió 429/,
  );
});

test('una respuesta sin output_image bloquea la generación', async () => {
  const adapter = new GeminiImageGeneratorAdapter({
    apiKey: 'test-key',
    fetchImpl: (async () => new Response(JSON.stringify({}), { status: 200 })) as typeof fetch,
  });

  await assert.rejects(
    () => adapter.generar({ contentId: 'LL-1', prompt: 'algo' }),
    /sin output_image\.data/,
  );
});
