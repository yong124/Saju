const App = (function () {
    // ================= 1. 설정값 =================
    const config = {
        firebase: {
            apiKey: "AIzaSyBbXxlWg28PlaMc5LYj1VtyMrX29c0oEss",
            authDomain: "sajuvibe-a7d2a.firebaseapp.com",
            projectId: "sajuvibe-a7d2a",
            storageBucket: "sajuvibe-a7d2a.appspot.com",
            messagingSenderId: "1014673524590",
            appId: "1:1014673524590:web:375e6336219de72ea6a37f"
        },
        googleAdSenseClientId: 'ca-pub-YOUR_ADSENSE_CLIENT_ID',
        googleAnalyticsId: 'YOUR_GA_TRACKING_ID',
        portOneIamportId: 'imp10391932',
        paymentPg: 'html5_inicis',
        paymentMethod: 'card',
        paymentAmount: 3000,
        paymentProductName: 'Vibe Saju 2025 대운 리포트',
        epochDate: '2024-01-01',
        epochIndex: 40,
        tarotShuffleCount: 9,
        tarotPickCount: 3
    };

    // ================= 2. 상태 관리 =================
    const state = {
        currentUser: null,
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
            if (!state.currentUser) return;
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
            if (!state.currentUser) return;
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
        }
    };

    // ================= 6. UI 렌더링 및 조작 =================
    const ui = {
        updateLoginStatus: (user) => {
            if (user) {
                dom.loginBtn.textContent = '로그아웃';
                dom.myResultsBtn.classList.remove('hidden');
            } else {
                dom.loginBtn.textContent = '로그인';
                dom.myResultsBtn.classList.add('hidden');
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
        showResult: (title, content, isTarot) => {
            dom.loading.classList.add('hidden');
            dom.resultContent.classList.remove('hidden');
            dom.resultTitle.innerText = title;
            dom.resultBody.innerHTML = content;
            dom.tarotResultImages.classList.toggle('hidden', !isTarot);
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
            firebase.auth().signOut().then(() => {
                ui.showToast('로그아웃되었습니다.');
            }).catch(error => {
                console.error("로그아웃 실패:", error);
                ui.showToast('로그아웃에 실패했습니다.', 'error');
            });
        },
        onCalculateSaju: () => {
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
            gtag('event', 'click_saju_result', { 'event_category': 'Saju', 'event_label': state.sajuType });
            const userBirthDate = new Date(birth);
            const myDailyStem = logic.getDailyStem(userBirthDate);
            state.lastSajuResult = { dailyStem: myDailyStem, birthDate: userBirthDate };
            setTimeout(() => {
                let title = `"${myDailyStem.name}"의 기운을 가진 ${name}님!`;
                let content = `<p class="mb-4 text-[#8D6E63]"><strong>🌱 본질 분석:</strong><br>${myDailyStem.desc}</p>`;
                if (state.sajuType === 'love') content += `<p class="text-[#FF5E5E]"><strong>💖 애정운 흐름:</strong><br>올해는 당신의 매력이 자연스럽게 발산되는 시기입니다. 억지로 인연을 찾으려 하기보다, 당신이 좋아하는 일에 몰두할 때 빛나는 모습을 보고 누군가 다가올 확률이 높아요. 특히 ${userBirthDate.getFullYear() % 2 === 0 ? '여름' : '겨울'}에 만나는 인연을 주목하세요.</p>`;
                else if (state.sajuType === 'wealth') content += `<p class="text-[#FBC02D]"><strong>💰 재물운 흐름:</strong><br>꾸준함이 답입니다. ${myDailyStem.nature}의 기운을 가진 당신은 일확천금보다 쌓아가는 재물운이 강해요. 올해는 새로운 투자보다는 기존의 것을 지키고 불려나가는 전략이 유효합니다.</p>`;
                else content += `<p class="text-[#5D4037]"><strong>🍀 종합 조언:</strong><br>주변 환경이 변화할 수 있지만, 당신의 타고난 뚝심으로 밀고 나가세요. 겉으로는 흔들려 보여도 뿌리는 깊게 박혀 있습니다.</p>`;
                ui.showResult(title, content, false);
                logic.saveSajuResult(state.lastSajuResult);
            }, 2000);
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
        onAnalyzeTarot: () => {
            ui.showLoading();
            gtag('event', 'click_tarot_result', { 'event_category': 'Tarot', 'event_label': state.tarotType });
            setTimeout(() => {
                const picks = state.selectedCards;
                let title = "당신의 흐름을 읽어보았습니다";
                let labels = ["과거", "현재", "미래"];
                let narrativeContent = '';
                if (state.tarotType === 'choice') {
                    title = "어떤 선택이 좋을까요?";
                    labels = ["선택 A의 결과", "선택 B의 결과", "핵심 조언"];
                    narrativeContent = `<p><strong>${labels[0]} (${picks[0].name}):</strong> ${picks[0].desc}</p><p><strong>${labels[1]} (${picks[1].name}):</strong> ${picks[1].desc}</p><hr class="my-4 border-gray-200"><p><strong>${labels[2]} (${picks[2].name}):</strong> ${picks[2].desc} 이 조언은 두 선택지 사이에서 균형을 잡는 데 도움을 줄 것입니다.</p>`;
                } else {
                    if (state.tarotType === 'future') labels = ["가까운 미래", "장애물 또는 도전", "최종 결과"];
                    narrativeContent = `<p>당신의 <strong>${labels[0]}</strong>는 <strong>'${picks[0].name}'</strong> 카드로 나타납니다. 이는 ${picks[0].desc} 시기였음을 의미합니다.</p><p>이러한 상황을 바탕으로, <strong>${labels[1]}</strong>를 상징하는 <strong>'${picks[1].name}'</strong> 카드를 마주하게 됩니다. 즉, ${picks[1].desc}</p><p>결과적으로 <strong>${labels[2]}</strong>는 <strong>'${picks[2].name}'</strong> 카드로 암시됩니다. 이 카드는 ${picks[2].desc} 방향으로 나아갈 것을 보여줍니다.</p><hr class="my-4 border-gray-200"><p class="font-bold text-center">종합적으로, 당신의 여정은 '${picks[0].key}'에서 시작하여 '${picks[1].key}'를 거쳐, '${picks[2].key}'(으)로 향하는 흐름 속에 있습니다.</p>`;
                }
                dom.tarotResultImages.innerHTML = picks.map(card => `<div class="rounded-lg overflow-hidden border border-[#E0E0E0]"><img src="${card.img}" class="w-full h-24 object-cover"></div>`).join('');
                const finalContent = `<div class="space-y-4 text-justify">${narrativeContent}</div>`;
                ui.showResult(title, finalContent, true);
                logic.saveTarotResult(state.selectedCards);
            }, 2500);
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
            gtag('event', 'click_premium_report', { 'event_category': 'Monetization', 'event_label': state.currentMode });
            IMP.request_pay({
                pg: config.paymentPg, pay_method: config.paymentMethod, merchant_uid: "order_" + new Date().getTime(),
                name: config.paymentProductName, amount: config.paymentAmount,
                buyer_name: buyerName,
                buyer_tel: dom.buyerPhone.value.trim(),
            }, (rsp) => {
                if (rsp.success) {
                    gtag('event', 'purchase', { 'transaction_id': rsp.imp_uid, 'value': config.paymentAmount, 'currency': 'KRW' });
                    ui.showPremiumReport();
                } else {
                    ui.showToast(`결제에 실패했습니다: ${rsp.error_msg}`, 'error');
                }
            });
        }
    };

    // ================= 8. 초기화 =================
    const init = () => {
        firebase.initializeApp(window.firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();

        auth.onAuthStateChanged(user => {
            state.currentUser = user;
            ui.updateLoginStatus(user);
        });

        Object.assign(dom, {
            loginBtn: document.getElementById('login-btn'),
            myResultsBtn: document.getElementById('my-results-btn'),
            myResultsSection: document.getElementById('my-results-section'),
            myResultsList: document.getElementById('my-results-list'),
            logo: document.getElementById('logo'), sajuSection: document.getElementById('section-saju'),
            tarotSection: document.getElementById('section-tarot'), resultArea: document.getElementById('result-area'),
            loading: document.getElementById('loading'), resultContent: document.getElementById('result-content'),
            resultTitle: document.getElementById('result-title'), resultBody: document.getElementById('result-body'),
            tarotResultImages: document.getElementById('tarot-result-images'), userName: document.getElementById('userName'),
            userBirth: document.getElementById('userBirth'), tarotIntro: document.getElementById('tarot-intro'),
            tarotShuffle: document.getElementById('tarot-shuffle'), tarotSelect: document.getElementById('tarot-select'),
            cardGrid: document.getElementById('card-grid'), pickInstruction: document.getElementById('pick-instruction'),
            buyerName: document.getElementById('buyer-name'), buyerPhone: document.getElementById('buyer-phone'),
            tabSaju: document.getElementById('tab-saju'), tabTarot: document.getElementById('tab-tarot'),
            sajuOptions: document.getElementById('saju-options'), tarotOptions: document.getElementById('tarot-options'),
            calculateSajuBtn: document.getElementById('calculateSaju-btn'), startShuffleBtn: document.getElementById('startShuffle-btn'),
            stopShuffleBtn: document.getElementById('stopShuffle-btn'), requestPayBtn: document.getElementById('requestPay-btn'),
            shareResultBtn: document.getElementById('shareResult-btn'), retryBtn: document.getElementById('retry-btn'),
            premiumBanner: document.getElementById('premium-banner'),
            adBanner: document.getElementById('ad-banner'),
        });

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

        if (window.IMP) window.IMP.init(config.portOneIamportId);
        else console.error("PortOne SDK not loaded.");
    };

    document.addEventListener('DOMContentLoaded', init);
    return {};
})();