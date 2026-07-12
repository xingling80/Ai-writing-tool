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

    // 第一层：世界观设定
    if (memory.worldSettings) {
      parts.push('【世界观设定】\n' + memory.worldSettings);
    }

    // 第二层：全局摘要（长篇记忆，防止AI"忘事"）
    if (memory.globalSummary) {
      parts.push('【故事全局摘要】\n' + memory.globalSummary);
    }

    // 第三层：角色设定簿（防止角色"精分"）
    if (memory.characters && memory.characters.length > 0) {
      var charBlock = '【角色设定簿】\n';
      memory.characters.forEach(function(c) {
        if (c.resolved) return; // 跳过已退出角色
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

    // 第四层：伏笔追踪（防止伏笔丢失）
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

    // 第五层：文风备注
    if (memory.styleNotes) {
      parts.push('【文风要求】\n' + memory.styleNotes);
    }

    if (parts.length === 0) return '';
    return parts.join('\n\n');
  }

  // ========== 内置模型预设配置 ==========
  var BUILTIN_MODELS = {};

  // ========== 存储管理 ==========
  var STORAGE_KEY = 'ai_writing_models_config';

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

  function getModelsConfig() {
    var saved = loadConfig();
    var merged = {};
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
  }

  // ========== 当前模型管理 ==========
  var CURRENT_MODEL_KEY = 'ai_writing_current_model';

  function getCurrentModel() {
    var saved = localStorage.getItem(CURRENT_MODEL_KEY);
    if (saved) {
      var config = getModelsConfig();
      if (config[saved]) {
        return saved;
      }
    }
    var config = getModelsConfig();
    var keys = Object.keys(config);
    return keys.length > 0 ? keys[0] : '';
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
      if (options.onError) options.onError(new Error('未找到模型配置: ' + modelName + '，请点击左下角模型名称配置 API。'));
      return;
    }

    if (!config.apiKey) {
      if (options.onError) options.onError(new Error('请先配置 ' + modelName + ' 的 API Key。点击左下角模型名称，选择"添加自定义 API"来设置。'));
      return;
    }

    var onChunk = options.onChunk || function () {};
    var onDone = options.onDone || function () {};
    var onError = options.onError || function (err) {
      console.error('AI 调用失败:', err);
    };

    if (config.provider === 'anthropic') {
      callAnthropic(config, messages, options, onChunk, onDone, onError);
    } else {
      callOpenAI(config, messages, options, onChunk, onDone, onError);
    }
  }

  // ========== 写作场景预设 Prompt ==========

  var PROMPTS = {
    // 续写下一段
    continueWriting: function (context, currentText) {
      var memoryContext = buildContextBlock(context);
      var contextInfo = '作品名：' + (context.workName || '未命名') + '\n当前章节：' + (context.chapter || '未命名');
      if (context.outline && context.outline.length > 0) {
        contextInfo += '\n章节大纲：\n' + context.outline.map(function(item, i) { return (i + 1) + '. ' + item; }).join('\n');
      }

      var systemContent = '你是一位专业的小说创作助手。请根据已有的章节内容，续写下一段。\n\n' +
        '【核心规则】\n' +
        '1. 严格保持文风和叙事节奏一致\n' +
        '2. 自然衔接现有内容，不要重复已有内容\n' +
        '3. 推动情节发展，引入新的张力或转折\n' +
        '4. 只输出续写的正文内容，不要加标题、注释或说明\n' +
        '5. 不要使用"似乎""仿佛""宛如"等过度修辞，用具体的动作和感官描写\n' +
        '6. 注意角色说话风格必须符合设定簿中的描述\n' +
        '7. 如果有未解决的伏笔，优先考虑推进相关情节\n' +
        '8. 输出约300-500字';

      if (memoryContext) {
        systemContent += '\n\n' + memoryContext;
      }

      // 截取最后3000字作为前文上下文，避免超出token限制
      var recentText = currentText.length > 3000 ? '...(前文省略)\n' + currentText.substring(currentText.length - 3000) : currentText;

      return [
        { role: 'system', content: systemContent },
        { role: 'user', content: contextInfo + '\n\n已有内容：\n' + recentText + '\n\n请续写下一段：' }
      ];
    },

    // 润色全文
    polish: function (context, currentText) {
      var memoryContext = buildContextBlock(context);
      var systemContent = '你是一位专业的文学编辑。请对以下文章进行润色。\n\n' +
        '【润色规则】\n' +
        '1. 提升文字的文学性和表现力\n' +
        '2. 优化句式结构和节奏，长短句交替\n' +
        '3. 修正语法和用词问题\n' +
        '4. 保持原文的故事情节和人物性格绝对不变\n' +
        '5. 只输出润色后的完整文章，不要加任何说明\n' +
        '6. 注意角色言行必须符合角色设定簿\n' +
        '7. 不要改变剧情走向，只优化表达';

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
        '【对话规则】\n' +
        '1. 对话必须严格符合角色设定簿中的性格和说话风格\n' +
        '2. 推动情节发展或揭示人物内心\n' +
        '3. 语言自然生动，有潜台词和张力\n' +
        '4. 每个角色的说话方式要有辨识度，不能千人一面\n' +
        '5. 加入适当的动作描写和神态描写\n' +
        '6. 只输出对话内容（含对话描写和动作描写），不要加说明';

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

      // 添加历史消息（保留上下文）
      if (history && history.length > 0) {
        history.forEach(function (msg) {
          messages.push({ role: msg.role, content: msg.content });
        });
      }

      messages.push({ role: 'user', content: userMessage });
      return messages;
    },

    // 生成素材
    generateMaterial: function (type, description) {
      return [
        { role: 'system', content: '你是一位专业的创作素材生成助手。请根据用户的要求生成创作素材。素材类型包括：情节模板、人物设定、世界观、场景描写、对话风格。\n\n要求：\n1. 内容详细、有创意\n2. 适合用于小说创作\n3. 只输出素材内容，不要加额外说明' },
        { role: 'user', content: '素材类型：' + (type || '不限') + '\n要求描述：' + (description || '请随机生成一个有趣的创作素材') + '\n\n请生成素材：' }
      ];
    },

    // AI 展开素材
    expandMaterial: function (materialTitle, materialContent) {
      return [
        { role: 'system', content: '你是一位专业的创作素材展开助手。请将以下素材内容展开为更详细的描述，包括：\n1. 更丰富的细节\n2. 具体的使用建议\n3. 可能的变体或发展方向\n\n只输出展开后的内容，不要加额外说明。' },
        { role: 'user', content: '素材标题：' + materialTitle + '\n素材内容：' + materialContent + '\n\n请展开这个素材：' }
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
    generateSummary: function (currentText) {
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
        { role: 'user', content: '请根据以下最新章节内容，更新全局摘要：\n\n' + currentText }
      ];
    },

    // 自动提取角色信息（从已有文本中识别角色设定）
    extractCharacters: function (currentText) {
      var memory = loadMemory();
      var existingChars = memory.characters.map(function(c) { return c.name; }).join('、');

      var systemContent = '你是一位专业的小说编辑，负责从文本中提取角色信息。\n\n' +
        '【提取规则】\n' +
        '1. 识别文本中出现的所有有名角色\n' +
        '2. 提取每个角色的：姓名、年龄（如有）、性格特征、说话风格、外貌描述、人际关系\n' +
        '3. 只提取文本中明确提及或可推断的信息，不要编造\n' +
        '4. 按JSON数组格式输出，每个角色一个对象';

      if (existingChars) {
        systemContent += '\n\n【已有角色（补充新信息，不重复）】\n' + existingChars;
      }

      return [
        { role: 'system', content: systemContent },
        { role: 'user', content: '请从以下文本中提取角色信息：\n\n' + currentText.substring(0, 3000) + '\n\n请输出JSON数组，格式如：[{"name":"角色名","personality":"性格","speechStyle":"说话风格","relationships":"关系"}]' }
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
    getCurrentModel: getCurrentModel,
    setCurrentModel: setCurrentModel,
    PROMPTS: PROMPTS,
    BUILTIN_MODELS: BUILTIN_MODELS,
    getMemory: getMemory,
    updateMemory: updateMemory,
    buildContextBlock: buildContextBlock
  };

})(window);
