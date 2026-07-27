// 파일 위치: api/analyze.js  (Vercel 기준)
//
// Google Gemini API를 사용하는 버전입니다 (무료 티어 있음).
//
// 준비할 것:
// 1) aistudio.google.com/apikey 에서 Gemini API 키 발급 (카드 등록 불필요)
// 2) 호스팅 서비스(Vercel 등)의 프로젝트 설정 > Environment Variables 에
//    이름: GEMINI_API_KEY   값: 발급받은 키   를 등록
//    (이 키는 절대 프론트엔드 코드나 GitHub에 직접 적지 마세요)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '서버에 GEMINI_API_KEY가 설정되어 있지 않습니다' });
  }

  const { content } = req.body || {};
  if (!content) {
    return res.status(400).json({ error: '분석할 content가 없습니다' });
  }

  const parts = content.map(block => {
    if (block.type === 'text') {
      return { text: block.text };
    }
    if (block.type === 'image') {
      return {
        inline_data: {
          mime_type: block.source.media_type,
          data: block.source.data
        }
      };
    }
    return null;
  }).filter(Boolean);

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] })
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({ error: data.error?.message || 'Gemini API 오류' });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return res.status(200).json({ content: [{ type: 'text', text }] });
  } catch (err) {
    return res.status(500).json({ error: err.message || '분석 요청 중 오류가 발생했습니다' });
  }
}
