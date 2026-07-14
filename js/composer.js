(function() {
  'use strict';

  var chatHistory = [];
  var isGenerating = false;
  var registeredListeners = [];

  function escapeHtml(text) {
    if (window.Utils && window.Utils.escapeHtml) {
      return window.Utils.escapeHtml(text);
    }
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function registerListener(el, event, callback, options) {
    el.addEventListener(event, callback, options);
    registeredListeners.push({ el: el, event: event, callback: callback, options: options });
  }

  function cleanupListeners() {
    registeredListeners.forEach(function(item) {
      try {
        item.el.removeEventListener(item.event, item.callback, item.options);
      } catch (e) {
        console.warn('移除事件监听器失败:', e);
      }
    });
    registeredListeners = [];
  }

  function initComposer() {
    var input = document.getElementById('ai-input-textarea');
    var sendBtn = document.getElementById('ai-send-btn');
    var clearBtn = document.getElementById('clear-chat-btn');
    var stopBtn = document.getElementById('stop-generate-btn');

    if (!input) return;

    if (clearBtn) {
      registerListener(clearBtn, 'click', function() {
        showConfirmDialog('确定清空所有 AI 对话历史吗？', function() {
          chatHistory.length = 0;
          var messagesContainer = document.getElementById('chat-messages-container');
          if (messagesContainer) {
            var welcomeMsg = messagesContainer.querySelector('.flex.gap-2');
            messagesContainer.innerHTML = '';
            if (welcomeMsg) messagesContainer.appendChild(welcomeMsg);
          }
          showNotification('对话历史已清空', 'info');
        });
      });
    }

    var isPaused = false;
    if (stopBtn) {
      registerListener(stopBtn, 'click', function() {
        if (!isPaused) {
          isPaused = true;
          isGenerating = false;
          updateAIStatus('已暂停 - 点击继续');
          var stopImg = stopBtn.querySelector('img');
          if (stopImg) stopImg.src = '../assets/icons/dl-builtin-trae/play.svg';
          var textNodes = [];
          stopBtn.childNodes.forEach(function(n) { if (n.nodeType === 3) textNodes.push(n); });
          textNodes.forEach(function(n) { n.textContent = '继续'; });
        } else {
          isPaused = false;
          isGenerating = true;
          updateAIStatus('正在继续生成...');
          var stopImg2 = stopBtn.querySelector('img');
          if (stopImg2) stopImg2.src = '../assets/icons/dl-builtin-trae/square.svg';
          var textNodes2 = [];
          stopBtn.childNodes.forEach(function(n) { if (n.nodeType === 3) textNodes2.push(n); });
          textNodes2.forEach(function(n) { n.textContent = '暂停'; });
        }
      });
    }

    registerListener(input, 'keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    if (sendBtn) {
      registerListener(sendBtn, 'click', sendMessage);
    }

    var debouncedSendMessage = window.Utils && window.Utils.debounce
      ? window.Utils.debounce(sendMessage, 300)
      : sendMessage;

    function sendMessage() {
      if (isGenerating) return;
      var content = input.value.trim();
      if (!content) return;

      var messagesContainer = document.getElementById('chat-messages-container');
      if (!messagesContainer) return;

      var detectedIntent = detectUserIntent(content);
      if (detectedIntent) {
        handleDetectedIntent(detectedIntent, content);
        input.value = '';
        return;
      }

      var userMsg = createMessageEl('用户', content, 'user');
      messagesContainer.appendChild(userMsg);

      chatHistory.push({ role: 'user', content: content });

      input.value = '';

      var aiMsg = createMessageEl('AI', '', 'ai');
      var aiContent = aiMsg.querySelector('.msg-content');
      aiContent.innerHTML = '<span style="color: var(--text-tertiary);">正在思考...</span>';
      messagesContainer.appendChild(aiMsg);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      isGenerating = true;
      updateAIStatus('正在生成...');
      if (stopBtn) stopBtn.classList.remove('hidden');

      var context = window.Utils && window.Utils.getWorkContext ? window.Utils.getWorkContext() : {};
      var editorText = window.Utils && window.Utils.getEditorText ? window.Utils.getEditorText() : '';
      if (editorText) {
        context.currentContent = editorText.substring(0, 3000);
      }
      var messages = window.AIService.PROMPTS.assistant(context, content, chatHistory.slice(-20));

      var firstChunk = true;
      window.AIService.chat(messages, {
        stream: true,
        temperature: 0.8,
        max_tokens: 4096,
        onChunk: function(delta, fullContent) {
          if (firstChunk) {
            aiContent.innerHTML = '';
            firstChunk = false;
          }
          aiContent.innerHTML = formatAIResponse(fullContent);
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        },
        onDone: function(fullContent) {
          if (firstChunk) {
            aiContent.textContent = fullContent || '(空回复)';
          }
          chatHistory.push({ role: 'assistant', content: fullContent });
          isGenerating = false;
          isPaused = false;
          updateAIStatus('就绪');
          if (stopBtn) stopBtn.classList.add('hidden');
        },
        onError: function(err) {
          aiContent.innerHTML = '<span style="color: #f87171;">调用失败: ' + escapeHtml(err.message) + '</span>';
          isGenerating = false;
          isPaused = false;
          updateAIStatus('就绪');
          if (stopBtn) stopBtn.classList.add('hidden');
        }
      });
    }

    var insertBtn = document.querySelector('.ds-composer__icon-btn[title="插入选中内容"]');
    if (insertBtn) {
      registerListener(insertBtn, 'click', function() {
        var selection = window.getSelection();
        var selectedText = selection ? selection.toString().trim() : '';
        if (selectedText) {
          input.value += '\n【选中文本】\n' + selectedText + '\n';
          input.focus();
        } else {
          showNotification('请先在编辑器中选中要插入的内容', 'warn');
        }
      });
    }

    initVoiceInput(input);
  }

  var recognition = null;
  var isListening = false;

  function initVoiceInput(input) {
    var voiceBtn = document.getElementById('voice-input-btn');
    if (!voiceBtn) return;

    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      voiceBtn.style.opacity = '0.3';
      voiceBtn.title = '当前浏览器不支持语音输入';
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = true;

    var finalTranscript = '';

    recognition.onstart = function() {
      isListening = true;
      voiceBtn.style.background = 'var(--bg-brand)';
      voiceBtn.style.borderRadius = '50%';
      var img = voiceBtn.querySelector('img');
      if (img) img.style.opacity = '1';
      updateAIStatus('正在聆听...');
    };

    recognition.onend = function() {
      isListening = false;
      voiceBtn.style.background = '';
      voiceBtn.style.borderRadius = '';
      var img = voiceBtn.querySelector('img');
      if (img) img.style.opacity = '';
      updateAIStatus('就绪');
    };

    recognition.onerror = function(event) {
      console.warn('语音识别错误:', event.error);
      if (event.error === 'not-allowed') {
        showNotification('请允许麦克风权限以使用语音输入', 'warn');
      } else if (event.error !== 'no-speech') {
        showNotification('语音识别出错: ' + event.error, 'error');
      }
      isListening = false;
    };

    recognition.onresult = function(event) {
      var interimTranscript = '';
      for (var i = event.resultIndex; i < event.results.length; i++) {
        var transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      input.value = finalTranscript + interimTranscript;
      input.focus();
    };

    registerListener(voiceBtn, 'click', function() {
      if (isListening) {
        recognition.stop();
      } else {
        finalTranscript = input.value;
        try {
          recognition.start();
        } catch (e) {
          console.warn('启动语音识别失败:', e);
        }
      }
    });
  }

  function detectUserIntent(message) {
    var lowerMsg = message.toLowerCase();

    var intentPatterns = [
      { patterns: ['续写', '接着写', '继续写', '写下去', '接着', '继续', '往下写', '写更多', '再来一段'], intent: 'continueWriting' },
      { patterns: ['润色', '优化', '修改', '改进', '美化', '修饰', '提炼', '改写'], intent: 'polish' },
      { patterns: ['对话', '生成对话', '写对话', '添加对话', '来一段对话', '角色对话'], intent: 'generateDialogue' },
      { patterns: ['卡文', '写不出来', '卡壳', '卡住了', '没思路', '不知道怎么写', '写不下去', '灵感枯竭'], intent: 'diagnose' },
      { patterns: ['排版', '格式化', '格式', '整理格式'], intent: 'format' },
      { patterns: ['扩写', '扩展', '展开', '详细', '写详细', '丰富内容'], intent: 'expandText' },
      { patterns: ['精简', '压缩', '缩短', '简洁', '删减', '缩减'], intent: 'condenseText' },
      { patterns: ['检查', '一致性', '逻辑问题', '矛盾', '前后矛盾', '设定冲突'], intent: 'checkConsistency' },
      { patterns: ['自动写作', '批量写', '大量写', '写完', '自动生成', '一口气写'], intent: 'autoWrite' },
      { patterns: ['剧情', '走向', '接下来', '发展', '怎么发展', '剧情建议', '给个方向', '走向建议'], intent: 'suggestPlotDirection' },
      { patterns: ['提取角色', '角色提取', '识别角色', '人物信息', '角色分析'], intent: 'extractCharacters' },
      { patterns: ['场景', '环境描写', '场景描写', '五感', '氛围', '场景增强'], intent: 'enhanceScene' },
      { patterns: ['心理', '内心', '心理活动', '心理描写', '内心独白', '心理增强'], intent: 'enhanceInnerThought' }
    ];

    for (var i = 0; i < intentPatterns.length; i++) {
      var item = intentPatterns[i];
      for (var j = 0; j < item.patterns.length; j++) {
        if (lowerMsg.indexOf(item.patterns[j]) !== -1) {
          return {
            intent: item.intent,
            confidence: 0.9,
            originalMessage: message
          };
        }
      }
    }

    return null;
  }

  function handleDetectedIntent(detected, message) {
    var editorText = window.Utils && window.Utils.getEditorText ? window.Utils.getEditorText() : '';
    var selection = window.getSelection();
    var selectedText = selection ? selection.toString().trim() : '';

    var allButtons = DEFAULT_QUICK_BUTTONS.concat(EXPANDED_BUTTONS);
    var btnConfig = null;

    for (var i = 0; i < allButtons.length; i++) {
      if (allButtons[i].action === detected.intent) {
        btnConfig = allButtons[i];
        break;
      }
    }

    if (!btnConfig) return;

    var messagesContainer = document.getElementById('chat-messages-container');
    if (messagesContainer) {
      var intentMsg = createMessageEl('系统', '识别为：' + btnConfig.label + '，正在处理...', 'user');
      intentMsg.querySelector('.msg-content').style.background = 'var(--bg-overlay-l2)';
      intentMsg.querySelector('.msg-content').style.color = 'var(--text-secondary)';
      intentMsg.querySelector('.msg-content').style.fontSize = '12px';
      messagesContainer.appendChild(intentMsg);
    }

    if (btnConfig.processType === 'special') {
      handleSpecialAction(btnConfig);
    } else if (btnConfig.processType === 'replaceSelection' && selectedText) {
      executeAIAction(btnConfig, selectedText, 'replaceSelection');
    } else if (editorText) {
      executeAIAction(btnConfig, editorText, btnConfig.processType);
    } else {
      showNotification('编辑器中没有内容', 'warn');
    }
  }

  function updateAIStatus(status) {
    var statusText = document.getElementById('ai-status-text');
    if (statusText) {
      statusText.textContent = status;
    }
  }

  function formatAIResponse(text) {
    if (!text) return '';

    var result = escapeHtml(text);

    result = result.replace(/\n/g, '<br>');

    result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');

    result = result.replace(/^### (.+)$/gm, '<h4 style="margin:8px 0 4px;font-size:14px;font-weight:600;">$1</h4>');
    result = result.replace(/^## (.+)$/gm, '<h3 style="margin:12px 0 6px;font-size:15px;font-weight:600;">$1</h3>');
    result = result.replace(/^# (.+)$/gm, '<h2 style="margin:12px 0 8px;font-size:16px;font-weight:600;">$1</h2>');

    if (window.Utils && window.Utils.sanitizeHtml) {
      result = window.Utils.sanitizeHtml(result);
    }

    return result;
  }

  function createMessageEl(sender, text, type) {
    var msg = document.createElement('div');
    msg.style.cssText = 'display:flex; gap:8px; max-width:100%;' +
      (type === 'user' ? ' justify-content:flex-end;' : '');

    if (type === 'ai') {
      var avatar = document.createElement('div');
      avatar.className = 'flex-shrink-0';
      avatar.style.cssText = 'width:24px; height:24px; border-radius:50%; background:var(--bg-brand); display:flex; align-items:center; justify-content:center; margin-top:2px;';
      avatar.innerHTML = '<img src="../assets/icons/dl-builtin-trae/sparkles.32f08c.svg" width="12" height="12" alt="">';
      msg.appendChild(avatar);
    }

    var contentWrap = document.createElement('div');
    contentWrap.style.cssText = type === 'user'
      ? 'background:var(--bg-brand); border-radius:6px; padding:10px 12px; font-size:13px; line-height:1.6; color:var(--text-onbrand); max-width:85%;'
      : 'background:var(--bg-overlay-l1); border-radius:6px; padding:10px 12px; font-size:13px; line-height:1.6; color:var(--text-default); max-width:85%;';

    var content = document.createElement('div');
    content.className = 'msg-content';
    content.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
    contentWrap.appendChild(content);
    msg.appendChild(contentWrap);

    return msg;
  }

  window.Composer = {
    init: initComposer,
    get isGenerating() { return isGenerating; },
    set isGenerating(value) { isGenerating = value; },
    chatHistory: chatHistory,
    updateAIStatus: updateAIStatus,
    cleanup: cleanupListeners
  };

})();