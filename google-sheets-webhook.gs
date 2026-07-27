// 파일 위치: api/analyze.js  (Vercel 기준)
//
// Google Gemini API를 사용하는 버전입니다 (무료 티어 있음).
//
// 준비할 것:
// 1) aistudio.google.com/apikey 에서 Gemini API 키 발급 (카드 등록 불필요)
// 2) 호스팅 서비스(Vercel 등)의 프로젝트 설정 > Environment Variables 에
//    이름: GEMINI_API_KEY   값: 발급받은 키   를 등록
//    (이 키는 절대 프론트엔드 코드나 GitHub에 직접 적지 마세요)
//
// 프론트엔드는 기존과 동일하게 { content: [ {type:"text", text:"..."} , {type:"image", source:{type:"base64", media_type:"image/jpeg", data:"..."}} , ... ] }
// 형태로 이 백엔드에 요청을 보내고, 이 파일이 Gemini가 이해하는 형식으로 변환해서
// 대신 요청한 뒤, 프론트엔드가 기대하는 형식으로 다시 감싸서 돌려줍니다.

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

  // 우리 프론트엔드 형식(type: text/image) → Gemini parts 형식으로 변환
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }]
        })
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({ error: data.error?.message || 'Gemini API 오류' });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 프론트엔드가 기대하는 형식({content:[{type:'text', text:...}]})으로 다시 감싸서 반환
    return res.status(200).json({ content: [{ type: 'text', text }] });
  } catch (err) {
    return res.status(500).json({ error: err.message || '분석 요청 중 오류가 발생했습니다' });
  }
}
