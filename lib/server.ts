import { emptyState, type State } from './domain';
import { database } from './db';
import { requireAccount, limitRequest } from './auth';
import { AppError } from './errors';
import { appOrigin } from './config';
import { verifyOrigin } from './security';
export { AppError } from './errors';
export async function user(request: Request): Promise<string> { return (await requireAccount(request)).id; }
export function json(data: unknown, status = 200): Response { return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }); }
export function failure(error: unknown): Response {
  if (error instanceof AppError) return json({ error: error.message }, error.status);
  console.error('Request failed', error instanceof Error ? error.name : 'Error');
  return json({ error: 'Не удалось выполнить операцию. Повторите попытку.' }, 500);
}
export async function readState(owner: string): Promise<{ state: State; revision: number }> {
  const { rows } = await database().query<{ data: State; revision: number }>('SELECT data,revision FROM workspaces WHERE owner=$1', [owner]);
  if (!rows[0]) throw new AppError('Склад не найден', 404);
  return { state: { ...emptyState(), ...rows[0].data }, revision: rows[0].revision };
}
export async function writeState(owner: string, revision: number, state: State): Promise<boolean> {
  const result = await database().query('UPDATE workspaces SET data=$1,revision=revision+1 WHERE owner=$2 AND revision=$3', [JSON.stringify(state), owner, revision]);
  return result.rowCount === 1;
}
export async function requestBytes(request: Request, maximum = 160000): Promise<Buffer> {
  if (Number(request.headers.get('content-length') || 0) > maximum) throw new AppError('Слишком большой запрос', 413);
  const stream = request.body?.getReader();
  if (!stream) throw new AppError('Пустой запрос');
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {
    const { value, done } = await stream.read(); if (done) break;
    size += value.byteLength;
    if (size > maximum) { await stream.cancel(); throw new AppError('Слишком большой запрос', 413); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export async function body(request: Request, maximum = 160000): Promise<Record<string, any>> {
  const bytes = await requestBytes(request, maximum);
  try {
    const data = JSON.parse(bytes.toString('utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data;
  } catch { throw new AppError('Некорректный JSON'); }
}
export function sameOrigin(request: Request): void { verifyOrigin(request, appOrigin().origin); }
export async function gemini(parts: any[], instruction: string): Promise<any> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AppError('Распознавание фото и аудио временно недоступно. Введите позиции текстом или вручную.', 503);
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  for (let n = 0; n < 3; n++) {
    const result = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify({ systemInstruction: { parts: [{ text: instruction }] }, contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0.1 } }), signal: AbortSignal.timeout(35000) });
    if ((result.status === 503 || result.status === 429) && n < 2) { await new Promise(r => setTimeout(r, 700 * (n + 1))); continue; }
    if (!result.ok) throw new AppError('Сервис ИИ недоступен. Повторите позже или внесите позиции вручную.', 502);
    const data: any = await result.json();
    const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('');
    try { return JSON.parse(text); } catch { throw new AppError('ИИ вернул некорректный ответ. Проверьте данные вручную.', 502); }
  }
  throw new AppError('Сервис ИИ перегружен', 503);
}
export async function limitAI(owner: string): Promise<void> { return limitRequest('ai', owner, 12, 60); }
