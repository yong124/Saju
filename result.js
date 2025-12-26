document.addEventListener('DOMContentLoaded', async () => {
    // ================= 1. DOM 요소 =================
    const dom = {
        loading: document.getElementById('loading'),
        resultArea: document.getElementById('result-area'),
        resultContent: document.getElementById('result-content'),
        resultTitle: document.getElementById('result-title'),
        resultSummary: document.getElementById('result-summary'),
        resultDetails: document.getElementById('result-details'),
        tarotResultImages: document.getElementById('tarot-result-images'),
        errorMessage: document.getElementById('error-message'),
    };

    // ================= 2. Firebase 초기화 =================
    let db;
    try {
        firebase.initializeApp(window.firebaseConfig);
        db = firebase.firestore();
    } catch (e) {
        console.error("Firebase 초기화 실패:", e);
        showError("서비스에 연결할 수 없습니다.");
        return;
    }

    // ================= 3. 핵심 로직 =================
    
    // URL에서 결과 ID 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const resultId = urlParams.get('id');

    if (!resultId) {
        showError("유효하지 않은 접근입니다.");
        return;
    }

    // 데이터 로드 및 렌더링
    try {
        const docRef = db.collection("results").doc(resultId);
        const docSnap = await docRef.get();

        if (!docSnap.exists()) {
            showError("존재하지 않거나 삭제된 결과입니다.");
            return;
        }

        const data = docSnap.data();
        
        // Open Graph 메타 태그 업데이트
        updateOGTags(data);
        
        // 결과 렌더링
        renderResult(data);

    } catch (error) {
        console.error("결과 로딩 실패:", error);
        showError("결과를 불러오는 중 오류가 발생했습니다.");
    }


    // ================= 4. UI 헬퍼 함수 =================

    function showError(message) {
        dom.loading.classList.add('hidden');
        dom.resultContent.classList.add('hidden');
        dom.errorMessage.classList.remove('hidden');
        dom.errorMessage.querySelector('p.font-title').textContent = message;
    }
    
    function updateOGTags(data) {
        let title = "AI 쿼카 운세 결과";
        let description = "AI가 분석해준 당신의 운세 결과를 확인해보세요!";
        
        if (data.type === 'saju') {
            title = `${data.result.name}님의 사주 운세 결과`;
            description = `[${data.result.dailyStem}] ${description}`;
        } else if (data.type === 'tarot') {
            title = `AI 타로 카드 해석 결과`;
            description = `선택한 카드: ${data.result.cards.map(c => c.name).join(', ')}`;
        }
        
        document.querySelector('meta[property="og:title"]').setAttribute('content', title);
        document.querySelector('meta[property="og:description"]').setAttribute('content', description);
    }

    function renderResult(data) {
        let titleText = '';
        let isTarot = data.type === 'tarot';

        // 제목 설정
        if (isTarot) {
            titleText = "AI가 해석한 당신의 카드";
        } else {
            titleText = `"${data.result.dailyStem}"의 기운을 가진 ${data.result.name}님!`;
        }
        dom.resultTitle.innerText = titleText;
        
        // 타로 이미지 렌더링
        dom.tarotResultImages.classList.toggle('hidden', !isTarot);
        if(isTarot && data.result.cards) {
             dom.tarotResultImages.innerHTML = data.result.cards.map(card => `<div class="rounded-lg overflow-hidden border border-[#E0E0E0]"><img src="${card.img}" class="w-full"></div>`).join('');
        }
        
        // AI 결과 텍스트 파싱 및 표시
        // 참고: 공유 시점에는 전체 rawText가 저장되지 않으므로, 저장된 데이터 기준으로 재구성하거나,
        // 저장 시 rawText도 함께 저장해야 합니다. 현재 로직에서는 저장된 데이터 기반으로 단순 표시합니다.
        // `script.js`의 `saveSajuResult`, `saveTarotResult`에 `rawText`를 추가 저장이 필요합니다. 
        // 지금은 간략하게 표시합니다.
        
        let rawText = data.rawText; // Firestore에 rawText가 저장되어 있다고 가정
        if(!rawText) {
            // rawText가 없는 경우를 위한 대체 표시
            if(isTarot) {
                rawText = "[요약]\n" + data.result.cards.map(c => `${c.name}: ${c.key}`).join('\n');
            } else {
                const stemInfo = SIXTY_JIAZI.find(s => s.name === data.result.dailyStem);
                rawText = "[요약]\n" + (stemInfo ? stemInfo.desc : "전반적으로 좋은 하루입니다.");
            }
        }


        const parts = rawText.split('---');
        const summary = parts[0].replace('[요약]', '').trim();
        const details = parts.length > 1 ? parts[1].trim() : '';

        dom.resultSummary.textContent = summary;

        const detailContainer = dom.resultDetails;
        detailContainer.innerHTML = '';
        
        if(details) {
            const detailRegex = /.*\[(.*?)\].*\n([\s\S]*?)(?=\n\[|$)/g;
            let match;
            while ((match = detailRegex.exec(details)) !== null) {
                const heading = match[1].trim();
                const content = match[2].trim();
                
                if (heading && content) {
                    const headingEl = document.createElement('h3');
                    headingEl.className = 'detail-heading';
                    headingEl.textContent = heading;
                    
                    const contentEl = document.createElement('div');
                    contentEl.className = 'detail-content bg-[#FFFCF5] p-4 rounded-lg border border-[#F0E6D2] text-sm';
                    contentEl.textContent = content;

                    detailContainer.appendChild(headingEl);
                    detailContainer.appendChild(contentEl);
                }
            }
        }
        
        // 로딩 숨기고 결과 표시
        dom.loading.classList.add('hidden');
        dom.resultContent.classList.remove('hidden');
    });
