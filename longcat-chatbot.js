'use strict';

(function initLongcatChatbot() {
  const storageKey = 'longcat-chatbot-settings';
  const chatStorageKey = 'longcat-chatbot-history';
  const endpoint = 'https://api.longcat.chat/openai/v1/chat/completions';

  const settingsForm = document.getElementById('settingsForm');
  const apiKeyInput = document.getElementById('apiKey');
  const modelInput = document.getElementById('model');
  const systemPromptInput = document.getElementById('systemPrompt');
  const temperatureInput = document.getElementById('temperature');
  const maxTokensInput = document.getElementById('maxTokens');
  const settingsStatus = document.getElementById('settingsStatus');
  const toggleSecretButton = document.getElementById('toggleSecret');
  const clearChatButton = document.getElementById('clearChat');
  const chatForm = document.getElementById('chatForm');
  const userMessageInput = document.getElementById('userMessage');
  const sendButton = document.getElementById('sendButton');
  const requestStatus = document.getElementById('requestStatus');
  const chatMessages = document.getElementById('chatMessages');
  const messageTemplate = document.getElementById('messageTemplate');

  let history = [];
  let isSending = false;

  function setStatus(element, message, isError) {
    element.textContent = message || '';
    element.classList.toggle('is-error', Boolean(isError));
  }

  function loadSettings() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch {
      return {};
    }
  }

  function saveSettings() {
    const settings = {
      apiKey: apiKeyInput.value.trim(),
      model: modelInput.value,
      systemPrompt: systemPromptInput.value.trim(),
      temperature: temperatureInput.value,
      maxTokens: maxTokensInput.value
    };

    localStorage.setItem(storageKey, JSON.stringify(settings));
    setStatus(settingsStatus, 'Settings saved in this browser.');
  }

  function loadHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(chatStorageKey) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveHistory() {
    localStorage.setItem(chatStorageKey, JSON.stringify(history));
  }

  function autosizeComposer() {
    userMessageInput.style.height = 'auto';
    userMessageInput.style.height = `${Math.min(userMessageInput.scrollHeight, 220)}px`;
  }

  function roleLabel(role) {
    if (role === 'assistant') return 'LongCat Assistant';
    if (role === 'user') return 'You';
    return 'System';
  }

  function avatarLabel(role) {
    if (role === 'assistant') return 'AI';
    if (role === 'user') return 'You';
    return 'Sys';
  }

  function renderMessage(message) {
    const fragment = messageTemplate.content.cloneNode(true);
    const article = fragment.querySelector('.message');
    const avatar = fragment.querySelector('.message-avatar');
    const meta = fragment.querySelector('.message-meta');
    const content = fragment.querySelector('.message-content');

    article.classList.add(message.role);
    avatar.textContent = avatarLabel(message.role);
    meta.textContent = roleLabel(message.role);
    content.textContent = message.content;

    chatMessages.appendChild(fragment);
  }

  function renderHistory() {
    chatMessages.innerHTML = '';

    if (!history.length) {
      renderMessage({
        role: 'assistant',
        content: 'Welcome. Save your LongCat API key, then send a message to start chatting.'
      });
      return;
    }

    history.forEach(renderMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function setSendingState(nextState) {
    isSending = nextState;
    sendButton.disabled = nextState;
    userMessageInput.disabled = nextState;
    if (nextState) {
      setStatus(requestStatus, 'Waiting for LongCat response...');
    }
  }

  function buildRequestMessages() {
    const messages = [];
    const systemPrompt = systemPromptInput.value.trim();
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    history.forEach((item) => {
      if (item.role === 'user' || item.role === 'assistant') {
        messages.push({ role: item.role, content: item.content });
      }
    });
    return messages;
  }

  async function sendMessage(userText) {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      setStatus(requestStatus, 'Enter your LongCat API key first.', true);
      apiKeyInput.focus();
      return;
    }

    const outgoing = { role: 'user', content: userText };
    history.push(outgoing);
    renderMessage(outgoing);
    saveHistory();
    chatMessages.scrollTop = chatMessages.scrollHeight;

    setSendingState(true);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelInput.value,
          messages: buildRequestMessages(),
          temperature: Number(temperatureInput.value) || 0.7,
          max_tokens: Number(maxTokensInput.value) || 800
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.error?.message || `Request failed with status ${response.status}.`;
        throw new Error(message);
      }

      const assistantText = payload?.choices?.[0]?.message?.content?.trim();
      if (!assistantText) {
        throw new Error('LongCat returned an empty response.');
      }

      const incoming = { role: 'assistant', content: assistantText };
      history.push(incoming);
      renderMessage(incoming);
      saveHistory();
      setStatus(requestStatus, 'Response received.');
      chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
      history.push({ role: 'system', content: `Error: ${error.message}` });
      renderMessage(history[history.length - 1]);
      saveHistory();
      setStatus(requestStatus, error.message, true);
    } finally {
      setSendingState(false);
      userMessageInput.focus();
    }
  }

  function hydrate() {
    const settings = loadSettings();
    apiKeyInput.value = settings.apiKey || '';
    modelInput.value = settings.model || 'LongCat-Flash-Chat';
    systemPromptInput.value = settings.systemPrompt || 'You are a helpful assistant for my website visitors.';
    temperatureInput.value = settings.temperature || '0.7';
    maxTokensInput.value = settings.maxTokens || '800';
    history = loadHistory();
    renderHistory();
    autosizeComposer();
  }

  settingsForm.addEventListener('submit', (event) => {
    event.preventDefault();
    saveSettings();
  });

  toggleSecretButton.addEventListener('click', () => {
    const nextType = apiKeyInput.type === 'password' ? 'text' : 'password';
    apiKeyInput.type = nextType;
    toggleSecretButton.innerHTML = nextType === 'password'
      ? '<i class="fas fa-eye"></i>'
      : '<i class="fas fa-eye-slash"></i>';
  });

  clearChatButton.addEventListener('click', () => {
    history = [];
    localStorage.removeItem(chatStorageKey);
    renderHistory();
    setStatus(requestStatus, 'Chat cleared.');
  });

  document.querySelectorAll('.suggestion-chip').forEach((button) => {
    button.addEventListener('click', () => {
      userMessageInput.value = button.dataset.prompt || '';
      autosizeComposer();
      userMessageInput.focus();
    });
  });

  userMessageInput.addEventListener('input', autosizeComposer);

  userMessageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      chatForm.requestSubmit();
    }
  });

  chatForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSending) return;

    const userText = userMessageInput.value.trim();
    if (!userText) return;

    userMessageInput.value = '';
    autosizeComposer();
    await sendMessage(userText);
  });

  hydrate();
})();
