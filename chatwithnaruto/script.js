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

    let characters = [];
    let currentCharacter = null;
    let conversationHistory = {};     // { "Naruto Uzumaki": [{role,content}, ...] }

    // Load conversations
    const saved = localStorage.getItem('narutoChatConversations');
    if (saved) conversationHistory = JSON.parse(saved);

    fetch('characters.json')
        .then(res => res.json())
        .then(data => {
            characters = data;
            renderCharacterList();
        });

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
        div.innerHTML = text + `<span class="time">${getTime()}</span>`;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTyping() {
        const div = document.createElement('div');
        div.classList.add('typing-indicator');
        let content = 'Typing...';
        if (currentCharacter?.typing_gif) content = `<img src="${currentCharacter.typing_gif}"> ${content}`;
        div.innerHTML = content;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return div;
    }

    function sendMessage() {
        const msg = messageInput.value.trim();
        if (!msg || !currentCharacter) return;

        addMessage(msg, true);
        messageInput.value = '';

        const typing = showTyping();

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
                conversation: conversationHistory[currentCharacter.name]
            })
        })
        .then(res => res.json())
        .then(data => {
            typing.remove();
            addMessage(data.response, false);
            conversationHistory[currentCharacter.name].push({role: 'assistant', content: data.response});
            saveConversations();
            renderCharacterList();
        })
        .catch(() => {
            typing.remove();
            addMessage('...', false);
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
});