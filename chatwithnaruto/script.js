document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const characterListEl = document.getElementById('character-list');
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const charAvatar = document.getElementById('char-avatar');
    const charName = document.getElementById('char-name');
    const backBtn = document.getElementById('back-btn');
    const searchInput = document.getElementById('search-input');
    const menuBtn = document.getElementById('menu-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const newChatBtn = document.getElementById('new-chat-btn');

    const settingsBackdrop = document.getElementById('settings-backdrop');
    const settingsModal = document.getElementById('settings-modal');
    const settingsClose = document.getElementById('settings-close');
    const settingFamilyFriendly = document.getElementById('setting-family-friendly');
    const settingRealisticTyping = document.getElementById('setting-realistic-typing');
    const settingTypingSpeed = document.getElementById('setting-typing-speed');
    const clearCurrentChatBtn = document.getElementById('clear-current-chat');
    const clearAllChatsBtn = document.getElementById('clear-all-chats');
    const rateLimitNote = document.getElementById('rate-limit-note');
    const creditsBadge = document.getElementById('credits-badge');

    const rewardedBackdrop = document.getElementById('rewarded-backdrop');
    const rewardedModal = document.getElementById('rewarded-modal');
    const rewardedClose = document.getElementById('rewarded-close');
    const rewardedCancel = document.getElementById('rewarded-cancel');
    const rewardedWatch = document.getElementById('rewarded-watch');
    const rewardedStatus = document.getElementById('rewarded-status');

    let characters = [];
    let currentCharacter = null;
    let conversationHistory = {};     // { "Naruto Uzumaki": [{role,content}, ...] }
    let isRequestInFlight = false;

    const SETTINGS_KEY = 'narutoChatSettings';
    const CREDITS_KEY = 'narutoChatMessageCredits';
    const DEFAULT_SETTINGS = {
        familyFriendly: false,
        realisticTyping: true,
        typingSpeed: 'normal', // fast | normal | slow
        minSendIntervalMs: 1200,
        maxPerMinute: 10
    };
    let settings = loadSettings();
    let messageCredits = loadCredits();

    // Rolling timestamps used for rate limiting
    const recentSendTimestamps = [];

    // Load conversations
    const saved = localStorage.getItem('narutoChatConversations');
    if (saved) conversationHistory = JSON.parse(saved);

    fetch('characters.json')
        .then(res => res.json())
        .then(data => {
            characters = data;
            renderCharacterList();
        });

    syncSettingsUI();
    updateRateLimitNote();
    updateCreditsUI();

    function renderCharacterList(filter = '') {
        characterListEl.innerHTML = '';
        characters.forEach((char, i) => {
            if (filter && !char.name.toLowerCase().includes(filter.toLowerCase())) return;

            const lastMsgObj = (conversationHistory[char.name] || []).slice(-1)[0];
            let lastMsgText = 'Începe o conversație...';
            if (lastMsgObj) {
                lastMsgText = lastMsgObj.content.substring(0, 40) + (lastMsgObj.content.length > 40 ? '...' : '');
                if (lastMsgObj.role === 'user') lastMsgText = 'Tu: ' + lastMsgText;
            }

            const item = document.createElement('div');
            item.classList.add('chat-item');
            item.dataset.name = char.name.toLowerCase();
            item.innerHTML = `
                <img src="${char.avatar || `https://via.placeholder.com/49?text=${char.name[0]}`}" class="avatar" alt="">
                <div class="chat-info">
                    <div class="chat-name">${char.name}</div>
                    <div class="last-msg">${lastMsgText}</div>
                </div>
                <div class="chat-meta">
                    <span class="online">online</span>
                </div>
            `;
            item.addEventListener('click', () => selectCharacter(i, item));
            characterListEl.appendChild(item);
        });
    }

    searchInput.addEventListener('input', e => {
        renderCharacterList(e.target.value);
    });

    function selectCharacter(index, clickedItem) {
        currentCharacter = characters[index];
        const hist = conversationHistory[currentCharacter.name] || [];
        chatMessages.innerHTML = '';

        hist.forEach(msg => addMessage(msg.content, msg.role === 'user'));

        charAvatar.src = currentCharacter.avatar || `https://via.placeholder.com/40?text=${currentCharacter.name[0]}`;
        charName.textContent = currentCharacter.name;

        document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
        clickedItem.classList.add('active');

        if (window.innerWidth <= 1024) sidebar.classList.add('hidden');

        messageInput.focus();

        // Trimite hook random dacă e chat nou și a trecut timp suficient
        if (hist.length === 0) {
            const lastHookTime = localStorage.getItem(`lastHook_${currentCharacter.name}`) || 0;
            const now = Date.now();
            if (now - lastHookTime > 120000) {  // 2 minute
                setTimeout(() => sendRandomHook(), Math.random() * 20000 + 20000); // 20-40 sec
                localStorage.setItem(`lastHook_${currentCharacter.name}`, now);
            }
        }
    }

    function sendRandomHook() {
        if (!currentCharacter) return;

        const hooks = [
            "Hei... tu ești genul care ar supraviețui într-o misiune de rang S?",
            "Am auzit că ești destul de tare... demonstrăm?",
            "Ce mai faci? Azi am chef de ceva haos 😏",
            "Nu zici nimic? Te sperie Sharinganul meu sau ce?",
            "Ramen sau misiune? Care te atrage mai tare?",
            "Sunt curios... care ți-e tehnica preferată?"
        ];

        const randomMsg = hooks[Math.floor(Math.random() * hooks.length)];
        addMessage(randomMsg, false);

        conversationHistory[currentCharacter.name] = conversationHistory[currentCharacter.name] || [];
        conversationHistory[currentCharacter.name].push({role: 'assistant', content: randomMsg});
        saveConversations();
        renderCharacterList();  // update preview
    }

    function getTime() {
        return new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    }

    function addMessage(text, isUser = false) {
        const div = document.createElement('div');
        div.classList.add('message', isUser ? 'user-message' : 'ai-message');
        const contentSpan = document.createElement('span');
        contentSpan.classList.add('message-text');
        contentSpan.textContent = text;
        const timeSpan = document.createElement('span');
        timeSpan.classList.add('time');
        timeSpan.textContent = getTime();
        div.appendChild(contentSpan);
        div.appendChild(timeSpan);
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTyping() {
        const div = document.createElement('div');
        div.classList.add('typing-indicator');
        if (currentCharacter?.typing_gif) {
            const img = document.createElement('img');
            img.src = currentCharacter.typing_gif;
            img.alt = '';
            div.appendChild(img);
        }

        const dots = document.createElement('div');
        dots.classList.add('typing-dots');
        dots.innerHTML = '<span></span><span></span><span></span>';
        div.appendChild(dots);

        const label = document.createElement('span');
        label.textContent = 'Typing';
        div.appendChild(label);

        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return div;
    }

    function openSettings() {
        settingsBackdrop.classList.add('open');
        settingsModal.classList.add('open');
        settingsBackdrop.setAttribute('aria-hidden', 'false');
        settingsModal.setAttribute('aria-hidden', 'false');
    }
    function closeSettings() {
        settingsBackdrop.classList.remove('open');
        settingsModal.classList.remove('open');
        settingsBackdrop.setAttribute('aria-hidden', 'true');
        settingsModal.setAttribute('aria-hidden', 'true');
    }

    function openRewarded() {
        rewardedStatus.textContent = '';
        rewardedWatch.disabled = false;
        rewardedBackdrop.classList.add('open');
        rewardedModal.classList.add('open');
        rewardedBackdrop.setAttribute('aria-hidden', 'false');
        rewardedModal.setAttribute('aria-hidden', 'false');
    }
    function closeRewarded() {
        rewardedBackdrop.classList.remove('open');
        rewardedModal.classList.remove('open');
        rewardedBackdrop.setAttribute('aria-hidden', 'true');
        rewardedModal.setAttribute('aria-hidden', 'true');
    }

    function loadSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (!raw) return {...DEFAULT_SETTINGS};
            const parsed = JSON.parse(raw);
            return {...DEFAULT_SETTINGS, ...parsed};
        } catch {
            return {...DEFAULT_SETTINGS};
        }
    }

    function saveSettings() {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        updateRateLimitNote();
    }

    function loadCredits() {
        try {
            const raw = localStorage.getItem(CREDITS_KEY);
            if (!raw) return 5;
            const n = Number(raw);
            if (!Number.isFinite(n) || n < 0) return 5;
            return Math.floor(n);
        } catch {
            return 5;
        }
    }
    function saveCredits() {
        localStorage.setItem(CREDITS_KEY, String(messageCredits));
        updateCreditsUI();
    }
    function updateCreditsUI() {
        if (!creditsBadge) return;
        creditsBadge.textContent = `Msgs: ${messageCredits}`;
        creditsBadge.classList.remove('low', 'empty');
        if (messageCredits <= 0) creditsBadge.classList.add('empty');
        else if (messageCredits <= 2) creditsBadge.classList.add('low');
    }
    function grantCredits(amount) {
        messageCredits = Math.max(0, messageCredits + amount);
        saveCredits();
    }
    function spendCredit() {
        messageCredits = Math.max(0, messageCredits - 1);
        saveCredits();
    }

    function syncSettingsUI() {
        settingFamilyFriendly.checked = !!settings.familyFriendly;
        settingRealisticTyping.checked = !!settings.realisticTyping;
        settingTypingSpeed.value = settings.typingSpeed || 'normal';
    }

    function updateRateLimitNote() {
        rateLimitNote.textContent = `Rate limit: max ${settings.maxPerMinute}/minute and at least ${Math.round(settings.minSendIntervalMs/100)/10}s between messages.`;
    }

    function canSendNow() {
        const now = Date.now();

        if (isRequestInFlight) return {ok: false, reason: 'Wait for the current reply.'};

        // min interval
        const last = recentSendTimestamps[recentSendTimestamps.length - 1] || 0;
        if (now - last < settings.minSendIntervalMs) {
            const waitMs = settings.minSendIntervalMs - (now - last);
            return {ok: false, reason: `Slow down — wait ${Math.ceil(waitMs / 1000)}s.`};
        }

        // rolling minute window
        const windowMs = 60_000;
        while (recentSendTimestamps.length && now - recentSendTimestamps[0] > windowMs) {
            recentSendTimestamps.shift();
        }
        if (recentSendTimestamps.length >= settings.maxPerMinute) {
            return {ok: false, reason: `Rate limit — try again in a bit.`};
        }

        return {ok: true};
    }

    function violatesFamilyFriendly(text) {
        if (!settings.familyFriendly) return false;
        const t = text.toLowerCase();
        const blocked = [
            'porn', 'nude', 'nudes', 'sex', 'sexy', 'blowjob', 'anal',
            'rape', 'raped',
            'kill yourself', 'suicide',
            'nigger', 'faggot'
        ];
        return blocked.some(w => t.includes(w));
    }

    function notifyOutOfCredits() {
        addMessage("SIM out of messages. Charge your SIM by watching a rewarded ad to get +5 messages.", false);
        openRewarded();
    }

    function typingDelayMs(responseText) {
        if (!settings.realisticTyping) return 0;
        const len = (responseText || '').length;
        const speedMultiplier = settings.typingSpeed === 'fast' ? 0.6 : settings.typingSpeed === 'slow' ? 1.4 : 1.0;
        const base = 450;
        const perChar = 22; // approximate phone typing
        const jitter = Math.floor(Math.random() * 300);
        const max = 2600;
        return Math.min(max, Math.floor((base + len * perChar + jitter) * speedMultiplier));
    }

    function sendMessage() {
        const msg = messageInput.value.trim();
        if (!msg || !currentCharacter) return;

        if (messageCredits <= 0) {
            notifyOutOfCredits();
            return;
        }

        if (violatesFamilyFriendly(msg)) {
            addMessage('Message blocked (family-friendly mode).', false);
            return;
        }

        const allow = canSendNow();
        if (!allow.ok) {
            addMessage(allow.reason, false);
            return;
        }

        spendCredit();
        addMessage(msg, true);
        messageInput.value = '';

        const typing = showTyping();
        isRequestInFlight = true;
        recentSendTimestamps.push(Date.now());

        conversationHistory[currentCharacter.name] = conversationHistory[currentCharacter.name] || [];
        conversationHistory[currentCharacter.name].push({role: 'user', content: msg});
        saveConversations();
        renderCharacterList();

        fetch('api.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                prompt: currentCharacter.prompt,
                message: msg,
                conversation: conversationHistory[currentCharacter.name],
                safetyMode: !!settings.familyFriendly
            })
        })
        .then(res => res.json())
        .then(data => {
            const responseText = (data && data.response) ? String(data.response) : '...';
            const delay = typingDelayMs(responseText);
            setTimeout(() => {
                typing.remove();
                addMessage(responseText, false);
                conversationHistory[currentCharacter.name].push({role: 'assistant', content: responseText});
                saveConversations();
                renderCharacterList();
                isRequestInFlight = false;
            }, delay);
        })
        .catch(() => {
            typing.remove();
            addMessage('Could not reach the server. Try again.', false);
            isRequestInFlight = false;
        });
    }

    function saveConversations() {
        localStorage.setItem('narutoChatConversations', JSON.stringify(conversationHistory));
    }

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') sendMessage();
    });

    backBtn.addEventListener('click', () => {
        sidebar.classList.remove('hidden');
        saveConversations();
    });

    function clearCurrentChat() {
        if (!currentCharacter) return;
        conversationHistory[currentCharacter.name] = [];
        saveConversations();
        chatMessages.innerHTML = '';
        renderCharacterList();
    }

    function clearAllChats() {
        conversationHistory = {};
        saveConversations();
        chatMessages.innerHTML = '';
        renderCharacterList();
    }

    menuBtn?.addEventListener('click', () => {
        syncSettingsUI();
        openSettings();
    });
    settingsBackdrop?.addEventListener('click', closeSettings);
    settingsClose?.addEventListener('click', closeSettings);
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSettings();
    });
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeRewarded();
    });

    settingFamilyFriendly?.addEventListener('change', () => {
        settings.familyFriendly = settingFamilyFriendly.checked;
        saveSettings();
    });
    settingRealisticTyping?.addEventListener('change', () => {
        settings.realisticTyping = settingRealisticTyping.checked;
        saveSettings();
    });
    settingTypingSpeed?.addEventListener('change', () => {
        settings.typingSpeed = settingTypingSpeed.value;
        saveSettings();
    });

    clearCurrentChatBtn?.addEventListener('click', () => {
        if (!currentCharacter) return;
        if (!confirm(`Clear chat with ${currentCharacter.name}?`)) return;
        clearCurrentChat();
        closeSettings();
    });
    clearAllChatsBtn?.addEventListener('click', () => {
        if (!confirm('Clear ALL chats? This cannot be undone.')) return;
        clearAllChats();
        closeSettings();
    });

    refreshBtn?.addEventListener('click', () => {
        if (!currentCharacter) return;
        if (!confirm(`Clear chat with ${currentCharacter.name}?`)) return;
        clearCurrentChat();
    });

    newChatBtn?.addEventListener('click', () => {
        sidebar.classList.remove('hidden');
        messageInput.focus();
    });

    rewardedBackdrop?.addEventListener('click', closeRewarded);
    rewardedClose?.addEventListener('click', closeRewarded);
    rewardedCancel?.addEventListener('click', closeRewarded);
    rewardedWatch?.addEventListener('click', () => {
        rewardedWatch.disabled = true;
        let remaining = 3;
        rewardedStatus.textContent = `Playing rewarded ad... ${remaining}s`;
        const timer = setInterval(() => {
            remaining -= 1;
            if (remaining <= 0) {
                clearInterval(timer);
                rewardedStatus.textContent = 'Reward granted: +5 messages.';
                grantCredits(5);
                setTimeout(() => closeRewarded(), 600);
                return;
            }
            rewardedStatus.textContent = `Playing rewarded ad... ${remaining}s`;
        }, 1000);
    });
});