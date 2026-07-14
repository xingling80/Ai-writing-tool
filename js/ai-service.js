/**
 * AI 服务层 - 支持多模型 API 调用
 * 兼容 OpenAI 格式（GPT-4o, DeepSeek, Qwen 等）和 Anthropic 格式（Claude）
 */
(function (window) {
  'use strict';

  // ========== 创作记忆系统 ==========
  // 解决 AI 写小说的核心问题：上下文丢失、角色退化、伏笔遗忘、设定矛盾

  var MEMORY_KEY = 'ai_writing_memory';

  function loadMemory() {
    try {
      var saved = localStorage.getItem(MEMORY_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('加载创作记忆失败:', e);
    }
    return {
      characters: [],    // 角色设定簿
      worldSettings: '', // 世界观设定
      foreshadowing: [], // 伏笔追踪（未解决的剧情线）
      plotThreads: [],   // 剧情线索
      globalSummary: '', // 全局摘要（长篇记忆）
      styleNotes: ''     // 文风备注
    };
  }

  function saveMemory(memory) {
    try {
      localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
    } catch (e) {
      console.warn('保存创作记忆失败:', e);
    }
  }

  function getMemory() {
    return loadMemory();
  }

  function updateMemory(field, value) {
    var memory = loadMemory();
    if (field === 'character') {
      // 添加或更新角色
      var idx = -1;
      memory.characters.forEach(function(c, i) {
        if (c.name === value.name) idx = i;
      });
      if (idx >= 0) {
        memory.characters[idx] = value;
      } else {
        memory.characters.push(value);
      }
    } else if (field === 'removeCharacter') {
      memory.characters = memory.characters.filter(function(c) {
        return c.name !== value;
      });
    } else if (field === 'foreshadowing') {
      var fIdx = -1;
      memory.foreshadowing.forEach(function(f, i) {
        if (f.id === value.id) fIdx = i;
      });
      if (fIdx >= 0) {
        memory.foreshadowing[fIdx] = value;
      } else {
        memory.foreshadowing.push(value);
      }
    } else if (field === 'resolveForeshadowing') {
      memory.foreshadowing = memory.foreshadowing.map(function(f) {
        if (f.id === value) f.resolved = true;
        return f;
      });
    } else if (field === 'removeForeshadowing') {
      memory.foreshadowing = memory.foreshadowing.filter(function(f) {
        return f.id !== value;
      });
    } else {
      memory[field] = value;
    }
    saveMemory(memory);
    return memory;
  }

  // 生成上下文注入文本（分层结构：设定→摘要→角色→伏笔→文风）
  function buildContextBlock(context) {
    var memory = loadMemory();
    var parts = [];

    // 第一层：作品基本信息
    if (context) {
      var basicInfo = [];
      if (context.workName) basicInfo.push('作品名：' + context.workName);
      if (context.chapter) basicInfo.push('当前章节：' + context.chapter);
      if (context.genre) basicInfo.push('题材/类型：' + context.genre);
      if (context.style) basicInfo.push('文风：' + context.style);
      if (context.description) basicInfo.push('作品简介：' + context.description);
      if (basicInfo.length > 0) {
        parts.push('【作品基本信息】\n' + basicInfo.join('\n'));
      }

      // 章节大纲
      if (context.outline && context.outline.length > 0) {
        parts.push('【章节大纲】\n' + context.outline.map(function(item, i) { return (i + 1) + '. ' + item; }).join('\n'));
      }
    }

    // 第二层：世界观设定
    if (memory.worldSettings) {
      parts.push('【世界观设定】\n' + memory.worldSettings);
    }

    // 第三层：全局摘要（长篇记忆，防止AI"忘事"）
    if (memory.globalSummary) {
      parts.push('【故事全局摘要】\n' + memory.globalSummary);
    }

    // 第四层：角色设定簿（防止角色"精分"）
    if (memory.characters && memory.characters.length > 0) {
      var charBlock = '【角色设定簿】\n';
      memory.characters.forEach(function(c) {
        if (c.resolved) return;
        charBlock += '■ ' + c.name;
        if (c.alias) charBlock += '（' + c.alias + '）';
        charBlock += '\n';
        if (c.age) charBlock += '  年龄：' + c.age + '\n';
        if (c.personality) charBlock += '  性格：' + c.personality + '\n';
        if (c.motivation) charBlock += '  核心动机：' + c.motivation + '\n';
        if (c.weakness) charBlock += '  弱点：' + c.weakness + '\n';
        if (c.appearance) charBlock += '  外貌：' + c.appearance + '\n';
        if (c.speechStyle) charBlock += '  说话风格：' + c.speechStyle + '\n';
        if (c.relationships) charBlock += '  人际关系：' + c.relationships + '\n';
        if (c.currentStatus) charBlock += '  当前状态：' + c.currentStatus + '\n';
      });
      parts.push(charBlock);
    }

    // 第五层：伏笔追踪（防止伏笔丢失）
    var unresolved = memory.foreshadowing ? memory.foreshadowing.filter(function(f) { return !f.resolved; }) : [];
    if (unresolved.length > 0) {
      var fBlock = '【未解决的伏笔/悬念】\n';
      unresolved.forEach(function(f, i) {
        fBlock += (i + 1) + '. ' + f.description;
        if (f.hint) fBlock += '（提示：' + f.hint + '）';
        fBlock += '\n';
      });
      parts.push(fBlock);
    }

    // 第六层：文风备注
    if (memory.styleNotes) {
      parts.push('【文风要求】\n' + memory.styleNotes);
    }

    if (parts.length === 0) return '';
    return parts.join('\n\n');
  }

  // ========== 内置模型预设配置 ==========
  var BUILTIN_MODELS = {
    'DeepSeek': {
      provider: 'openai',
      model: 'deepseek-chat',
      apiUrl: 'https://api.deepseek.com/v1/chat/completions'
    },
    'Qwen': {
      provider: 'openai',
      model: 'qwen-plus',
      apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
    },
    'Claude': {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20240620',
      apiUrl: 'https://api.anthropic.com/v1/messages'
    },
    'Gemini': {
      provider: 'openai',
      model: 'gemini-1.5-flash',
      apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
    },
    'GPT': {
      provider: 'openai',
      model: 'gpt-4o',
      apiUrl: 'https://api.openai.com/v1/chat/completions'
    },
    'Moonshot': {
      provider: 'openai',
      model: 'moonshot-v1-8k',
      apiUrl: 'https://api.moonshot.cn/v1/chat/completions'
    },
    'Yi': {
      provider: 'openai',
      model: 'yi-34b-chat',
      apiUrl: 'https://api.lingyiwanwu.com/v1/chat/completions'
    },
    'Zhipu': {
      provider: 'openai',
      model: 'glm-4',
      apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
    }
  };

  // ========== 存储管理 ==========
  var STORAGE_KEY = 'ai_writing_models_config';
  var ENCRYPTED_KEYS_KEY = 'ai_writing_encrypted_keys';

  function loadConfig() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('加载配置失败:', e);
    }
    return {};
  }

  function saveConfig(config) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('保存配置失败:', e);
    }
  }

  function saveApiKeyEncrypted(modelName, apiKey) {
    if (window.secureStorage) {
      return window.secureStorage.encryptAndSaveKey(ENCRYPTED_KEYS_KEY + '_' + modelName, apiKey);
    } else {
      try {
        var keys = loadEncryptedKeys();
        keys[modelName] = apiKey;
        localStorage.setItem(ENCRYPTED_KEYS_KEY, JSON.stringify(keys));
        return Promise.resolve({ success: true });
      } catch (e) {
        return Promise.resolve({ success: false, error: e.message });
      }
    }
  }

  function loadEncryptedKeys() {
    try {
      var saved = localStorage.getItem(ENCRYPTED_KEYS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('加载密钥配置失败:', e);
    }
    
    return migrateOldApiKeys();
  }

  function migrateOldApiKeys() {
    var keys = {};
    var oldKeys = [
      { oldKey: 'AI_API_KEY', modelName: 'OpenAI' },
      { oldKey: 'AI_API_BASE_URL', modelName: 'OpenAI' },
      { oldKey: 'claude_api_key', modelName: 'Claude' },
      { oldKey: 'deepseek_api_key', modelName: 'DeepSeek' },
      { oldKey: 'custom_api_key', modelName: 'Custom' },
      { oldKey: 'ai_api_key', modelName: 'OpenAI' },
      { oldKey: 'openai_api_key', modelName: 'OpenAI' }
    ];
    
    oldKeys.forEach(function(item) {
      try {
        var oldValue = localStorage.getItem(item.oldKey);
        if (oldValue && oldValue.length > 0) {
          keys[item.modelName] = oldValue;
          localStorage.removeItem(item.oldKey);
        }
      } catch (e) {
        console.warn('迁移旧密钥失败:', e);
      }
    });
    
    if (Object.keys(keys).length > 0) {
      localStorage.setItem(ENCRYPTED_KEYS_KEY, JSON.stringify(keys));
    }
    
    return keys;
  }

  function isModelConfigured(modelName) {
    var keys = loadEncryptedKeys();
    return keys[modelName] && keys[modelName].length > 0;
  }

  function getApiKeyEncrypted(modelName) {
    if (window.secureStorage) {
      return window.secureStorage.decryptKey(ENCRYPTED_KEYS_KEY + '_' + modelName);
    } else {
      try {
        var keys = loadEncryptedKeys();
        return Promise.resolve({ success: true, value: keys[modelName] || '' });
      } catch (e) {
        return Promise.resolve({ success: false, error: e.message, value: '' });
      }
    }
  }

  function getModelsConfig() {
    var saved = loadConfig();
    var merged = {};
    Object.keys(BUILTIN_MODELS).forEach(function (key) {
      merged[key] = BUILTIN_MODELS[key];
    });
    Object.keys(saved).forEach(function (key) {
      merged[key] = saved[key];
    });
    return merged;
  }

  function getModelConfig(modelName) {
    var config = getModelsConfig();
    return config[modelName] || null;
  }

  function setModelConfig(modelName, config) {
    var saved = loadConfig();
    saved[modelName] = config;
    saveConfig(saved);
  }

  function deleteModelConfig(modelName) {
    var saved = loadConfig();
    delete saved[modelName];
    saveConfig(saved);
    var keys = loadEncryptedKeys();
    delete keys[modelName];
    localStorage.setItem(ENCRYPTED_KEYS_KEY, JSON.stringify(keys));
  }

  // ========== 当前模型管理 ==========
  var CURRENT_MODEL_KEY = 'ai_writing_current_model';

  function getCurrentModel() {
    var saved = localStorage.getItem(CURRENT_MODEL_KEY);
    if (saved) {
      if (isModelConfigured(saved)) {
        return saved;
      }
    }
    var keys = loadEncryptedKeys();
    var configuredModels = Object.keys(keys).filter(function(k) { return keys[k] && keys[k].length > 0; });
    return configuredModels.length > 0 ? configuredModels[0] : '';
  }

  function setCurrentModel(modelName) {
    localStorage.setItem(CURRENT_MODEL_KEY, modelName);
  }

  // ========== API 调用核心 ==========

  /**
   * 调用 OpenAI 兼容格式 API
   */
  function callOpenAI(config, messages, options, onChunk, onDone, onError) {
    var body = {
      model: config.model,
      messages: messages,
      stream: options.stream !== false,
      temperature: options.temperature || 0.8,
      max_tokens: options.max_tokens || 2000
    };

    fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + config.apiKey
      },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (text) {
          throw new Error('API 请求失败 (' + res.status + '): ' + text);
        });
      }

      if (options.stream === false) {
        return res.json().then(function (data) {
          var content = data.choices && data.choices[0] && data.choices[0].message
            ? data.choices[0].message.content
            : '';
          onDone(content);
        });
      }

      // 流式读取
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';
      var fullContent = '';

      function readChunk() {
        reader.read().then(function (result) {
          if (result.done) {
            onDone(fullContent);
            return;
          }
          buffer += decoder.decode(result.value, { stream: true });
          var lines = buffer.split('\n');
          buffer = lines.pop();

          lines.forEach(function (line) {
            line = line.trim();
            if (line.startsWith('data: ')) {
              var data = line.slice(6);
              if (data === '[DONE]') return;
              try {
                var json = JSON.parse(data);
                var delta = json.choices && json.choices[0] && json.choices[0].delta
                  ? json.choices[0].delta.content || ''
                  : '';
                if (delta) {
                  fullContent += delta;
                  if (onChunk) onChunk(delta, fullContent);
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          });

          readChunk();
        }).catch(function (err) {
          if (onError) onError(err);
        });
      }

      readChunk();
    }).catch(function (err) {
      if (onError) onError(err);
    });
  }

  /**
   * 调用 Anthropic API (Claude)
   */
  function callAnthropic(config, messages, options, onChunk, onDone, onError) {
    // 转换消息格式：将 OpenAI 格式转换为 Anthropic 格式
    var systemMessage = '';
    var anthropicMessages = [];

    messages.forEach(function (msg) {
      if (msg.role === 'system') {
        systemMessage += (systemMessage ? '\n' : '') + msg.content;
      } else {
        anthropicMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        });
      }
    });

    var body = {
      model: config.model,
      messages: anthropicMessages,
      max_tokens: options.max_tokens || 2000,
      stream: options.stream !== false
    };
    if (systemMessage) {
      body.system = systemMessage;
    }

    fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (text) {
          throw new Error('API 请求失败 (' + res.status + '): ' + text);
        });
      }

      if (options.stream === false) {
        return res.json().then(function (data) {
          var content = data.content && data.content[0] ? data.content[0].text : '';
          onDone(content);
        });
      }

      // 流式读取
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';
      var fullContent = '';

      function readChunk() {
        reader.read().then(function (result) {
          if (result.done) {
            onDone(fullContent);
            return;
          }
          buffer += decoder.decode(result.value, { stream: true });
          var lines = buffer.split('\n');
          buffer = lines.pop();

          lines.forEach(function (line) {
            line = line.trim();
            if (line.startsWith('data: ')) {
              var data = line.slice(6);
              try {
                var json = JSON.parse(data);
                if (json.type === 'content_block_delta' && json.delta && json.delta.text) {
                  fullContent += json.delta.text;
                  if (onChunk) onChunk(json.delta.text, fullContent);
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          });

          readChunk();
        }).catch(function (err) {
          if (onError) onError(err);
        });
      }

      readChunk();
    }).catch(function (err) {
      if (onError) onError(err);
    });
  }

  // ========== 统一调用接口 ==========

  /**
   * 调用 AI 模型
   * @param {Array} messages - 消息数组 [{role, content}]
   * @param {Object} options - 选项 {stream, temperature, max_tokens, onChunk, onDone, onError, model}
   */
  function chat(messages, options) {
    options = options || {};
    var modelName = options.model || getCurrentModel();
    var config = getModelConfig(modelName);

    if (!config) {
      if (options.onError) options.onError(new Error('未找到模型配置，请点击左下角模型名称配置 API。'));
      return;
    }

    var onChunk = options.onChunk || function () {};
    var onDone = options.onDone || function () {};
    var onError = options.onError || function (err) {
      console.error('AI 调用失败:', maskError(err));
    };

    getApiKeyEncrypted(modelName).then(function(result) {
      if (!result.success) {
        if (options.onError) options.onError(new Error('密钥读取失败'));
        return;
      }
      
      var apiKey = result.value || config.apiKey;
      if (!apiKey) {
        if (options.onError) options.onError(new Error('请先配置 API Key。点击左下角模型名称进行设置。'));
        return;
      }

      config.apiKey = apiKey;

      if (config.provider === 'anthropic') {
        callAnthropic(config, messages, options, onChunk, onDone, onError);
      } else {
        callOpenAI(config, messages, options, onChunk, onDone, onError);
      }
    }).catch(function(err) {
      console.error('获取密钥异常:', err);
      if (options.onError) options.onError(new Error('密钥读取异常'));
    });
  }

  function maskError(err) {
    if (!err || !err.message) return err;
    var masked = err.message;
    if (window.Utils && window.Utils.maskSecret) {
      masked = masked.replace(/sk-[a-zA-Z0-9]+/g, function(match) {
        return window.Utils.maskSecret(match);
      });
    }
    return Object.assign(err, { message: masked });
  }

  // ========== 写作场景预设 Prompt ==========

  var PROMPTS = {
    // 续写下一段
    continueWriting: function (context, currentText, mode) {
      var memoryContext = buildContextBlock(context);
      var contextInfo = '作品名：' + (context.workName || '未命名') + '\n当前章节：' + (context.chapter || '未命名');
      if (context.outline && context.outline.length > 0) {
        contextInfo += '\n章节大纲：\n' + context.outline.map(function(item, i) { return (i + 1) + '. ' + item; }).join('\n');
      }

      var modeInstruction = '';
      if (mode === 'plot') {
        modeInstruction = '【当前模式：情节推进】\n请加快叙事节奏，重点推进主线剧情发展，引入新的事件或冲突，让故事有实质性进展。输出约500-700字。';
      } else if (mode === 'emotion') {
        modeInstruction = '【当前模式：情感递进】\n请侧重人物情感和心理描写，深入刻画人物内心世界的变化，通过细节展现情感的递进和转变。输出约400-600字。';
      } else if (mode === 'suspense') {
        modeInstruction = '【当前模式：悬念转折】\n请制造悬念或剧情反转，埋下新的伏笔，或让局势出现意想不到的变化，增加故事张力。输出约400-600字。';
      } else {
        modeInstruction = '【当前模式：自然续写】\n保持当前叙事节奏自然推进。输出约400-600字。';
      }

      var systemContent = '你是一位专业的小说创作助手。请根据已有的章节内容，续写下一段。\n\n' +
        modeInstruction + '\n\n' +
        '【核心规则（严格遵守）】\n' +
        '1. 严格保持文风和叙事视角一致\n' +
        '2. 自然衔接现有内容，不要重复已有内容\n' +
        '3. 推动情节发展，引入新的张力或转折\n' +
        '4. 【重要】只输出续写的正文内容，绝对不要加任何标题、章节名、说明文字、注释\n' +
        '5. 自动分段：场景转换、视角切换、对话开始/结束时，用空行分隔段落\n' +
        '6. 人物对话必须单独成段\n' +
        '7. 多用"五感描写"让场景更立体\n' +
        '8. 注意角色说话风格必须符合设定\n' +
        '9. 【防AI味】禁止总结式结尾，禁止"他知道""他想到"开头，禁止过度省略号，禁止直白陈述情感';

      if (memoryContext) {
        systemContent += '\n\n' + memoryContext;
      }

      // 截取最后3000字作为前文上下文，避免超出token限制
      var recentText = currentText.length > 3000 ? '...(前文省略)\n' + currentText.substring(currentText.length - 3000) : currentText;

      return [
        { role: 'system', content: systemContent },
        { role: 'user', content: contextInfo + '\n\n已有内容：\n' + recentText + '\n\n请续写下一段正文：' }
      ];
    },

    // 润色全文
    polish: function (context, currentText, mode) {
      var memoryContext = buildContextBlock(context);

      var modeInstruction = '';
      if (mode === 'deep') {
        modeInstruction = '【当前模式：深度润色】\n全面提升文学性和表现力，对句子结构、用词、节奏进行深度优化，大幅提升文字质感，但保持原意和情节不变。';
      } else if (mode === 'classical') {
        modeInstruction = '【当前模式：古风化】\n将文字转为古风水墨风格，使用典雅的文言词汇和句式，营造古典韵味，但保持可读性和故事性。';
      } else if (mode === 'colloquial') {
        modeInstruction = '【当前模式：口语化】\n将文字转为更贴近日常对话的口语化风格，用词更自然随意，更接地气，但保持叙事流畅。';
      } else {
        modeInstruction = '【当前模式：轻度润色】\n优化表达，修正小问题，不改变原意和风格，只做轻微的文字优化。';
      }

      var systemContent = '你是一位专业的文学编辑。请对以下文章进行润色。\n\n' +
        modeInstruction + '\n\n' +
        '【润色规则（严格遵守）】\n' +
        '1. 保持原文的故事情节和人物性格绝对不变\n' +
        '2. 【重要】只输出润色后的完整正文，不要加任何标题、说明、注释\n' +
        '3. 【重要】保持原有的段落结构，原有的分段不要随意合并或拆分\n' +
        '4. 注意角色言行必须符合角色设定\n' +
        '5. 不要改变剧情走向，只优化表达\n' +
        '6. 对话要符合人物性格';

      if (memoryContext) {
        systemContent += '\n\n' + memoryContext;
      }

      return [
        { role: 'system', content: systemContent },
        { role: 'user', content: '作品名：' + (context.workName || '未命名') + '\n章节：' + (context.chapter || '未命名') + '\n\n请润色以下内容：\n\n' + currentText }
      ];
    },

    // 生成对话
    generateDialogue: function (context, currentText) {
      var memoryContext = buildContextBlock(context);
      var systemContent = '你是一位专业的小说对话编写助手。请根据已有内容，为当前场景生成一段角色对话。\n\n' +
        '【对话规则（严格遵守）】\n' +
        '1. 对话必须严格符合角色设定簿中的性格和说话风格\n' +
        '2. 推动情节发展或揭示人物内心\n' +
        '3. 语言自然生动，有潜台词和张力，不要像白开水\n' +
        '4. 每个角色的说话方式要有辨识度，不能千人一面\n' +
        '5. 加入适当的动作描写和神态描写，穿插在对话之间\n' +
        '6. 【重要】只输出对话正文（含动作和神态描写），不要加任何标题、说明、注释、Markdown标记\n' +
        '7. 【重要】格式规范：\n' +
        '   - 每段对话或描写单独成段，用空行分隔\n' +
        '   - 人物对话用中文引号「""」包裹\n' +
        '   - 动作/神态描写可以放在对话前、对话后，或者单独成段\n' +
        '   - 避免大段纯对话没有任何动作描写\n' +
        '8. 对话要有来有回，形成交锋或交流，不要一个人说一大段\n' +
        '9. 适当加入停顿、犹豫、打断等真实对话元素\n' +
        '10. 输出约300-500字';

      if (memoryContext) {
        systemContent += '\n\n' + memoryContext;
      }

      var recentText = currentText.length > 3000 ? '...(前文省略)\n' + currentText.substring(currentText.length - 3000) : currentText;

      return [
        { role: 'system', content: systemContent },
        { role: 'user', content: '作品名：' + (context.workName || '未命名') + '\n当前章节：' + (context.chapter || '未命名') + '\n\n已有内容：\n' + recentText + '\n\n请生成一段对话：' }
      ];
    },

    // 检查一致性
    checkConsistency: function (context, currentText) {
      var memoryContext = buildContextBlock(context);
      var systemContent = '你是一位专业的小说编辑，负责检查文章的逻辑一致性。\n\n' +
        '【检查维度】\n' +
        '1. 人物性格是否与设定簿一致\n' +
        '2. 人物称呼/名字是否前后统一\n' +
        '3. 时间线是否矛盾\n' +
        '4. 事实性错误（如已死角色再出现）\n' +
        '5. 情节逻辑问题\n' +
        '6. 世界观设定冲突\n' +
        '7. 角色能力/状态前后矛盾\n' +
        '8. 场景细节不一致（如白天突然变黑夜）\n\n' +
        '请以列表形式指出问题并给出修改建议，如果没有问题请说明"未发现一致性问题"。';

      if (memoryContext) {
        systemContent += '\n\n' + memoryContext;
      }

      return [
        { role: 'system', content: systemContent },
        { role: 'user', content: '作品名：' + (context.workName || '未命名') + '\n当前章节：' + (context.chapter || '未命名') + '\n\n内容：\n' + currentText }
      ];
    },

    // AI 助手对话
    assistant: function (context, userMessage, history) {
      var memoryContext = buildContextBlock(context);
      var contextInfo = '当前作品：' + (context.workName || '未命名') + '\n当前章节：' + (context.chapter || '未命名');
      if (context.outline && context.outline.length > 0) {
        contextInfo += '\n章节大纲：' + context.outline.join('、');
      }
      if (context.genre) contextInfo += '\n作品类型：' + context.genre;
      if (context.style) contextInfo += '\n写作风格：' + context.style;
      if (context.description) contextInfo += '\n作品简介：' + context.description;
      if (context.targetWordCount) contextInfo += '\n目标字数：约' + context.targetWordCount + '字';
      if (context.currentContent) {
        contextInfo += '\n\n当前章节已有内容（摘要）：\n' + context.currentContent;
      }

      var systemContent = '你是一位专业的AI创作助手，帮助用户进行小说创作。\n\n' +
        '【你的能力】\n' +
        '1. 续写和扩展情节\n' +
        '2. 润色和修改文字\n' +
        '3. 构思人物和世界观\n' +
        '4. 提供写作建议\n' +
        '5. 检查逻辑一致性\n\n' +
        '【写作原则】\n' +
        '- 严格遵守角色设定簿中的性格和说话风格\n' +
        '- 有伏笔需要推进时优先呼应\n' +
        '- 避免重复的修辞手法和句式\n' +
        '- 用户说"续写""接着写""继续"时，基于已有内容自然续写\n' +
        '- 只在用户要求解释时才解释，否则直接生成内容\n\n' +
        contextInfo;

      if (memoryContext) {
        systemContent += '\n\n' + memoryContext;
      }

      var messages = [{ role: 'system', content: systemContent }];

      // 添加历史消息（使用ContextManager管理上下文窗口）
      if (history && history.length > 0) {
        var historyMessages = history.map(function (msg) {
          return { role: msg.role, content: msg.content };
        });
        if (window.Utils && window.Utils.ContextManager) {
          var compressedHistory = window.Utils.ContextManager.compressContext(historyMessages, 5000);
          messages = messages.concat(compressedHistory);
        } else {
          history.forEach(function (msg) {
            messages.push({ role: msg.role, content: msg.content });
          });
        }
      }

      messages.push({ role: 'user', content: userMessage });
      return messages;
    },

    // 生成素材
    generateMaterial: function (context, type, description) {
      var memoryContext = buildContextBlock(context);
      var systemContent = '你是一位专业的创作素材生成助手。请根据用户当前作品的设定和要求，生成符合作品风格的创作素材。素材类型包括：情节模板、人物设定、世界观、场景描写、对话风格。\n\n要求：\n1. 内容详细、有创意\n2. 必须符合当前作品的题材、风格和设定\n3. 与已有角色和世界观保持一致\n4. 只输出素材内容，不要加额外说明';

      if (memoryContext) {
        systemContent += '\n\n' + memoryContext;
      }

      return [
        { role: 'system', content: systemContent },
        { role: 'user', content: '作品名：' + (context.workName || '未命名') + '\n题材：' + (context.genre || '不限') + '\n文风：' + (context.style || '默认') + '\n\n素材类型：' + (type || '不限') + '\n要求描述：' + (description || '请生成一个有趣的创作素材') + '\n\n请生成素材：' }
      ];
    },

    // AI 展开素材
    expandMaterial: function (context, materialTitle, materialContent) {
      var memoryContext = buildContextBlock(context);
      var systemContent = '你是一位专业的创作素材展开助手。请将以下素材内容展开为更详细的描述，确保展开后的内容符合当前作品的设定和风格。\n\n展开要求：\n1. 更丰富的细节，使其更适合小说创作\n2. 具体的使用建议\n3. 可能的变体或发展方向\n4. 必须符合作品的题材、风格和已有设定\n5. 与已有角色和世界观保持一致\n\n只输出展开后的内容，不要加额外说明。';

      if (memoryContext) {
        systemContent += '\n\n' + memoryContext;
      }

      return [
        { role: 'system', content: systemContent },
        { role: 'user', content: '作品名：' + (context.workName || '未命名') + '\n题材：' + (context.genre || '不限') + '\n文风：' + (context.style || '默认') + '\n\n素材标题：' + materialTitle + '\n素材内容：' + materialContent + '\n\n请展开这个素材：' }
      ];
    },

    // 新建作品 AI 辅助
    assistNewWork: function (title, type, description) {
      return [
        {
          role: 'system',
          content: '你是一位专业的小说创作顾问。请根据用户提供的信息，生成一份作品创作建议。\n\n' +
            '【输出格式】\n' +
            '1. 故事大纲建议（约500字，含起承转合）\n' +
            '2. 主要人物设定（2-3个角色，每个含：姓名、年龄、性格、核心动机、弱点、说话风格）\n' +
            '3. 世界观设定建议\n' +
            '4. 核心冲突设计\n' +
            '5. 前5章的章节标题建议\n\n' +
            '请用清晰的格式输出。'
        },
        {
          role: 'user',
          content: '作品名称：' + (title || '未定') + '\n作品类型：' + (type || '不限') + '\n作品简介：' + (description || '暂无') + '\n\n请生成创作建议：'
        }
      ];
    },

    // 生成全局摘要（关键：让AI"记住"前面写了什么）
    generateSummary: function (context, currentText) {
      var memory = loadMemory();
      var existingSummary = memory.globalSummary || '';

      var systemContent = '你是一位专业的小说编辑，负责维护小说的全局摘要。全局摘要是AI续写时的"长期记忆"，确保AI不会忘记前面的剧情。\n\n' +
        '【摘要规则】\n' +
        '1. 按时间线简要记录每个章节的核心事件\n' +
        '2. 记录角色的关键变化（受伤、获得新能力、关系变化等）\n' +
        '3. 记录所有未解决的伏笔和悬念\n' +
        '4. 记录重要物品和地点\n' +
        '5. 每个事件用1-2句话概括，保持简洁\n' +
        '6. 如果已有旧摘要，在此基础上更新，不要丢失旧信息';

      if (existingSummary) {
        systemContent += '\n\n【旧摘要（在此基础上更新）】\n' + existingSummary;
      }

      return [
        { role: 'system', content: systemContent },
        { role: 'user', content: '作品名：' + (context.workName || '未命名') + '\n章节：' + (context.chapter || '未命名') + '\n\n请根据以下最新章节内容，更新全局摘要：\n\n' + currentText }
      ];
    },

    // 扩写：将选中内容扩展得更详细
    expandText: function (context, selectedText) {
      var memoryContext = buildContextBlock(context);
      var systemContent = '你是一位专业的小说创作助手。请将以下选中的文本进行扩写，使其更加丰富详细。\n\n' +
        '【扩写规则（严格遵守）】\n' +
        '1. 保持原文的核心意思和情节走向不变\n' +
        '2. 增加细节描写：环境、动作、神态、心理活动\n' +
        '3. 运用五感描写（视觉、听觉、嗅觉、触觉、味觉）增强画面感\n' +
        '4. 对话可以适当扩展，增加潜台词和张力\n' +
        '5. 【重要】只输出扩写后的正文，不要加任何标题、说明、注释、Markdown标记\n' +
        '6. 【重要】保持自然分段，对话单独成段\n' +
        '7. 扩写后字数约为原文的2-3倍\n' +
        '8. 保持文风和叙事视角一致\n' +
        '9. 角色言行必须符合角色设定簿';

      if (memoryContext) {
        systemContent += '\n\n' + memoryContext;
      }

      return [
        { role: 'system', content: systemContent },
        { role: 'user', content: '请扩写以下内容：\n\n' + selectedText }
      ];
    },

    // 精简：压缩文字，让表达更凝练
    condenseText: function (context, selectedText) {
      var memoryContext = buildContextBlock(context);
      var systemContent = '你是一位专业的文学编辑。请将以下文本进行精简压缩，让表达更加凝练有力。\n\n' +
        '【精简规则（严格遵守）】\n' +
        '1. 保留所有核心情节、关键信息和人物对话\n' +
        '2. 删除冗余的修饰词和重复的表达\n' +
        '3. 合并意思相近的句子\n' +
        '4. 用更精准的词语替代啰嗦的描述\n' +
        '5. 【重要】只输出精简后的正文，不要加任何标题、说明、注释、Markdown标记\n' +
        '6. 保持原有的段落结构和对话格式\n' +
        '7. 精简后字数约为原文的50%-70%\n' +
        '8. 保持文风和叙事视角不变\n' +
        '9. 不要改变剧情走向和人物性格';

      if (memoryContext) {
        systemContent += '\n\n' + memoryContext;
      }

      return [
        { role: 'system', content: systemContent },
        { role: 'user', content: '请精简以下内容：\n\n' + selectedText }
      ];
    },

    // 场景描写增强
    enhanceScene: function (context, selectedText) {
      var memoryContext = buildContextBlock(context);
      var systemContent = '你是一位专业的小说场景描写大师。请增强以下文本中的场景描写，让画面更加立体生动。\n\n' +
        '【场景增强规则（严格遵守）】\n' +
        '1. 保留原文的情节和对话，只增强环境和场景描写\n' +
        '2. 运用五感描写：\n' +
        '   - 视觉：光影、色彩、细节、构图\n' +
        '   - 听觉：环境音、人声、脚步声、风声等\n' +
        '   - 嗅觉：气味、气息、味道\n' +
        '   - 触觉：温度、质感、风吹、雨打\n' +
        '   - 味觉（如适用）：口中的味道\n' +
        '3. 用环境烘托人物心情，情景交融\n' +
        '4. 增加有象征意义的细节（如天气、时间、物品）\n' +
        '5. 【重要】只输出增强后的正文，不要加任何标题、说明、注释、Markdown标记\n' +
        '6. 【重要】保持自然分段，对话单独成段\n' +
        '7. 增强描写后整体字数增加约50%-80%\n' +
        '8. 保持文风和叙事视角一致';

      if (memoryContext) {
        systemContent += '\n\n' + memoryContext;
      }

      return [
        { role: 'system', content: systemContent },
        { role: 'user', content: '请增强以下内容的场景描写：\n\n' + selectedText }
      ];
    },

    // 心理描写增强
    enhanceInnerThought: function (context, selectedText) {
      var memoryContext = buildContextBlock(context);
      var systemContent = '你是一位擅长心理描写的小说创作助手。请增强以下文本中人物的心理描写，让内心活动更加丰富立体。\n\n' +
        '【心理描写增强规则（严格遵守）】\n' +
        '1. 保留原文的情节和对话，只增加心理活动\n' +
        '2. 心理描写要符合人物性格设定，不能OOC（out of character）\n' +
        '3. 多角度展现内心：\n' +
        '   - 直接的想法和念头\n' +
        '   - 情绪和感受（紧张、喜悦、恐惧、犹豫等）\n' +
        '   - 内心的矛盾和挣扎\n' +
        '   - 回忆和联想（如能触发回忆）\n' +
        '   - 身体的生理反应（心跳、手心出汗、呼吸急促等）\n' +
        '4. 心理活动要自然融入叙事，不要生硬堆砌\n' +
        '5. 【重要】只输出增强后的正文，不要加任何标题、说明、注释、Markdown标记\n' +
        '6. 【重要】保持自然分段\n' +
        '7. 增强后整体字数增加约40%-70%\n' +
        '8. 保持文风和叙事视角一致';

      if (memoryContext) {
        systemContent += '\n\n' + memoryContext;
      }

      return [
        { role: 'system', content: systemContent },
        { role: 'user', content: '请增强以下内容的心理描写：\n\n' + selectedText }
      ];
    },

    // ========== 自动写作模式系列 ==========

    // 自动写作 - 直接开始模式
    autoWriteDirect: function (context, currentText) {
      var memoryContext = buildContextBlock(context);
      var systemContent = '你是一位专业的小说作家，正在为一个长篇小说进行续写。\n\n' +
        '【任务】根据已有内容，自然地续写下去。\n\n' +
        '【规则（严格遵守）】\n' +
        '1. 保持文风、叙事视角、人物性格与已有内容完全一致\n' +
        '2. 自然衔接，推动情节发展，不要重复已有内容\n' +
        '3. 【重要】只输出正文，绝对不要加标题、章节名、注释、Markdown标记\n' +
        '4. 【重要】自然分段，对话单独成段，每段150-250字左右\n' +
        '5. 写约400-600字后暂停，等待用户确认是否继续\n' +
        '6. 运用五感描写让场景更立体\n' +
        '7. 对话要符合人物性格，有辨识度\n' +
        '8. 【防AI味】禁止总结式结尾，禁止"他知道""他想到"开头，禁止过度省略号，禁止直白陈述情感，禁止"却""竟""不由得"过度转折';

      if (memoryContext) {
        systemContent += '\n\n' + memoryContext;
      }

      var recentText = currentText.length > 3000 ? '...(前文省略)\n' + currentText.substring(currentText.length - 3000) : currentText;
      return [
        { role: 'system', content: systemContent },
        { role: 'user', content: '作品：' + (context.workName || '未命名') + '\n章节：' + (context.chapter || '未命名') + '\n\n已有内容：\n' + recentText + '\n\n请续写：' }
      ];
    },

    // 自动写作 - 先定大纲模式
    autoWriteOutline: function (context, currentText, outlineHint) {
      var memoryContext = buildContextBlock(context);
      var systemContent = '你是一位专业的小说策划师。请根据已有内容和用户需求，为当前章节生成一个段落大纲。\n\n' +
        '【大纲格式要求】\n' +
        '1. 输出5-8个段落标题，每个标题一行\n' +
        '2. 格式：数字序号 + 简短描述（如"1. 开场：夜色中的相遇"）\n' +
        '3. 每个段落标题控制在15字以内\n' +
        '4. 大纲要有起承转合，情节要有推进\n' +
        '5. 只输出大纲，不要输出正文';

      if (memoryContext) {
        systemContent += '\n\n' + memoryContext;
      }

      var recentText = currentText.length > 2000 ? currentText.substring(currentText.length - 2000) : currentText;
      var userHint = outlineHint ? '\n\n用户补充说明：' + outlineHint : '';
      return [
        { role: 'system', content: systemContent },
        { role: 'user', content: '作品：' + (context.workName || '未命名') + '\n章节：' + (context.chapter || '未命名') + '\n\n已有内容（末尾部分）：\n' + recentText + userHint + '\n\n请生成本章段落大纲：' }
      ];
    },

    // 自动写作 - 按大纲段落生成
    autoWriteByOutline: function (context, currentText, outlineItem, prevOutlineItem) {
      var memoryContext = buildContextBlock(context);
      var systemContent = '你是一位专业的小说作家。请根据大纲要点，写出对应的正文内容。\n\n' +
        '【规则（严格遵守）】\n' +
        '1. 紧扣大纲要点" ' + outlineItem + '"进行写作\n' +
        '2. 与前文自然衔接' + (prevOutlineItem ? '（上一段是：' + prevOutlineItem + '）' : '') + '\n' +
        '3. 【重要】只输出正文，绝对不要加标题、注释、Markdown标记\n' +
        '4. 【重要】自然分段，对话单独成段\n' +
        '5. 输出约300-500字\n' +
        '6. 运用五感描写，场景要立体\n' +
        '7. 【防AI味】禁止总结式结尾，禁止"他知道""他想到"开头，禁止过度省略号，禁止直白陈述情感，禁止"却""竟""不由得"过度转折';

      if (memoryContext) {
        systemContent += '\n\n' + memoryContext;
      }

      var recentText = currentText.length > 2000 ? currentText.substring(currentText.length - 2000) : currentText;
      return [
        { role: 'system', content: systemContent },
        { role: 'user', content: '已有内容：\n' + recentText + '\n\n请写出大纲要点"' + outlineItem + '"对应的正文：' }
      ];
    },

    // 自动写作 - 快速设定模式
    autoWriteWithSettings: function (context, currentText, settings) {
      var memoryContext = buildContextBlock(context);
      var systemContent = '你是一位专业的小说作家。请根据用户的设定要求，写出符合要求的正文。\n\n' +
        '【规则（严格遵守）】\n' +
        '1. 严格遵守用户的设定要求\n' +
        '2. 【重要】只输出正文，绝对不要加标题、注释、Markdown标记\n' +
        '3. 【重要】自然分段，对话单独成段\n' +
        '4. 运用五感描写，场景要立体\n' +
        '5. 对话要符合人物性格，有辨识度\n' +
        '6. 【防AI味】禁止总结式结尾，禁止"他知道""他想到"开头，禁止过度省略号，禁止直白陈述情感，禁止"却""竟""不由得"过度转折';

      if (memoryContext) {
        systemContent += '\n\n' + memoryContext;
      }

      var recentText = currentText.length > 2000 ? currentText.substring(currentText.length - 2000) : currentText;
      var settingsText = '';
      if (settings.targetWords) settingsText += '\n目标字数：约' + settings.targetWords + '字';
      if (settings.theme) settingsText += '\n本章主题：' + settings.theme;
      if (settings.keyEvents) settingsText += '\n关键事件：' + settings.keyEvents;
      if (settings.avoid) settingsText += '\n避免内容：' + settings.avoid;
      if (settings.style) settingsText += '\n文风要求：' + settings.style;

      return [
        { role: 'system', content: systemContent },
        { role: 'user', content: '作品：' + (context.workName || '未命名') + '\n章节：' + (context.chapter || '未命名') + settingsText + '\n\n已有内容：\n' + recentText + '\n\n请按设定写作：' }
      ];
    },

    // ========== 问题诊断系列 ==========

    // 综合问题诊断
    diagnoseProblem: function (context, currentText, problemDesc) {
      var memoryContext = buildContextBlock(context);
      var systemContent = '你是一位资深的小说编辑和写作教练。用户遇到了写作问题，请帮他分析并给出解决方案。\n\n' +
        '【诊断流程】\n' +
        '1. 分析问题：定位问题根源\n' +
        '2. 给出2-3个解决方案（每个方案要具体可操作）\n' +
        '3. 如果可以，提供一段示例文字展示如何改进\n\n' +
        '【输出格式】\n' +
        '**问题分析**\n（分析内容）\n\n' +
        '**方案一：**\n（方案内容）\n\n' +
        '**方案二：**\n（方案内容，如有）\n\n' +
        '**示例：**\n（示例文字，如有）';

      if (memoryContext) {
        systemContent += '\n\n' + memoryContext;
      }

      return [
        { role: 'system', content: systemContent },
        { role: 'user', content: '作品：' + (context.workName || '未命名') + '\n章节：' + (context.chapter || '未命名') + '\n\n用户描述的问题：' + problemDesc + '\n\n当前内容：\n' + currentText.substring(0, 2000) }
      ];
    },

    // 剧情走向建议
    suggestPlotDirection: function (context, currentText) {
      var memoryContext = buildContextBlock(context);
      var systemContent = '你是一位专业的小说策划师。请分析当前情节，给出3个可能的剧情走向。\n\n' +
        '【输出格式】\n' +
        '为每个走向提供：\n' +
        '1. 标题（10字以内）\n' +
        '2. 简要描述（30-50字）\n' +
        '3. 推荐指数（★到★★★★★）\n\n' +
        '只输出剧情建议，不要写正文';

      if (memoryContext) {
        systemContent += '\n\n' + memoryContext;
      }

      var recentText = currentText.length > 2000 ? currentText.substring(currentText.length - 2000) : currentText;
      return [
        { role: 'system', content: systemContent },
        { role: 'user', content: '作品：' + (context.workName || '未命名') + '\n\n当前情节：\n' + recentText + '\n\n请给出3个剧情走向建议：' }
      ];
    },

    // ========== 智能排版系列 ==========

    // 对话格式优化
    formatDialogue: function (context, text) {
      var memoryContext = buildContextBlock(context);
      var systemContent = '你是一位专业的小说排版编辑。请优化对话的格式和标签，确保优化后的对话符合当前作品的风格和角色设定。\n\n' +
        '【优化规则】\n' +
        '1. 对话单独成段，用中文引号「""」包裹\n' +
        '2. 将简单的"他说""她说"改为动作描写或神态描写\n' +
        '3. 叙述性对话标签改为融入式描写\n' +
        '4. 保持原文意思不变，只优化格式和表达\n' +
        '5. 对话风格必须符合角色设定簿中的说话风格\n' +
        '6. 只输出优化后的正文';

      if (memoryContext) {
        systemContent += '\n\n' + memoryContext;
      }

      return [
        { role: 'system', content: systemContent },
        { role: 'user', content: '作品名：' + (context.workName || '未命名') + '\n章节：' + (context.chapter || '未命名') + '\n\n请优化以下对话格式：\n\n' + text }
      ];
    },

    // 时间线检查
    checkTimeline: function (context, text) {
      var memoryContext = buildContextBlock(context);
      var systemContent = '你是一位专业的小说编辑，负责检查时间线的一致性。\n\n' +
        '【检查内容】\n' +
        '1. 时间顺序是否合理（如早上吃午饭）\n' +
        '2. 时间跨度是否矛盾\n' +
        '3. 季节/天气是否一致\n' +
        '4. 人物年龄/事件时间是否合理\n' +
        '5. 与全局摘要中的时间线是否一致\n\n' +
        '请列出发现的问题，如果没有问题请说明"时间线无明显问题"';

      if (memoryContext) {
        systemContent += '\n\n' + memoryContext;
      }

      return [
        { role: 'system', content: systemContent },
        { role: 'user', content: '作品名：' + (context.workName || '未命名') + '\n章节：' + (context.chapter || '未命名') + '\n\n请检查以下内容的时间线：\n\n' + text }
      ];
    },

    // 平台格式导出
    exportForPlatform: function (context, text, platform) {
      var platformRules = {
        '起点': '每段首行空两格，对话用中文引号，章节标题用"第一章"格式',
        '晋江': '每段首行空两格，对话用中文引号，注重情感描写',
        '番茄': '短段落为主，对话密集，节奏明快',
        '知乎': '问答式开头可保留，正文正常分段',
        '通用': '标准小说格式，首行缩进，对话单独成段'
      };
      var rule = platformRules[platform] || platformRules['通用'];
      var systemContent = '你是一位专业的小说排版编辑。请将内容转换为' + platform + '平台格式，同时保持作品的风格和角色设定不变。\n\n' +
        '【' + platform + '格式要求】\n' +
        rule + '\n\n' +
        '【注意】\n' +
        '1. 只优化格式，不改变剧情和人物性格\n' +
        '2. 对话风格必须符合角色设定簿\n' +
        '3. 保持原文意思不变\n' +
        '4. 只输出格式化后的正文';

      return [
        { role: 'system', content: systemContent },
        { role: 'user', content: '作品名：' + (context.workName || '未命名') + '\n题材：' + (context.genre || '不限') + '\n\n请转换为' + platform + '格式：\n\n' + text }
      ];
    },

    // ========== 意图识别 ==========

    // 分析用户意图
    analyzeIntent: function (userMessage) {
      return [
        { role: 'system', content: '你是一个意图识别系统。分析用户消息，返回最匹配的意图。\n\n' +
          '【可选意图】\n' +
          '- auto_write: 自动写作/续写\n' +
          '- polish: 润色/优化文字\n' +
          '- dialogue: 生成对话\n' +
          '- expand: 扩写内容\n' +
          '- condense: 精简内容\n' +
          '- diagnose: 问题诊断/卡文求助\n' +
          '- plot_suggest: 剧情建议\n' +
          '- format: 排版/格式化\n' +
          '- character: 人物相关问题\n' +
          '- worldbuilding: 世界观问题\n' +
          '- chat: 普通对话/其他\n\n' +
          '【输出格式】仅输出JSON：{"intent":"意图","confidence":0.9,"params":{"目标字数":500}}' },
        { role: 'user', content: '分析意图：' + userMessage }
      ];
    },

    // 自动提取角色信息（从已有文本中识别角色设定）
    extractCharacters: function (context, currentText) {
      var memory = loadMemory();
      var existingChars = memory.characters.map(function(c) { return c.name; }).join('、');

      var systemContent = '你是一位专业的小说编辑，负责从文本中提取角色信息。\n\n' +
        '【提取规则】\n' +
        '1. 识别文本中出现的所有有名角色\n' +
        '2. 提取每个角色的：姓名、年龄（如有）、性格特征、说话风格、外貌描述、人际关系\n' +
        '3. 只提取文本中明确提及或可推断的信息，不要编造\n' +
        '4. 按JSON数组格式输出，每个角色一个对象\n' +
        '5. 与已有角色设定合并时，优先以文本中的新信息为准';

      if (existingChars) {
        systemContent += '\n\n【已有角色（补充新信息，不重复）】\n' + existingChars;
      }

      return [
        { role: 'system', content: systemContent },
        { role: 'user', content: '作品名：' + (context.workName || '未命名') + '\n章节：' + (context.chapter || '未命名') + '\n\n请从以下文本中提取角色信息：\n\n' + currentText.substring(0, 3000) + '\n\n请输出JSON数组，格式如：[{"name":"角色名","personality":"性格","speechStyle":"说话风格","relationships":"关系"}]' }
      ];
    },

    // 生成章节大纲
    generateChapterOutline: function (context, chapterTheme) {
      var memoryContext = buildContextBlock(context);
      var systemContent = '你是一位专业的小说策划编辑，擅长设计章节大纲。\n\n' +
        '【设计要求】\n' +
        '1. 大纲要有清晰的起承转合结构\n' +
        '2. 每个情节点都要有具体的场景和冲突\n' +
        '3. 要考虑人物性格和动机的一致性\n' +
        '4. 适当设置悬念和伏笔\n' +
        '5. 输出3-5个主要情节点';

      return [
        { role: 'system', content: systemContent + memoryContext },
        { role: 'user', content: '请为以下主题设计章节大纲：\n\n主题：' + (chapterTheme || '下一章') +
          '\n\n请按以下格式输出：\n1. 【场景】情节描述 - 冲突/悬念\n2. ...' }
      ];
    },

    // 剧情建议
    plotSuggestions: function (context, currentText) {
      var memoryContext = buildContextBlock(context);
      var systemContent = '你是一位经验丰富的小说创作顾问。\n\n' +
        '【建议要求】\n' +
        '1. 提供3个不同方向的剧情发展建议\n' +
        '2. 每个建议都要有具体的转折点和冲突\n' +
        '3. 考虑人物性格和已有伏笔\n' +
        '4. 建议要有可行性和戏剧性\n' +
        '5. 分别说明每个方向的优缺点';

      return [
        { role: 'system', content: systemContent + memoryContext },
        { role: 'user', content: '【当前剧情】\n' + (currentText ? currentText.substring(0, 2000) : '（暂无内容）') +
          '\n\n请给出3个不同的剧情发展建议，每个建议包括：方向名称、具体情节、优缺点分析。' }
      ];
    },

    // 生成章节标题
    generateChapterTitles: function (context, chapterContent) {
      var memoryContext = buildContextBlock(context);
      var systemContent = '你是一位专业的小说编辑，擅长构思吸引人的章节标题。\n\n' +
        '【标题要求】\n' +
        '1. 提供5个不同风格的标题选项\n' +
        '2. 标题要符合章节内容，有吸引力\n' +
        '3. 风格可以包括：悬念式、意境式、对话式、比喻式、直白式\n' +
        '4. 每个标题不超过15个字';

      return [
        { role: 'system', content: systemContent + memoryContext },
        { role: 'user', content: '【章节内容】\n' + (chapterContent ? chapterContent.substring(0, 2000) : '（暂无内容）') +
          '\n\n请为这一章生成5个标题选项，编号列出。' }
      ];
    },

    // 人物关系分析
    analyzeRelationships: function (context, currentText) {
      var memoryContext = buildContextBlock(context);
      var systemContent = '你是一位专业的文学评论家，擅长分析人物关系。\n\n' +
        '【分析要求】\n' +
        '1. 梳理主要人物之间的关系网络\n' +
        '2. 分析关系的性质和变化趋势\n' +
        '3. 指出潜在的冲突和张力点\n' +
        '4. 给出关系发展的建议';

      return [
        { role: 'system', content: systemContent + memoryContext },
        { role: 'user', content: '【文本内容】\n' + (currentText ? currentText.substring(0, 3000) : '（暂无内容）') +
          '\n\n请分析文中人物关系，包括：关系图谱、关键冲突、发展建议。' }
      ];
    },

    // 提取伏笔
    extractForeshadowing: function (context, currentText) {
      var memoryContext = buildContextBlock(context);
      var systemContent = '你是一位专业的小说编辑，负责从文本中识别和提取伏笔。\n\n' +
        '【提取规则】\n' +
        '1. 找出文本中所有可能是伏笔的内容\n' +
        '2. 伏笔包括：悬念、未解之谜、人物秘密、预言、暗示、神秘事件等\n' +
        '3. 只提取文本中明确出现的内容，不要编造\n' +
        '4. 按JSON数组格式输出，每个伏笔一个对象\n' +
        '5. 每个对象包含：description（伏笔描述）、hint（提示/可能的回收方式）\n' +
        '6. 与已有伏笔合并，避免重复';

      if (memoryContext) {
        systemContent += '\n\n' + memoryContext;
      }

      return [
        { role: 'system', content: systemContent },
        { role: 'user', content: '作品名：' + (context.workName || '未命名') + '\n章节：' + (context.chapter || '未命名') + '\n\n请从以下文本中提取伏笔：\n\n' + currentText.substring(0, 3000) + '\n\n请输出JSON数组，格式如：[{"description":"伏笔描述","hint":"回收提示"}]' }
      ];
    }
  };

  // ========== 暴露 API ==========
  window.AIService = {
    chat: chat,
    getModelsConfig: getModelsConfig,
    getModelConfig: getModelConfig,
    setModelConfig: setModelConfig,
    deleteModelConfig: deleteModelConfig,
    isModelConfigured: isModelConfigured,
    getCurrentModel: getCurrentModel,
    setCurrentModel: setCurrentModel,
    saveApiKeyEncrypted: saveApiKeyEncrypted,
    getApiKeyEncrypted: getApiKeyEncrypted,
    PROMPTS: PROMPTS,
    BUILTIN_MODELS: BUILTIN_MODELS,
    getMemory: getMemory,
    updateMemory: updateMemory,
    buildContextBlock: buildContextBlock
  };

})(window);
