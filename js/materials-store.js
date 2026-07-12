/**
 * 素材数据持久化层
 * 使用 localStorage 存储用户素材数据
 */
(function (window) {
  'use strict';

  var STORAGE_KEY = 'ai_writing_materials';
  var INIT_FLAG_KEY = 'ai_writing_materials_initialized';

  // 示例素材数据
  var sampleMaterials = [
    {
      title: '英雄之旅情节模板',
      category: '情节模板',
      tags: ['经典', '冒险', '成长'],
      content: '第一阶段：启程\n1. 平凡世界 - 英雄过着平凡的生活\n2. 冒险召唤 - 打破平静的事件发生\n3. 拒绝召唤 - 英雄因恐惧而犹豫\n4. 遇见导师 - 获得指引和鼓励\n5. 跨越第一道门槛 - 英雄正式踏上冒险\n\n第二阶段：启蒙\n6. 考验、盟友与敌人 - 遭遇挑战，结识伙伴\n7. 接近洞穴深处 - 接近最终目标\n8. 严峻考验 - 面对最大的恐惧和危机\n9. 获得奖赏 - 克服困难，获得宝物/领悟\n\n第三阶段：归来\n10. 归程 - 带着奖赏踏上归途\n11. 复活 - 最终考验，浴火重生\n12. 带着灵药归来 - 回归平凡世界，带来改变',
      source: 'system'
    },
    {
      title: '冰山式人物设定法',
      category: '人物设定',
      tags: ['方法论', '深度', '经典'],
      content: '水面以上（外在表现）：\n• 外貌特征与穿着风格\n• 言行举止与口头禅\n• 职业身份与社会地位\n• 公开的价值观和主张\n\n水面以下（内在世界）：\n• 真实性格与隐藏情绪\n• 过去的创伤或秘密\n• 内心的恐惧与渴望\n• 不为人知的习惯癖好\n• 核心矛盾与自我冲突\n\n创作要点：人物的真实自我往往与表面形象相反或互补，内外反差越大，角色越有张力。',
      source: 'system'
    },
    {
      title: '赛博朋克世界构建要素',
      category: '世界观',
      tags: ['科幻', '赛博朋克', '反乌托邦'],
      content: '科技层面：\n• 人体改造与义体普及\n• 脑机接口与神经链接\n• 虚拟现实与数字空间\n• 人工智能与自动化\n\n社会结构：\n• 巨型企业掌控一切\n• 贫富差距极端化\n• 信息垄断与审查\n• 黑客与地下反抗组织\n\n美学特征：\n• 霓虹灯光与雨夜\n• 高科技与低生活\n• 东西方文化融合\n• 废弃与繁荣并置\n\n核心冲突：人性在技术侵蚀下的存续',
      source: 'system'
    },
    {
      title: '初遇场景描写模板',
      category: '场景描写',
      tags: ['场景', '初遇', '氛围'],
      content: '【环境铺垫】\n时间 + 地点 + 天气/光线 + 整体氛围\n例：深秋傍晚，老城区的咖啡馆外，昏黄的路灯映着绵绵细雨，空气中飘着烤栗子的香气。\n\n【人物登场】\n从旁观者视角切入：先写整体印象（身形/姿态/穿着），再聚焦到某个有辨识度的细节。\n例：她推门进来时带进来一阵冷风，藏青色风衣下摆沾着细碎的雨珠，发梢微微垂着水滴。\n\n【视线交汇】\n环境虚化 + 感官聚焦 + 时间停滞感\n例：她抬眼的瞬间，店里的喧嚣似乎都退远了，只剩下那双眼睛，像浸在冷泉里的黑曜石。\n\n【收尾余韵】\n留下一个悬念或暗示两人未来关系的细节\n例：她在靠窗的位置坐下，翻开那本封皮磨损的旧书，而我发现，那正是我找了很久的绝版书。',
      source: 'system'
    },
    {
      title: '毒舌角色对话风格',
      category: '对话风格',
      tags: ['毒舌', '幽默', '性格'],
      content: '核心特征：\n• 语速快，用词精准刻薄\n• 擅长抓住对方漏洞反击\n• 表面冷漠，暗藏关心\n• 常用反讽和比喻\n\n创作要点：\n1. 毒舌不等于没礼貌——高级毒舌是用优雅的语气说扎心的话\n2. 给角色一个毒舌的理由——可能是过去的经历、自我保护机制\n3. 反差萌——毒舌角色在面对在乎的人时，嘴硬心软的反差最有魅力\n4. 把握分寸——不要让角色真的伤害到别人的底线\n\n常用句式：\n• "你这脑子是用来凑身高的吗？"\n• "我不是在骂你，我是在描述你。"\n• "你说得对，但我不听。"',
      source: 'system'
    },
    {
      title: '三幕式结构',
      category: '情节模板',
      tags: ['经典', '结构', '通用'],
      content: '第一幕（约占25%）：建置\n• 开场——展示主角的日常生活\n• 激励事件——打破平衡的重大事件\n• 第一个转折点——主角被迫行动，进入第二幕\n\n第二幕（约占50%）：对抗\n• 上升动作——一系列难度递增的挑战\n• 中点——故事重心发生转变\n• 一无所有/灵魂黑夜——最低谷时刻\n• 第二个转折点——看到希望，找到反击方法\n\n第三幕（约占25%）：结局\n• 高潮——最终对决/抉择\n• 结局——新的平衡建立\n• 余韵——故事结束后的余味',
      source: 'system'
    },
    {
      title: '配角塑造三要素',
      category: '人物设定',
      tags: ['配角', '方法', '技巧'],
      content: '1. 功能性\n配角必须对主线有作用——推动剧情、反衬主角、提供信息、制造冲突。没有功能的配角就是多余的。\n\n2. 独特性\n给配角一个令人印象深刻的记忆点：\n• 特别的外貌特征\n• 标志性的口头禅或行为习惯\n• 与众不同的价值观\n• 反差感的身份与性格\n\n3. 立体性\n即使是配角，也要让读者感觉到他/她有自己的人生：\n• 有自己的目标和动机（不只是围着主角转）\n• 有自己的过去和秘密\n• 有自己的优缺点\n• 在故事结束后，他/她的人生还在继续',
      source: 'system'
    }
  ];

  // 生成唯一 ID
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  // 加载所有素材
  function loadMaterials() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        var materials = JSON.parse(saved);
        return Array.isArray(materials) ? materials : [];
      } else {
        // 首次加载，初始化示例素材
        var initialized = localStorage.getItem(INIT_FLAG_KEY);
        if (!initialized) {
          var initialMaterials = initSampleMaterials();
          localStorage.setItem(INIT_FLAG_KEY, 'true');
          return initialMaterials;
        }
      }
    } catch (e) {
      console.warn('加载素材数据失败:', e);
    }
    return [];
  }

  // 初始化示例素材
  function initSampleMaterials() {
    var materials = [];
    var now = new Date();
    for (var i = 0; i < sampleMaterials.length; i++) {
      var sample = sampleMaterials[i];
      materials.push({
        id: generateId() + '_sample_' + i,
        title: sample.title,
        category: sample.category,
        tags: sample.tags || [],
        content: sample.content,
        source: sample.source || 'system',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      });
    }
    saveMaterials(materials);
    return materials;
  }

  // 保存所有素材
  function saveMaterials(materials) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(materials));
    } catch (e) {
      console.warn('保存素材数据失败:', e);
    }
  }

  // 获取所有素材
  function getAllMaterials() {
    return loadMaterials();
  }

  // 按分类获取素材
  function getMaterialsByCategory(category) {
    var materials = loadMaterials();
    if (category === '全部') return materials;
    return materials.filter(function(m) {
      return m.category === category;
    });
  }

  // 搜索素材
  function searchMaterials(query) {
    var materials = loadMaterials();
    if (!query) return materials;
    query = query.toLowerCase();
    return materials.filter(function(m) {
      return (m.title && m.title.toLowerCase().indexOf(query) !== -1) ||
             (m.content && m.content.toLowerCase().indexOf(query) !== -1) ||
             (m.tags && m.tags.some(function(t) { return t.toLowerCase().indexOf(query) !== -1; }));
    });
  }

  // 获取单个素材
  function getMaterialById(id) {
    var materials = loadMaterials();
    for (var i = 0; i < materials.length; i++) {
      if (materials[i].id === id) return materials[i];
    }
    return null;
  }

  // 创建新素材
  function createMaterial(data) {
    var materials = loadMaterials();
    var now = new Date();
    var material = {
      id: generateId(),
      title: data.title || '未命名素材',
      category: data.category || '其他',
      tags: data.tags || [],
      content: data.content || '',
      source: data.source || 'manual', // manual | ai-generated
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    materials.unshift(material);
    saveMaterials(materials);
    return material;
  }

  // 更新素材
  function updateMaterial(id, data) {
    var materials = loadMaterials();
    for (var i = 0; i < materials.length; i++) {
      if (materials[i].id === id) {
        for (var key in data) {
          if (data.hasOwnProperty(key)) {
            materials[i][key] = data[key];
          }
        }
        materials[i].updatedAt = new Date().toISOString();
        saveMaterials(materials);
        return materials[i];
      }
    }
    return null;
  }

  // 删除素材
  function deleteMaterial(id) {
    var materials = loadMaterials();
    var newMaterials = materials.filter(function(m) { return m.id !== id; });
    saveMaterials(newMaterials);
    return newMaterials;
  }

  // 批量导入素材
  function importMaterials(items) {
    var materials = loadMaterials();
    items.forEach(function(item) {
      var now = new Date();
      materials.push({
        id: generateId(),
        title: item.title || '未命名素材',
        category: item.category || '其他',
        tags: item.tags || [],
        content: item.content || '',
        source: item.source || 'import',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      });
    });
    saveMaterials(materials);
    return materials;
  }

  // 导出 API
  window.MaterialsStore = {
    getAllMaterials: getAllMaterials,
    getMaterialsByCategory: getMaterialsByCategory,
    searchMaterials: searchMaterials,
    getMaterialById: getMaterialById,
    createMaterial: createMaterial,
    updateMaterial: updateMaterial,
    deleteMaterial: deleteMaterial,
    importMaterials: importMaterials
  };

})(window);