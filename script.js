const App = (function () {
    // ================= 1. 설정값 =================
    const config = {
        googleAdSenseClientId: 'ca-pub-YOUR_ADSENSE_CLIENT_ID',
        googleAnalyticsId: 'YOUR_GA_TRACKING_ID',
        portOneIamportId: 'imp10391932',
        paymentPg: 'html5_inicis',
        paymentMethod: 'card',
        paymentAmount: 3000,
        paymentProductName: '쿼카 운세 시크릿 리포트',
        epochDate: '2024-01-01',
        epochIndex: 40,
        tarotShuffleCount: 6,
        tarotPickCount: 3
    };

    // ================= 2. 상태 관리 =================
    const state = {
        currentUser: null,
        isInitialAuthCheck: true,
        currentMode: 'saju',
        sajuType: 'total',
        tarotType: 'situation',
        selectedCards: [],
        lastSajuResult: null,
    };

    // ================= 3. DOM 요소 =================
    const dom = {};
    
    // ================= 4. Firebase 인스턴스 =================
    let auth, db;

    // ================= 5. 핵심 로직 (UI와 무관) =================
    const logic = {
        validateSajuInput: (name, birth) => {
            const errors = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (!name.trim()) errors.push({ field: dom.userName, message: "이름을 입력해주세요." });
            else if (/[^가-힣a-zA-Z]/.test(name)) errors.push({ field: dom.userName, message: "이름은 한글 또는 영문만 입력 가능해요." });
            if (!birth) errors.push({ field: dom.userBirth, message: "생년월일을 선택해주세요." });
            else if (new Date(birth) > today) errors.push({ field: dom.userBirth, message: "생년월일은 오늘 이후일 수 없어요." });
            return errors;
        },
        getDailyStem: (date) => {
            const epoch = new Date(config.epochDate);
            const diffTime = date.getTime() - epoch.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            let dailyIndex = (config.epochIndex + diffDays) % 60;
            if (dailyIndex < 0) dailyIndex += 60;
            return SIXTY_JIAZI[dailyIndex] || SIXTY_JIAZI[0];
        },
        shuffleDeck: () => {
            let shuffledDeck = [...TAROT_DECK];
            for (let i = shuffledDeck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
            }
            return shuffledDeck;
        },
        getPremiumSajuReport: (sajuResult) => {
            const yearStem = SIXTY_JIAZI[(sajuResult.birthDate.getFullYear() - 4) % 10];
            const monthStem = SIXTY_JIAZI[sajuResult.birthDate.getMonth() % 10];
            return `<div class="space-y-4 text-left"><p><strong>🌳 초년운 (년주: ${yearStem.stem}):</strong> 당신의 인생 초반은 ${yearStem.nature}의 기운처럼, 새로운 것을 배우고 탐험하는 데 강한 에너지를 보입니다. 때로는 성급할 수 있지만, 순수한 열정이 당신의 길을 열어줍니다.</p><p><strong>🔥 중년운 (월주: ${monthStem.stem}):</strong> 사회생활이 활발해지는 시기에는 ${monthStem.nature}의 특성이 나타납니다. 사람들과의 관계 속에서 자신의 역할을 찾고, 현실적인 성취를 이루려는 노력이 중요해집니다.</p><p><strong>⛰️ 당신의 본질 (일주: ${sajuResult.dailyStem.name}):</strong> ${sajuResult.dailyStem.desc} 이는 당신의 인생 전반에 걸쳐 가장 핵심적인 성향으로 작용합니다.</p><hr class="my-4 border-gray-200"><p class="font-bold">✨ 2025 종합 조언: 당신의 ${sajuResult.dailyStem.nature} 기운은 내년에 새로운 기회를 맞이할 것입니다. 초년의 열정과 중년의 현실 감각을 조화롭게 사용한다면, 큰 성취를 이룰 수 있는 한 해가 될 것입니다.</p></div>`;
        },
        getPremiumTarotReport: (cards) => {
            return `<div class="space-y-4 text-left"><p><strong>✨ 종합 해석:</strong> 당신의 질문에 대한 카드의 흐름은 <strong>'${cards[0].key}'</strong>에서 시작하여, <strong>'${cards[1].key}'</strong>의 과정을 거쳐, 궁극적으로 <strong>'${cards[2].key}'</strong>의 결과로 나아감을 보여줍니다. 이는 과거의 경험이 현재의 도전을 만들고, 이를 극복하는 과정이 미래의 성취로 이어짐을 의미합니다.</p><hr class="my-4 border-gray-200"><div><h4 class="font-bold mb-2 text-lg text-center">세부 카드 분석</h4><div class="space-y-3"><p><strong>긍정적 측면:</strong> 당신은 <strong>'${cards[0].name}'</strong>의 지혜와 <strong>'${cards[2].name}'</strong>의 잠재력을 모두 가지고 있습니다. 이를 잘 활용하세요.</p><p><strong>주의할 점:</strong> 다만, <strong>'${cards[1].name}'</strong> 카드가 암시하는 현재의 장애물을 경계해야 합니다. ${cards[1].desc}</p></div></div></div>`;
        },
        saveSajuResult: (sajuResult) => {
            if (!state.currentUser) {
                ui.showToast("로그인하면 결과를 저장하고 다시 볼 수 있어요!", "info");
                return;
            }
            db.collection("results").add({
                uid: state.currentUser.uid,
                type: 'saju',
                sajuType: state.sajuType,
                result: {
                    name: dom.userName.value,
                    birth: dom.userBirth.value,
                    dailyStem: sajuResult.dailyStem.name,
                },
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => ui.showToast("운세 결과가 저장되었습니다."))
            .catch(err => console.error("Error saving result: ", err));
        },
        saveTarotResult: (cards) => {
            if (!state.currentUser) {
                ui.showToast("로그인하면 결과를 저장하고 다시 볼 수 있어요!", "info");
                return;
            }
            db.collection("results").add({
                uid: state.currentUser.uid,
                type: 'tarot',
                tarotType: state.tarotType,
                result: {
                    cards: cards.map(c => c.name),
                },
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => ui.showToast("운세 결과가 저장되었습니다."))
            .catch(err => console.error("Error saving result: ", err));
        },
        loadMyResults: async () => {
            if (!state.currentUser) return [];
            try {
                const snapshot = await db.collection("results")
                    .where("uid", "==", state.currentUser.uid)
                    .orderBy("createdAt", "desc")
                    .limit(10)
                    .get();
                
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (err) {
                console.error("Error loading results: ", err);
                ui.showToast('과거 운세 정보를 불러오는 데 실패했습니다.', 'error');
                return [];
            }
        },

    };

    // ================= 6. UI 렌더링 및 조작 =================
    const ui = {
        updateLoginStatus: (user) => {
            if (user) {
                dom.loginBtn.textContent = '로그아웃';
                dom.myResultsBtn.classList.remove('hidden');
                if (!state.isInitialAuthCheck) {
                    ui.showToast(`환영합니다, ${user.displayName}님!`);
                }
            } else {
                dom.loginBtn.textContent = '로그인';
                dom.myResultsBtn.classList.add('hidden');
                if (!state.isInitialAuthCheck) {
                    ui.showToast('로그아웃되었습니다.');
                }
            }
        },
        showMyResults: () => {
            dom.sajuSection.classList.add('hidden');
            dom.tarotSection.classList.add('hidden');
            dom.resultArea.classList.add('hidden');
            dom.myResultsSection.classList.remove('hidden');
        },
        renderMyResults: (results) => {
            if (results.length === 0) {
                dom.myResultsList.innerHTML = '<p class="text-center text-gray-500 py-10">저장된 운세 결과가 없습니다.</p>';
                return;
            }
            dom.myResultsList.innerHTML = results.map(r => {
                const date = r.createdAt?.toDate().toLocaleDateString('ko-KR') || '날짜 미상';
                let title = '';
                if (r.type === 'saju') {
                    title = `[사주] ${r.result.dailyStem}`;
                } else {
                    title = `[타로] ${r.result.cards[1]}`;
                }
                return `
                    <div class="p-4 bg-white rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-50" data-result-id="${r.id}">
                        <p class="text-xs text-gray-400">${date}</p>
                        <p class="font-bold pointer-events-none">${title}</p>
                    </div>
                `;
            }).join('');
        },
        showToast: (message, type = 'success') => {
            let container = document.getElementById('toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toast-container';
                container.className = 'toast-container';
                document.body.appendChild(container);
            }
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerText = message;
            container.appendChild(toast);
            setTimeout(() => {
                toast.classList.add('fade-out');
                toast.addEventListener('animationend', () => toast.remove());
            }, 3000);
        },
        showInputError: (field, message) => {
            field.classList.add('border-red-500', 'animate-shake');
            let errorEl = field.parentElement.querySelector('.error-message');
            if (!errorEl) {
                errorEl = document.createElement('p');
                errorEl.className = 'error-message text-xs text-red-500 mt-1 pl-1';
                field.parentElement.appendChild(errorEl);
            }
            errorEl.innerText = message;
            field.addEventListener('animationend', () => field.classList.remove('animate-shake'), { once: true });
        },
        clearInputErrors: () => {
            document.querySelectorAll('.input-field').forEach(field => {
                field.classList.remove('border-red-500');
                const errorEl = field.parentElement.querySelector('.error-message');
                if (errorEl) errorEl.remove();
            });
        },
        setMode: (mode) => {
            state.currentMode = mode;
            dom.tabSaju.classList.toggle('active', mode === 'saju');
            dom.tabTarot.classList.toggle('active', mode === 'tarot');
            dom.sajuSection.classList.add('hidden');
            dom.tarotSection.classList.add('hidden');
            dom.resultArea.classList.add('hidden');
            dom.myResultsSection.classList.add('hidden');
            dom[mode + 'Section'].classList.remove('hidden');
        },
        setSajuType: (type) => {
            state.sajuType = type;
            dom.sajuOptions.querySelectorAll('.chip').forEach(btn => btn.classList.remove('active'));
            dom.sajuOptions.querySelector(`#st-${type}`).classList.add('active');
        },
        setTarotType: (type) => {
            state.tarotType = type;
            dom.tarotOptions.querySelectorAll('.chip').forEach(btn => btn.classList.remove('active'));
            dom.tarotOptions.querySelector(`#tt-${type}`).classList.add('active');
        },
        showLoading: () => {
            dom.sajuSection.classList.add('hidden');
            dom.tarotSection.classList.add('hidden');
            dom.myResultsSection.classList.add('hidden');
            dom.resultArea.classList.remove('hidden');
            dom.loading.classList.remove('hidden');
            dom.resultContent.classList.add('hidden');
        },
        showLoading: () => {
            dom.sajuSection.classList.add('hidden');
            dom.tarotSection.classList.add('hidden');
            dom.myResultsSection.classList.add('hidden');
            dom.resultArea.classList.remove('hidden');
            dom.loading.classList.remove('hidden');
            dom.resultContent.classList.add('hidden');
            // 이전 결과 초기화
            dom.resultSummary.innerHTML = '';
            dom.resultDetails.innerHTML = '';
            dom.resultDetails.classList.add('hidden');
            dom.readMoreBtn.classList.remove('hidden');
            dom.readMoreBtn.textContent = '🐿️ 더 자세히 보기';
        },
        parseAndDisplayStructuredResult: (title, rawText, isTarot) => {
            dom.loading.classList.add('hidden');
            dom.resultContent.classList.remove('hidden');
            dom.resultTitle.innerText = title;
            dom.tarotResultImages.classList.toggle('hidden', !isTarot);

            const parts = rawText.split('---');
            const summary = parts[0].replace('[요약]', '').trim();
            const details = parts.length > 1 ? parts[1].trim() : '';

            dom.resultSummary.textContent = summary;

            if (!details) {
                dom.readMoreBtn.classList.add('hidden');
                return;
            }

            // 상세 분석 파싱 및 표시
            const detailContainer = dom.resultDetails;
            detailContainer.innerHTML = ''; // 이전 내용 초기화
            
            // 정규식을 사용하여 태그와 내용을 분리
            const detailRegex = /\[(.*?)\]\n([\s\S]*?)(?=\n\[|$)/g;
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
        },
        showPremiumReport: () => {
            dom.resultTitle.innerText = "✨ 당신만을 위한 2025 대운 리포트";
            let premiumContent = '';
            if (state.currentMode === 'saju') premiumContent = logic.getPremiumSajuReport(state.lastSajuResult);
            else premiumContent = logic.getPremiumTarotReport(state.selectedCards);
            dom.resultBody.innerHTML = premiumContent;
            dom.premiumBanner.classList.add('hidden');
            dom.adBanner.classList.add('hidden');
            ui.showToast('결제 완료! 프리미엄 리포트를 확인하세요.');
        },
        renderTarotCards: (deck) => {
            dom.cardGrid.innerHTML = '';
            let labels = ["과거", "현재", "미래"];
            if (state.tarotType === 'choice') labels = ["선택 A", "선택 B", "조언"];
            if (state.tarotType === 'future') labels = ["가까운 미래", "장애물", "최종 결과"];
            dom.pickInstruction.innerText = `👇 순서대로 뽑아주세요 (${labels.join(' ➔ ')})`;
            for (let i = 0; i < config.tarotShuffleCount; i++) {
                const cardData = deck[i];
                const card = document.createElement('div');
                card.className = 'tarot-scene';
                card.innerHTML = `<div class="tarot-obj"><div class="face face-back"></div><div class="face face-front"><img src="${cardData.img}" alt="${cardData.name}"></div></div>`;
                card.addEventListener('click', () => handlers.onSelectCard(card, cardData));
                dom.cardGrid.appendChild(card);
            }
        }
    };

    // ================= 7. 이벤트 핸들러 =================
    const handlers = {
        onAuthClick: () => {
            if (state.currentUser) handlers.onSignOut();
            else handlers.onSignInGoogle();
        },
        onShowMyResults: async () => {
            ui.showMyResults();
            const results = await logic.loadMyResults();
            ui.renderMyResults(results);
        },
        onSignInGoogle: () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            firebase.auth().signInWithPopup(provider).catch(error => {
                console.error("Google 로그인 실패:", error);
                ui.showToast('로그인에 실패했습니다. 다시 시도해주세요.', 'error');
            });
        },
        onSignOut: () => {
            firebase.auth().signOut();
        },
        onReadMore: () => {
            dom.readMoreBtn.textContent = '... 쿼카가 더 알려줄게!';
            dom.readMoreBtn.classList.add('hidden');
            dom.resultDetails.classList.remove('hidden');
        },
        onCalculateSaju: async () => {
            ui.clearInputErrors();
            const name = dom.userName.value;
            const birth = dom.userBirth.value;
            const errors = logic.validateSajuInput(name, birth);
            if (errors.length > 0) {
                errors.forEach(err => ui.showInputError(err.field, err.message));
                ui.showToast('입력 내용을 다시 확인해주세요.', 'error');
                return;
            }

            ui.showLoading();
            if (window.gtag) gtag('event', 'click_saju_result', { 'event_category': 'Saju', 'event_label': state.sajuType });

            const userBirthDate = new Date(birth);
            const myDailyStem = logic.getDailyStem(userBirthDate);
            state.lastSajuResult = { dailyStem: myDailyStem, birthDate: userBirthDate };

            try {
                const response = await fetch('/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mode: 'saju',
                        context: {
                            name: name,
                            dailyStem: myDailyStem,
                            type: state.sajuType
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error('AI 서버에서 응답을 받지 못했습니다.');
                }

                const data = await response.json();
                const title = `"${myDailyStem.name}"의 기운을 가진 ${name}님!`;
                
                ui.parseAndDisplayStructuredResult(title, data.result, false);
                logic.saveSajuResult(state.lastSajuResult);

            } catch (error) {
                console.error("Saju AI 분석 실패:", error);
                ui.showToast('AI 운세 분석에 실패했어요. 잠시 후 다시 시도해주세요.', 'error');
                // 에러 발생 시, 원래 화면으로 복구하거나 에러 메시지를 보여주는 UI 추가 가능
                ui.setMode('saju'); // 예: 사주 입력 화면으로 복귀
            }
        },
        onStartShuffle: () => {
            dom.tarotIntro.classList.add('hidden');
            dom.tarotShuffle.classList.remove('hidden');
        },
        onStopShuffle: () => {
            dom.tarotShuffle.classList.add('hidden');
            dom.tarotSelect.classList.remove('hidden');
            state.selectedCards = [];
            const shuffledDeck = logic.shuffleDeck();
            ui.renderTarotCards(shuffledDeck);
        },
        onSelectCard: (el, cardData) => {
            if (state.selectedCards.length >= config.tarotPickCount || el.classList.contains('flipped')) return;
            el.classList.add('flipped');
            state.selectedCards.push(cardData);
            if (state.selectedCards.length === config.tarotPickCount) setTimeout(handlers.onAnalyzeTarot, 1000);
        },
        onAnalyzeTarot: async () => {
            ui.showLoading();
            if (window.gtag) gtag('event', 'click_tarot_result', { 'event_category': 'Tarot', 'event_label': state.tarotType });

            try {
                const response = await fetch('/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mode: 'tarot',
                        context: {
                            picks: state.selectedCards,
                            type: state.tarotType
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error('AI 서버에서 응답을 받지 못했습니다.');
                }

                const data = await response.json();
                const title = "AI가 해석한 당신의 카드";
                
                dom.tarotResultImages.innerHTML = state.selectedCards.map(card => `<div class="rounded-lg overflow-hidden border border-[#E0E0E0]"><img src="${card.img}" class="w-full"></div>`).join('');
                
                ui.parseAndDisplayStructuredResult(title, data.result, true);
                logic.saveTarotResult(state.selectedCards);

            } catch (error) {
                console.error("Tarot AI 분석 실패:", error);
                ui.showToast('AI 타로 분석에 실패했어요. 잠시 후 다시 시도해주세요.', 'error');
                ui.setMode('tarot'); // 예: 타로 입력 화면으로 복귀
            }
        },
        onShareResult: async () => {
            const originalButtonText = dom.shareResultBtn.innerHTML;
            dom.shareResultBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> 이미지 생성중...';
            dom.shareResultBtn.disabled = true;
            try {
                const canvas = await html2canvas(dom.resultContent, { useCORS: true, scale: 2 });
                canvas.toBlob(async (blob) => {
                    if (navigator.canShare && navigator.canShare({ files: [new File([blob], 'result.png', { type: 'image/png' })] })) {
                        await navigator.share({ title: 'Vibe Saju & Tarot 결과', text: 'AI가 분석해준 내 운세 결과를 확인해보세요!', files: [new File([blob], 'result.png', { type: 'image/png' })] });
                    } else {
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        try {
                            await navigator.clipboard.writeText(window.location.href);
                            ui.showToast('이미지 다운로드 시작! 페이지 링크가 복사되었어요.');
                        } catch (err) { ui.showToast('결과 이미지를 다운로드합니다.'); }
                        link.download = 'vibe-saju-result.png';
                        link.click();
                    }
                    dom.shareResultBtn.innerHTML = originalButtonText;
                    dom.shareResultBtn.disabled = false;
                }, 'image/png');
            } catch (error) {
                console.error('이미지 생성 오류:', error);
                ui.showToast('이미지 생성에 실패했어요. 잠시 후 다시 시도해주세요.', 'error');
                dom.shareResultBtn.innerHTML = originalButtonText;
                dom.shareResultBtn.disabled = false;
            }
        },
        onRequestPay: () => {
            ui.clearInputErrors();
            const buyerName = dom.buyerName.value.trim();
            if (!buyerName) {
                ui.showInputError(dom.buyerName, "리포트를 받을 분의 이름을 입력해주세요.");
                ui.showToast('구매자 이름을 입력해주세요.', 'error');
                return;
            }
            if (window.gtag) gtag('event', 'click_premium_report', { 'event_category': 'Monetization', 'event_label': state.currentMode });
            IMP.request_pay({
                pg: config.paymentPg, pay_method: config.paymentMethod, merchant_uid: "order_" + new Date().getTime(),
                name: config.paymentProductName, amount: config.paymentAmount,
                buyer_name: buyerName,
                buyer_tel: dom.buyerPhone.value.trim(),
            }, (rsp) => {
                if (rsp.success) {
                    if (window.gtag) gtag('event', 'purchase', { 'transaction_id': rsp.imp_uid, 'value': config.paymentAmount, 'currency': 'KRW' });
                    ui.showPremiumReport();
                } else {
                    ui.showToast(`결제에 실패했습니다: ${rsp.error_msg}`, 'error');
                }
            });
        }
    };

    // ================= 8. 초기화 =================
    function init() {
        
        // Firebase v9 호환성 모드로 초기화
        firebase.initializeApp(window.firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();

        auth.onAuthStateChanged(user => {
            state.currentUser = user;
            ui.updateLoginStatus(user);
            state.isInitialAuthCheck = false;
        });

        Object.assign(dom, {
            loginBtn: document.getElementById('login-btn'),
            myResultsBtn: document.getElementById('my-results-btn'),
            myResultsSection: document.getElementById('my-results-section'),
            myResultsList: document.getElementById('my-results-list'),
            logo: document.getElementById('logo'), 
            sajuSection: document.getElementById('section-saju'),
            tarotSection: document.getElementById('section-tarot'), 
            resultArea: document.getElementById('result-area'),
            loading: document.getElementById('loading'), 
            resultContent: document.getElementById('result-content'),
            resultTitle: document.getElementById('result-title'), 
            resultSummary: document.getElementById('result-summary'),
            resultDetails: document.getElementById('result-details'),
            tarotResultImages: document.getElementById('tarot-result-images'), 
            userName: document.getElementById('userName'),
            userBirth: document.getElementById('userBirth'), 
            tarotIntro: document.getElementById('tarot-intro'),
            tarotShuffle: document.getElementById('tarot-shuffle'), 
            tarotSelect: document.getElementById('tarot-select'),
            cardGrid: document.getElementById('card-grid'), 
            pickInstruction: document.getElementById('pick-instruction'),
            buyerName: document.getElementById('buyer-name'), 
            buyerPhone: document.getElementById('buyer-phone'),
            tabSaju: document.getElementById('tab-saju'), 
            tabTarot: document.getElementById('tab-tarot'),
            sajuOptions: document.getElementById('saju-options'), 
            tarotOptions: document.getElementById('tarot-options'),
            calculateSajuBtn: document.getElementById('calculateSaju-btn'), 
            startShuffleBtn: document.getElementById('startShuffle-btn'),
            stopShuffleBtn: document.getElementById('stopShuffle-btn'), 
            readMoreBtn: document.getElementById('read-more-btn'),
            requestPayBtn: document.getElementById('requestPay-btn'),
            shareResultBtn: document.getElementById('shareResult-btn'), 
            retryBtn: document.getElementById('retry-btn'),
            premiumBanner: document.getElementById('premium-banner'),
            adBanner: document.getElementById('ad-banner'),
        });

        dom.readMoreBtn.addEventListener('click', handlers.onReadMore);
        dom.loginBtn.addEventListener('click', handlers.onAuthClick);
        dom.myResultsBtn.addEventListener('click', handlers.onShowMyResults);
        dom.logo.addEventListener('click', () => ui.setMode('saju'));
        dom.retryBtn.addEventListener('click', () => ui.setMode(state.currentMode));
        dom.tabSaju.addEventListener('click', () => ui.setMode('saju'));
        dom.tabTarot.addEventListener('click', () => ui.setMode('tarot'));
        dom.sajuOptions.addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') ui.setSajuType(e.target.dataset.sajuType); });
        dom.tarotOptions.addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') ui.setTarotType(e.target.dataset.tarotType); });
        dom.calculateSajuBtn.addEventListener('click', handlers.onCalculateSaju);
        dom.startShuffleBtn.addEventListener('click', handlers.onStartShuffle);
        dom.stopShuffleBtn.addEventListener('click', handlers.onStopShuffle);
        dom.requestPayBtn.addEventListener('click', handlers.onRequestPay);
        dom.shareResultBtn.addEventListener('click', handlers.onShareResult);

        if (window.IMP) {
            window.IMP.init(config.portOneIamportId);
        } else {
            console.error("PortOne SDK not loaded.");
        }
    }

    document.addEventListener('DOMContentLoaded', init);
    return {};
})();