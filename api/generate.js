
const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require('firebase-admin');

// Firebase Admin SDK 초기화 (이미 초기화되지 않은 경우)
if (!admin.apps.length) {
  try {
    // Vercel 환경 변수에서 서비스 계정 키를 가져옵니다.
    // 이는 JSON 문자열 형태여야 합니다.
    const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK_CONFIG);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error("Firebase Admin SDK 초기화 실패:", error);
  }
}

const db = admin.firestore();

// Gemini API 키를 환경 변수에서 가져옵니다.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 요청 본문을 처리하는 기본 핸들러 함수
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { mode, context } = req.body;

    if (!mode || !context) {
      return res.status(400).json({ error: 'mode와 context는 필수입니다.' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = createPrompt(mode, context);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // 마크다운 제거 (간단한 정규식)
    const cleanText = text.replace(/(\*\*|`|#+\s*)/g, "");

    // 서버에서 Firestore에 결과 저장
    let docRef;
    const dataToSave = {
      uid: context.uid || null, // 클라이언트에서 uid를 전달할 경우 사용
      type: mode,
      rawText: cleanText, // AI 원본 결과 텍스트
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (mode === 'saju') {
      dataToSave.sajuType = context.type;
      dataToSave.userName = context.name; // 이름은 결과 텍스트에 포함되지만, 검색/필터링 용도로 DB에 저장 가능
      dataToSave.dailyStem = context.dailyStem.name;
    } else if (mode === 'tarot') {
      dataToSave.tarotType = context.type;
      // 카드 정보는 이미 클린 텍스트에 포함되어 있으므로, 필요한 경우만 저장
      dataToSave.selectedCards = context.picks.map(card => ({ name: card.name, img: card.img, key: card.key }));
    }

    docRef = await db.collection("results").add(dataToSave);

    res.status(200).json({ result: cleanText, resultId: docRef.id });

  } catch (error) {
    console.error('Gemini API 호출 또는 Firestore 저장 오류:', error);
    res.status(500).json({ error: 'AI 결과 생성 및 저장에 실패했습니다.' });
  }
}

// 모드와 컨텍스트에 따라 다른 프롬프트를 생성하는 함수
function createPrompt(mode, context) {
  const baseInstruction = `
    당신은 '쿼카 운세' 서비스의 마스터 쿼카 점술가입니다. 당신의 역할은 귀엽고 긍정적인 '미소 짓는 쿼카'의 페르소나를 유지하면서, 동시에 매우 깊이 있고 상세한 운세 분석을 제공하는 것입니다.

    ## 페르소나 및 말투 규칙
    1.  **정체성**: 세상에서 가장 긍정적이고 지혜로운 쿼카.
    2.  **어조**: 기본적으로 반말을 사용하며, 친근하고 따뜻한 느낌을 줍니다.
    3.  **쿼카 말투**: 문장 끝에 '~쿼!'를 붙이거나, "쿼카는 말이지~", "귀를 쫑긋! 들어봐쿼!" 같은 추임새를 자연스럽게 섞어 사용해주세요. 내용은 절대 가벼워서는 안 됩니다.

    ## 답변 생성 규칙
    1.  **구조 및 태그**: 반드시 다음 구조와 태그를 사용하여 답변을 생성해야 합니다. 각 태그는 한 줄 전체를 차지해야 합니다.
        [요약]
        (여기에 2~3문장의 짧고 흥미를 끄는 요약 내용을 작성)
        ---
        (여기에 각 주제에 맞는 상세 분석 내용을 태그와 함께 작성)

    2.  **상세 분석**: '---' 뒷부분의 상세 분석은 각 주제에 맞는 태그(예: [과거], [현재], [미래], [조언])를 사용하여 여러 단락으로 매우 상세하게 설명해야 합니다. 비유나 은유, 구체적인 예시를 풍부하게 사용해주세요.
    3.  **분량**: [요약] 부분은 150자 미만, '---' 뒤의 상세 분석은 총 500자 이상이어야 합니다.
    4.  **단락 구분**: 각 단락 사이는 반드시 이중 줄 바꿈(\n\n)으로 구분해주세요.
    5.  **금지 사항**: 전문 용어의 단순 사용, 마크다운 문법(*, **, # 등) 사용은 절대 금지됩니다.
  `;

  if (mode === 'saju') {
    const { name, dailyStem, type } = context;
    let subject = "종합 운세";
    let detailTags = "[본질]\n[종합 흐름]\n[조언]";
    if (type === 'love') {
      subject = "연애운";
      detailTags = "[본질]\n[연애 흐름]\n[조언]";
    }
    if (type === 'wealth') {
      subject = "재물운";
      detailTags = "[본질]\n[재물 흐름]\n[조언]";
    }

    return `
      ${baseInstruction}
      
      ## 상세 분석 규칙
      상세 분석은 다음 태그들을 순서대로 사용해서 작성해주세요:
      ${detailTags}

      ## 사용자 정보
      - 이름: ${name}
      - 타고난 일주(핵심 성향): ${dailyStem.name} (${dailyStem.desc})
      - 궁금한 점: ${subject}
      
      ## 요청
      위 규칙과 사용자 정보를 바탕으로, ${name}님을 위한 ${subject}에 대한 답변을 생성해주세요.
    `;
  }

  if (mode === 'tarot') {
    const { picks, type } = context;
    let subject = "현재 고민";
    let detailTags = "[과거]\n[현재]\n[미래]\n[조언]";
    if (type === 'choice') {
      subject = "양자 택일";
      detailTags = "[선택 A]\n[선택 B]\n[조언]";
    }
    if (type === 'future') {
      subject = "미래 흐름";
      detailTags = "[가까운 미래]\n[장애물]\n[최종 결과]\n[조언]";
    }

    return `
      ${baseInstruction}
      
      ## 상세 분석 규칙
      상세 분석은 다음 태그들을 순서대로 사용해서 작성해주세요:
      ${detailTags}

      ## 사용자 정보
      - 뽑은 카드: 
        1. ${picks[0].name} - ${picks[0].desc}
        2. ${picks[1].name} - ${picks[1].desc}
        3. ${picks[2].name} - ${picks[2].desc}
      - 궁금한 점: ${subject}
      
      ## 요청
      위 규칙과 사용자 정보를 바탕으로, 세 카드의 의미를 유기적으로 연결하여 ${subject}에 대한 답변을 생성해주세요.
    `;
  }

  return "잘못된 모드입니다.";
}
