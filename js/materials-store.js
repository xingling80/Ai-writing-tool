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
    },
    {
      title: '悬念设置五步法',
      category: '写作技巧',
      tags: ['悬念', '技巧', '情节'],
      content: '第一步：抛出问题\n在读者心中埋下疑问——这个人是谁？这件事为什么会发生？接下来会怎样？\n\n第二步：延迟答案\n不要马上揭晓谜底，用其他情节转移注意力，让读者继续猜测。\n\n第三步：释放线索\n在故事中穿插一些细节和线索，让读者以为自己接近了真相。\n\n第四步：误导方向\n设置一些干扰项，让读者走向错误的方向，增加反转的冲击力。\n\n第五步：揭晓真相\n在最合适的时机揭示答案，给读者恍然大悟的感觉。\n\n注意事项：\n• 悬念不能拖太久，否则读者会失去耐心\n• 答案必须合理，不能是机械降神\n• 好的悬念应该同时推动人物成长',
      source: 'system'
    },
    {
      title: '古风世界观构建清单',
      category: '世界观',
      tags: ['古风', '玄幻', '设定'],
      content: '【地理环境】\n• 大陆/国家划分与名称\n• 重要城市和地标\n• 气候与特产\n• 交通方式\n\n【政治制度】\n• 统治阶层结构\n• 官职体系\n• 律法与刑罚\n• 军事力量\n\n【经济体系】\n• 货币制度\n• 主要产业\n• 商业贸易\n• 阶级与贫富\n\n【文化习俗】\n• 服饰风格\n• 饮食文化\n• 节日庆典\n• 婚丧嫁娶\n• 礼仪规矩\n\n【修炼体系（如适用）】\n• 境界划分\n• 修炼方法\n• 门派势力\n• 天材地宝\n\n【宗教信仰】\n• 神灵体系\n• 祭祀仪式\n• 神话传说',
      source: 'system'
    },
    {
      title: '情感递进描写法',
      category: '写作技巧',
      tags: ['情感', '描写', '方法'],
      content: '第一层：表面反应\n人物的外在表现——脸红、心跳加速、眼神闪躲、说话结巴等。\n\n第二层：心理活动\n内心的想法和感受——惊讶、疑惑、欣喜、紧张等。\n\n第三层：生理反应\n更深层的身体感受——心跳声在耳边回响、指尖发麻、呼吸不畅等。\n\n第四层：行为改变\n因为这份情感而产生的行为变化——开始关注对方、不自觉地靠近、为对方改变等。\n\n第五层：认知改变\n对自己、对对方、对世界的看法发生变化——原来我也可以这样、这个人对我来说很重要等。\n\n写作要点：\n• 不要一步到位，情感是逐渐加深的\n• 用具体的细节代替抽象的"他爱上了她"\n• 情感变化要有合理的触发点',
      source: 'system'
    },
    {
      title: '战斗场景写作技巧',
      category: '场景描写',
      tags: ['战斗', '动作', '技巧'],
      content: '【节奏把控】\n• 开场要快，直接切入战斗\n• 中间要有起伏，不能一直是一个节奏\n• 高潮部分放慢节奏，用细节放大关键瞬间\n• 收尾要利落，不拖泥带水\n\n【描写角度】\n• 视觉：招式、光影、血迹、环境破坏\n• 听觉：风声、兵器碰撞声、呐喊声、喘息声\n• 触觉：疼痛、汗水、温度变化\n• 心理：紧张、愤怒、冷静、恐惧\n\n【战斗策略】\n• 不要让战斗变成简单的你来我往\n• 加入地形利用、心理博弈、战术变化\n• 让角色的性格和能力在战斗中体现出来\n\n【注意事项】\n• 避免过于冗长的招式描写\n• 保持战斗逻辑的合理性\n• 战斗要服务于人物塑造和情节推进',
      source: 'system'
    },
    {
      title: '反派塑造十大原则',
      category: '人物设定',
      tags: ['反派', '方法论', '经典'],
      content: '1. 给反派一个合理的动机\n坏得有道理的反派才更有魅力。\n\n2. 让反派有自己的目标\n反派不是为了阻碍主角而存在，他有自己的追求。\n\n3. 赋予反派独特的个人魅力\n气质、谈吐、审美、能力——让他有吸引力。\n\n4. 制造反派与主角的镜像关系\n他们可能是同一类人，只是选择了不同的道路。\n\n5. 让反派真正造成伤害\n如果反派从来没有成功过，就没有威胁感。\n\n6. 展现反派的高光时刻\n给反派一些帅气的出场和精彩的表现。\n\n7. 揭示反派的过去\n让读者理解他是如何变成这样的。\n\n8. 让反派有自己的原则\n即使是坏人，也有不能触碰的底线。\n\n9. 设计精彩的对决\n最终决战要有仪式感和宿命感。\n\n10. 给反派一个有分量的结局\n死亡不是唯一选择，但一定要有冲击力。',
      source: 'system'
    },
    {
      title: '环境描写六要素',
      category: '场景描写',
      tags: ['环境', '描写', '基础'],
      content: '1. 视觉\n颜色、形状、光影、远近——这是最基本也是最重要的。\n\n2. 听觉\n风声、雨声、人声、寂静——声音能极大地增强代入感。\n\n3. 嗅觉\n花香、血腥味、潮湿的泥土味——气味最能唤起记忆和情绪。\n\n4. 触觉\n温度、湿度、质感——让读者"感受"到环境。\n\n5. 味觉\n（较少用，但关键时候很有效）空气中的味道、嘴里的苦涩。\n\n6. 氛围\n以上要素综合起来形成的整体感觉——压抑、温馨、诡异、宁静。\n\n写作要点：\n• 不要为了写景而写景，环境描写要服务于情节和人物\n• 选择与当前情节/人物心情相匹配的细节\n• 用动态的描写代替静态的罗列',
      source: 'system'
    },
    {
      title: '对话写作黄金法则',
      category: '对话风格',
      tags: ['对话', '技巧', '基础'],
      content: '法则一：每段对话都要有目的\n推进情节、揭示性格、制造冲突、提供信息——不能是无意义的闲聊。\n\n法则二：对话要符合人物身份\n不同的人有不同的说话方式——用词、语气、语速、口头禅。\n\n法则三：用动作和表情打断对话\n不要让对话变成干巴巴的你一言我一语，加入肢体语言。\n\n法则四：留白与潜台词\n有些话不需要说出来，让读者自己体会。\n\n法则五：避免信息倾倒\n不要让角色像念说明书一样交代背景，把信息融入自然的对话中。\n\n法则六：对话要有冲突和张力\n观点不同、目标不同、隐瞒秘密——冲突让对话更有看头。\n\n法则七：读出来\n写完对话后自己读一遍，听起来自然吗？',
      source: 'system'
    },
    {
      title: '穿越文常见套路与创新',
      category: '情节模板',
      tags: ['穿越', '套路', '创新'],
      content: '常见套路：\n• 车祸/跳楼/触电穿越\n• 穿越成废柴/弃妃/私生子\n• 金手指：系统、空间、医术、毒术\n• 打脸虐渣，一路升级\n• 男主/女主强大专一\n\n创新方向：\n1. 反向穿越——古人穿到现代\n2. 多次穿越——穿来穿去\n3. 假穿越——以为穿越了其实是在演戏/做梦\n4. 群穿——一群人一起穿\n5. 穿成炮灰——改变炮灰命运\n6. 穿书——穿进自己看过的书里\n7. 轮回——不断重生回到某个时间点\n8. 灵魂互换——和古代人互换身体\n\n注意：\n不管什么套路，关键是人物塑造和情节逻辑。套路只是外壳，内核才是关键。',
      source: 'system'
    },
    {
      title: '虐文写作要点',
      category: '写作技巧',
      tags: ['虐文', '情感', '技巧'],
      content: '【虐的类型】\n• 误会虐——因为误会而互相伤害\n• 身份虐——身份差异导致的悲剧\n• 命运虐——不可抗力造成的分离\n• 选择虐——两难的选择，选哪个都会痛\n• 误会+真相大白——最经典的虐心组合\n\n【怎么虐才好看】\n1. 先甜后虐\n前面有多甜，后面就有多虐。让读者先爱上他们的幸福，再亲手打碎。\n\n2. 虐身也要虐心\n身体的痛苦是表层的，心灵的折磨才最伤人。\n\n3. 有因有果\n虐要有合理的理由，不能为了虐而虐。\n\n4. 留一线希望\n在最深的绝望里留一点微光，让读者又爱又恨。\n\n5. 结局的选择\nBE不一定比虐文低等，好的BE让人久久难忘。\n\n【虐的底线】\n• 不要涉及违法犯罪行为\n• 不要传播不良价值观\n• 注意读者的心理健康',
      source: 'system'
    },
    {
      title: '甜宠文创作指南',
      category: '写作技巧',
      tags: ['甜宠', '言情', '技巧'],
      content: '【核心要素】\n• 男主/女主专一宠溺\n• 互动甜蜜有爱\n• 没有太多狗血误会\n• 整体基调轻松愉快\n\n【甜度来源】\n1. 细节宠溺\n记住对方的喜好、默默付出、温柔的小动作——细节最打动人。\n\n2. 反差萌\n平时高冷的人在喜欢的人面前变得笨拙/温柔/爱吃醋。\n\n3. 互相奔赴\n不是单方面的付出，而是两个人都在为这段感情努力。\n\n4. 日常互动\n一起吃饭、一起逛街、一起看电影——平凡的日常也可以很甜蜜。\n\n5. 吃醋情节\n适度的吃醋和占有欲可以增加甜度。\n\n【注意事项】\n• 甜不等于没有冲突，小打小闹也是情趣\n• 不要让角色降智，恋爱中的人可以温柔但不能傻\n• 配角也可以很精彩，不要都变成工具人\n• 节奏要把握好，一直甜也会腻',
      source: 'system'
    },
    {
      title: '小说开头十法',
      category: '写作技巧',
      tags: ['开头', '技巧', '入门'],
      content: '1. 悬念式开头\n一上来就抛出一个悬念，让读者想知道答案。\n\n2. 场景式开头\n从一个具体的场景切入，用环境描写营造氛围。\n\n3. 对话式开头\n用一段对话开场，直接进入故事。\n\n4. 动作式开头\n从一个动作场景开始，比如追逐、战斗。\n\n5. 内心独白式\n从主角的内心想法开始，让读者快速了解人物。\n\n6. 倒叙式开头\n从故事的结尾或某个关键节点开始，再往回讲。\n\n7. 对比式开头\n用强烈的对比抓住读者的眼球。\n\n8. 寓言式开头\n用一个小故事或哲理引言开场。\n\n9. 直击式开头\n直接点明故事的核心冲突或主题。\n\n10. 日常式开头\n从平凡的日常开始，让读者慢慢进入故事。',
      source: 'system'
    },
    {
      title: '取名灵感库',
      category: '写作技巧',
      tags: ['取名', '素材', '参考'],
      content: '【古风男名】\n字：墨、尘、景、夜、渊、辰、瑾、轩、翊、珩、煜、宸\n组合：墨尘、景渊、夜珩、瑾辰、宸翊、煜轩\n\n【古风女名】\n字：清、婉、若、兮、瑶、瑾、萱、玥、嫣、宁、柔、芸\n组合：清瑶、若兮、婉宁、瑾萱、玥嫣、芸柔\n\n【现代男名】\n简洁有力：顾辰、陆衍、江叙、沈亦、周砚、许则\n温柔挂：温予、林清舟、苏慕白、叶知秋\n\n【现代女名】\n清冷挂：苏晚、林知夏、沈清欢、姜予安\n甜系：阮软、唐糖、温念念、白朵朵\n\n【取名技巧】\n1. 从诗词中找——"既见君子，云胡不喜"\n2. 从成语中化用\n3. 用季节、天气、植物、自然现象\n4. 注意读音的平仄搭配\n5. 避免生僻字和歧义',
      source: 'system'
    },
    {
      title: '常见写作误区避坑',
      category: '写作技巧',
      tags: ['避坑', '入门', '经验'],
      content: '误区一：开头就大段背景介绍\n读者还没认识人物，不关心你的世界观。先讲故事，设定慢慢放。\n\n误区二：人物名字过于复杂\n生僻字、拗口的名字会增加读者的记忆负担。\n\n误区三：对话像念说明书\n人物对话要自然，不要把所有信息都塞进对话里。\n\n误区四：为了情节牺牲人物逻辑\n人物的行为要符合性格，不能为了推动剧情强行OOC。\n\n误区五：形容词堆砌\n"美丽的、可爱的、善良的、聪明的"——不如一个具体的例子。\n\n误区六：视角混乱\n不要随意切换视角，尤其是在同一段落里。\n\n误区七：节奏把控不当\n一直平铺直叙或一直高潮迭起都不行，要张弛有度。\n\n误区八：过于追求文笔\n故事才是核心，文笔是为故事服务的，不要本末倒置。\n\n误区九：烂尾\n哪怕仓促收尾，也比断更强。完整比完美更重要。',
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