(function() {
  'use strict';

  // ========== 辅助函数：通过文本内容查找元素 ==========
  function findButtonByText(text) {
    var buttons = document.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].textContent.trim().indexOf(text) !== -1) return buttons[i];
    }
    return null;
  }

  function findButtonsByText(text) {
    var result = [];
    var buttons = document.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].textContent.trim().indexOf(text) !== -1) result.push(buttons[i]);
    }
    return result;
  }

  function findElementByText(selector, text) {
    var els = document.querySelectorAll(selector);
    for (var i = 0; i < els.length; i++) {
      if (els[i].textContent.trim().indexOf(text) !== -1) return els[i];
    }
    return null;
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ========== 文本后处理工具：智能分段、过滤标题、小说格式优化 ==========

  // 过滤Markdown标题和章节标题
  function filterHeadings(text) {
    if (!text) return '';
    var lines = text.split('\n');
    var filtered = [];
    var headingPatterns = [
      /^#{1,6}\s+.+$/,
      /^第[一二三四五六七八九十百千零\d]+章\s*.*$/,
      /^第[一二三四五六七八九十百千零\d]+节\s*.*$/,
      /^第[一二三四五六七八九十百千零\d]+卷\s*.*$/,
      /^[一二三四五六七八九十]+、\s*.+$/,
      /^\d+\.\s*.+$/,
      /^【.*】$/,
      /^\[.*\]$/
    ];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) {
        filtered.push(lines[i]);
        continue;
      }
      var isHeading = false;
      for (var j = 0; j < headingPatterns.length; j++) {
        if (headingPatterns[j].test(line)) {
          isHeading = true;
          break;
        }
      }
      if (!isHeading) {
        filtered.push(lines[i]);
      }
    }
    return filtered.join('\n');
  }

  // 清理Markdown格式标记
  function cleanMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/~~(.+?)~~/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1');
  }

  // 智能分段：根据语义和标点自动分段
  function smartSplitParagraphs(text) {
    if (!text) return [];

    // 先按已有换行分割
    var rawParagraphs = text.split(/\n\s*\n/).filter(function(p) { return p.trim(); });

    // 如果已经有多个段落，直接返回（清理后）
    if (rawParagraphs.length > 1) {
      return rawParagraphs.map(function(p) {
        return p.replace(/\n/g, '').trim();
      }).filter(function(p) { return p; });
    }

    // 单一大段，需要智能拆分
    var content = text.replace(/\n/g, ' ').trim();
    if (!content) return [];

    var paragraphs = [];
    var minLength = 80;
    var maxLength = 200;

    // 按句子分割
    var sentences = content.split(/([。！？!?])/);
    var buffer = '';

    for (var i = 0; i < sentences.length; i++) {
      var part = sentences[i];
      if (/[。！？!?]/.test(part)) {
        buffer += part;
        // 检查是否可以分段
        if (buffer.length >= minLength && paragraphs.length > 0) {
          // 如果当前累积超过最大长度，或者是对话结束，分段
          if (buffer.length >= maxLength || /^[“"]/.test(buffer.trim()) || /[”"]$/.test(buffer.trim())) {
            paragraphs.push(buffer.trim());
            buffer = '';
          }
        } else if (buffer.length >= maxLength && paragraphs.length === 0) {
          paragraphs.push(buffer.trim());
          buffer = '';
        }
      } else {
        buffer += part;
      }
    }

    if (buffer.trim()) {
      paragraphs.push(buffer.trim());
    }

    // 如果分段太少，强制按长度分
    if (paragraphs.length <= 1 && content.length > maxLength * 2) {
      paragraphs = [];
      var remaining = content;
      while (remaining.length > 0) {
        if (remaining.length <= maxLength) {
          paragraphs.push(remaining.trim());
          break;
        }
        var splitPos = maxLength;
        // 尝试在标点处断开
        for (var k = maxLength; k >= minLength; k--) {
          if (/[。！？!?]/.test(remaining[k])) {
            splitPos = k + 1;
            break;
          }
        }
        paragraphs.push(remaining.substring(0, splitPos).trim());
        remaining = remaining.substring(splitPos).trim();
      }
    }

    return paragraphs.filter(function(p) { return p && p.length > 0; });
  }

  // 对话格式优化：识别对话并单独成段
  function optimizeDialogueFormat(paragraphs) {
    if (!paragraphs || paragraphs.length === 0) return [];

    var result = [];
    for (var i = 0; i < paragraphs.length; i++) {
      var para = paragraphs[i];
      // 如果段落中既有对话又有叙述，且对话在中间，尝试拆分
      var dialoguePattern = /[“"][^”"]+[”"][，。！？,?!]?/g;
      var dialogues = para.match(dialoguePattern);

      if (dialogues && dialogues.length > 0 && para.length > 150) {
        // 有多个对话且段落较长，拆分开
        var parts = para.split(/([“"][^”"]+[”"][，。！？,?!]?)/);
        var currentNarrative = '';

        for (var j = 0; j < parts.length; j++) {
          var part = parts[j].trim();
          if (!part) continue;

          if (/^[“"]/.test(part)) {
            // 对话部分
            if (currentNarrative.trim()) {
              result.push(currentNarrative.trim());
              currentNarrative = '';
            }
            result.push(part);
          } else {
            // 叙述部分
            currentNarrative += part;
          }
        }
        if (currentNarrative.trim()) {
          result.push(currentNarrative.trim());
        }
      } else {
        result.push(para);
      }
    }

    return result.filter(function(p) { return p && p.trim().length > 0; });
  }

  // 完整的小说文本后处理流水线
  function processNovelText(text, options) {
    options = options || {};
    var result = text;

    // 1. 过滤标题
    if (options.filterHeadings !== false) {
      result = filterHeadings(result);
    }

    // 2. 清理Markdown标记
    if (options.cleanMarkdown !== false) {
      result = cleanMarkdown(result);
    }

    // 3. 智能分段
    var paragraphs = smartSplitParagraphs(result);

    // 4. 对话格式优化
    if (options.optimizeDialogue !== false) {
      paragraphs = optimizeDialogueFormat(paragraphs);
    }

    return paragraphs;
  }

  // 将段落数组转换为HTML
  function paragraphsToHtml(paragraphs, options) {
    options = options || {};
    if (!paragraphs || paragraphs.length === 0) return '';

    return paragraphs.map(function(p) {
      var style = '';
      if (options.textIndent !== false) {
        style = 'style="margin-bottom: 24px; text-indent: 2em;"';
      } else {
        style = 'style="margin-bottom: 24px;"';
      }
      return '<p ' + style + '>' + escapeHtml(p) + '</p>';
    }).join('');
  }

  function getEditorText() {
    var article = document.querySelector('article');
    if (!article) return '';
    return article.innerText.trim();
  }

  function getWorkContext() {
    // 从编辑器 tab 获取章节名
    var activeTab = document.querySelector('[role="tab"][aria-selected="true"], [role="tab"][style*="background"]');
    var chapter = activeTab ? activeTab.textContent.trim() : '未命名章节';

    // 从导航或标题获取作品名
    var workNameEl = document.querySelector('h1');
    var workName = workNameEl ? workNameEl.textContent.trim() : '未命名作品';

    // 尝试从大纲树获取更多信息
    var outlineItems = document.querySelectorAll('.ds-navlist-item');
    var outline = [];
    outlineItems.forEach(function(item) {
      var text = item.textContent.trim();
      if (text) outline.push(text);
    });

    return {
      workName: workName,
      chapter: chapter,
      outline: outline
    };
  }

  // 获取作品管理页面的筛选按钮
  function getWorkFilterButtons() {
    var result = [];
    var filterTexts = ['全部', '连载中', '已完结', '暂停'];
    var allBtns = document.querySelectorAll('button');
    allBtns.forEach(function(btn) {
      var text = btn.textContent.trim();
      if (filterTexts.indexOf(text) !== -1) result.push(btn);
    });
    return result;
  }

  // 获取作品网格容器（排除统计区）
  function getWorksGrid() {
    var grids = document.querySelectorAll('.grid');
    for (var i = 0; i < grids.length; i++) {
      if (grids[i].classList.contains('grid-cols-1')) return grids[i];
    }
    return null;
  }

  // 获取素材网格容器
  function getMaterialsGrid() {
    var grids = document.querySelectorAll('.grid');
    for (var i = 0; i < grids.length; i++) {
      if (grids[i].classList.contains('grid-cols-1')) return grids[i];
    }
    return null;
  }

  var chatHistory = [];
  var isGenerating = false;

  // ========== 导航初始化 ==========
  function initNav() {
    var navItems = document.querySelectorAll('[data-nav-key]');
    var currentPath = window.location.pathname;
    var currentPage = currentPath.split('/').pop().replace('.html', '') || 'editor';

    navItems.forEach(function(item) {
      var navKey = item.getAttribute('data-nav-key');
      item.addEventListener('click', function() {
        var targetPage = navKey + '.html';
        window.location.href = targetPage;
      });

      if (navKey === currentPage) {
        item.style.background = 'var(--bg-brand)';
        item.style.color = 'var(--text-onbrand)';
        var icons = item.querySelectorAll('img');
        icons.forEach(function(icon) {
          icon.style.opacity = '1';
        });
      } else {
        item.addEventListener('mouseenter', function() {
          item.style.background = 'var(--bg-overlay-l2)';
          item.style.color = 'var(--text-default)';
        });
        item.addEventListener('mouseleave', function() {
          if (navKey !== currentPage) {
            item.style.background = 'transparent';
            item.style.color = 'var(--text-secondary)';
          }
        });
      }
    });

    var newWorkBtn = document.querySelector('[data-dom-id="nav-new-work"]');
    if (newWorkBtn) {
      newWorkBtn.addEventListener('click', function() {
        window.location.href = 'new-work.html';
      });
    }
  }

  // ========== 标签页 ==========
  function initTabs() {
    var tabGroups = document.querySelectorAll('[data-tabs-group]');
    tabGroups.forEach(function(group) {
      var tabs = group.querySelectorAll('[data-tab]');
      var panels = group.querySelectorAll('[data-tab-panel]');
      var activeTab = group.querySelector('[data-tab].is-active') || tabs[0];

      function activateTab(tab) {
        var tabId = tab.getAttribute('data-tab');
        tabs.forEach(function(t) { t.classList.remove('is-active'); });
        panels.forEach(function(p) { p.classList.add('hidden'); });
        tab.classList.add('is-active');
        var targetPanel = group.querySelector('[data-tab-panel="' + tabId + '"]');
        if (targetPanel) { targetPanel.classList.remove('hidden'); }
      }

      if (activeTab) { activateTab(activeTab); }
      tabs.forEach(function(tab) {
        tab.addEventListener('click', function() { activateTab(tab); });
      });
    });

    // 注意：素材库标签页（.materials-tabs .ds-tab）的事件绑定
    // 已在 initMaterialsPage() 中处理，此处不再重复绑定。
  }

  // ========== 按钮悬停效果 ==========
  function initButtons() {
    var buttons = document.querySelectorAll('.ds-btn, .ds-pagehead__btn, .ds-settingrow__btn, .ds-settingrow__iconbtn');
    buttons.forEach(function(btn) {
      btn.addEventListener('mouseenter', function() {
        if (!btn.disabled) { btn.style.transform = 'translateY(-1px)'; }
      });
      btn.addEventListener('mouseleave', function() {
        btn.style.transform = 'translateY(0)';
      });
    });
  }

  // ========== 弹窗 ==========
  function initDialogs() {
    var dialogs = document.querySelectorAll('[data-dialog]');
    var dialogTriggers = document.querySelectorAll('[data-dialog-trigger]');
    var dialogCloses = document.querySelectorAll('[data-dialog-close]');

    dialogTriggers.forEach(function(trigger) {
      trigger.addEventListener('click', function() {
        var dialogId = trigger.getAttribute('data-dialog-trigger');
        var dialog = document.querySelector('[data-dialog="' + dialogId + '"]');
        if (dialog) {
          dialog.classList.remove('hidden');
          document.body.style.overflow = 'hidden';
        }
      });
    });

    dialogCloses.forEach(function(closeBtn) {
      closeBtn.addEventListener('click', function() {
        var dialog = closeBtn.closest('[data-dialog]');
        if (dialog) {
          dialog.classList.add('hidden');
          document.body.style.overflow = '';
        }
      });
    });

    dialogs.forEach(function(dialog) {
      dialog.addEventListener('click', function(e) {
        if (e.target === dialog) {
          dialog.classList.add('hidden');
          document.body.style.overflow = '';
        }
      });
    });
  }

  // ========== 文件树 ==========
  function initFileTree() {
    var rows = document.querySelectorAll('.ds-filetree__row');
    rows.forEach(function(row) {
      row.addEventListener('click', function() {
        rows.forEach(function(r) { r.classList.remove('is-active'); });
        row.classList.add('is-active');
      });
    });
  }

  // ========== 编辑器标签页 ==========
  function initEditorTabs() {
    var tabs = document.querySelectorAll('.ds-editortab');
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function(e) {
        var closeBtn = tab.querySelector('.close');
        if (closeBtn && closeBtn.contains(e.target)) {
          var group = tab.closest('.ds-editortabs');
          if (group) {
            tab.remove();
            var remainingTabs = group.querySelectorAll('.ds-editortab');
            if (remainingTabs.length > 0) { remainingTabs[0].classList.add('is-active'); }
          }
          return;
        }
        tabs.forEach(function(t) { t.classList.remove('is-active'); });
        tab.classList.add('is-active');
      });
    });
  }

  // ========== 搜索框 ==========
  function initSearch() {
    var searchInputs = document.querySelectorAll('.ds-input input');
    searchInputs.forEach(function(input) {
      input.addEventListener('focus', function() {
        input.parentElement.style.borderColor = 'var(--border-brand)';
        input.parentElement.style.background = 'var(--bg-overlay-l2)';
      });
      input.addEventListener('blur', function() {
        input.parentElement.style.borderColor = 'var(--border-neutral-l1)';
        input.parentElement.style.background = 'var(--bg-overlay-l1)';
      });
    });

    // 注意：作品搜索框和素材搜索框的 input 事件绑定
    // 已分别在 initWorksPage() 和 initMaterialsPage() 中处理，此处不再重复绑定。
  }

  // ========== 分页 ==========
  function initPagination() {
    var paginationItems = document.querySelectorAll('.ds-pagination__item');
    paginationItems.forEach(function(item) {
      if (!item.disabled) {
        item.addEventListener('click', function() {
          paginationItems.forEach(function(i) { i.classList.remove('is-active'); });
          item.classList.add('is-active');
        });
      }
    });
  }

  // ========== 作品管理页面功能 ==========
  var worksCurrentPage = 1;
  var worksItemsPerPage = 6;

  function initWorksPage() {
    // 页面检测：仅在作品管理页执行
    if (!document.querySelector('input[placeholder="搜索作品..."]') && getWorkFilterButtons().length === 0) {
      return;
    }

    // 初始渲染作品列表
    renderWorksList();

    var filterBtns = getWorkFilterButtons();
    filterBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        filterBtns.forEach(function(b) {
          b.style.background = 'transparent';
          b.style.color = 'var(--text-secondary)';
          b.style.border = '1px solid var(--border-neutral-l1)';
        });
        btn.style.background = 'var(--bg-brand-popup)';
        btn.style.color = 'var(--text-brand)';
        btn.style.border = '1px solid transparent';
        renderWorksList();
      });
    });

    var searchInput = document.querySelector('input[placeholder="搜索作品..."]');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        renderWorksList();
      });
    }

    // 绑定工具栏的"新建作品"按钮（排除已由 initNav 绑定的侧边栏按钮）
    var newWorkBtns = findButtonsByText('新建作品');
    newWorkBtns.forEach(function(btn) {
      if (btn.getAttribute('data-dom-id') === 'nav-new-work') return;
      btn.addEventListener('click', function() {
        window.location.href = 'new-work.html';
      });
    });
  }

  // 渲染作品列表
  function renderWorksList() {
    var grid = getWorksGrid();
    if (!grid) return;

    var searchInput = document.querySelector('input[placeholder="搜索作品..."]');
    var query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    // 获取筛选状态
    var activeFilter = '全部';
    var filterBtns = getWorkFilterButtons();
    filterBtns.forEach(function(btn) {
      var isActive = btn.style.background === 'var(--bg-brand-popup)' || 
                     btn.style.background === 'rgb(47, 133, 90)' ||
                     btn.classList.contains('is-active');
      if (isActive) activeFilter = btn.textContent.trim();
    });

    // 从 localStorage 读取真实数据
    var allWorks = window.WorksStore ? window.WorksStore.getAllWorks() : [];

    // 筛选
    var filteredWorks = allWorks.filter(function(work) {
      var matchStatus = activeFilter === '全部' || work.status === activeFilter;
      var matchQuery = !query || 
        (work.title && work.title.toLowerCase().indexOf(query) !== -1) ||
        (work.genre && work.genre.toLowerCase().indexOf(query) !== -1);
      return matchStatus && matchQuery;
    });

    // 清空网格
    grid.innerHTML = '';

    if (filteredWorks.length === 0) {
      // 空状态
      var emptyState = document.createElement('div');
      emptyState.className = 'col-span-full flex flex-col items-center justify-center py-16 text-center';
      emptyState.style.color = 'var(--text-tertiary)';
      emptyState.innerHTML =
        '<img src="../assets/icons/dl-builtin-trae/scroll-text.svg" width="48" height="48" alt="" style="opacity: 0.3; margin-bottom: 16px;">' +
        '<div style="font-size: var(--heading-sm-font-size); font-weight: 500; color: var(--text-secondary); margin-bottom: 8px;">暂无作品</div>' +
        '<div style="font-size: var(--body-sm-font-size); line-height: 1.5;">点击"新建作品"开始你的创作之旅</div>';
      grid.appendChild(emptyState);
      return;
    }

    // 渲染作品卡片
    filteredWorks.forEach(function(work) {
      var card = createWorkCardFromData(work);
      grid.appendChild(card);
    });

    // 更新统计
    updateWorksStats(allWorks);
  }

  // 从数据创建作品卡片
  function createWorkCardFromData(work) {
    var card = document.createElement('div');
    card.className = 'rounded-md overflow-hidden cursor-pointer';
    card.dataset.workId = work.id;
    card.style.cssText = 'background: var(--bg-base-secondary); border: 1px solid var(--border-neutral-l1); border-radius: var(--radius-4); transition: transform 120ms cubic-bezier(.2,.8,.2,1), background-color 120ms cubic-bezier(.2,.8,.2,1);';

    var progressColor = work.status === '已完结' ? 'var(--bg-brand)' : 'var(--bg-brand)';
    var progressWidth = Math.min(100, work.progress || 0);

    card.innerHTML =
      '<div class="relative" style="height: 120px; overflow: hidden; background: var(--bg-base-secondary);">' +
      '<div class="absolute inset-0" style="background: repeating-linear-gradient(0deg, transparent, transparent 10px, var(--bg-overlay-l1) 10px, var(--bg-overlay-l1) 12px), var(--bg-base-secondary);"></div>' +
      '<div class="absolute" style="bottom: 0; left: 0; right: 0; height: 3px; background: var(--bg-brand);"></div>' +
      '<div class="absolute top-2 left-2 inline-flex items-center justify-center whitespace-nowrap rounded-md px-2" style="height: 20px; font-size: 11px; background: var(--bg-overlay-l3); color: var(--text-default);">' + escapeHtml(work.genre || '未分类') + '</div>' +
      '<button class="work-delete-btn" style="position:absolute; top:8px; right:8px; width:24px; height:24px; border-radius:4px; background:var(--bg-overlay-l3); border:none; color:var(--text-default); font-size:14px; cursor:pointer; display:none; align-items:center; justify-content:center;">✕</button>' +
      '</div>' +
      '<div class="p-3">' +
      '<div class="truncate" style="font-size: var(--heading-xs-font-size); font-weight: 600; color: var(--text-default); line-height: var(--heading-xs-line-height); margin-bottom: var(--spacer-4);">' + escapeHtml(work.title || '未命名') + '</div>' +
      '<div class="truncate" style="font-size: var(--body-xs-font-size); color: var(--text-secondary); line-height: 1.4; margin-bottom: var(--spacer-8);">' + escapeHtml(work.genre || '未分类') + ' · ' + (work.chapters ? work.chapters.length : 0) + ' 章</div>' +
      '<div class="w-full rounded-full" style="height: 4px; background: var(--bg-overlay-l3); margin-bottom: var(--spacer-8);">' +
      '<div class="rounded-full" style="height: 4px; width: ' + progressWidth + '%; background: var(--bg-brand);"></div>' +
      '</div>' +
      '<div class="flex items-center justify-between">' +
      '<span class="truncate" style="font-size: 11px; color: var(--text-tertiary); line-height: 1.4;">最后编辑: ' + (work.lastEdit || '刚刚') + '</span>' +
      '<span class="whitespace-nowrap flex-shrink-0" style="font-size: 11px; color: var(--text-tertiary); line-height: 1.4;">' + formatWordCount(work.totalWordCount || 0) + '</span>' +
      '</div>' +
      '</div>';

    card.addEventListener('click', function() {
      if (window.WorksStore) {
        window.WorksStore.setCurrentWork(work.id);
      }
      window.location.href = 'editor.html';
    });

    card.addEventListener('mouseenter', function() {
      card.style.borderColor = 'var(--border-neutral-l2)';
      card.style.transform = 'translateY(-2px)';
      card.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
      var delBtn = card.querySelector('.work-delete-btn');
      if (delBtn) delBtn.style.display = 'flex';
    });

    card.addEventListener('mouseleave', function() {
      card.style.borderColor = 'var(--border-neutral-l1)';
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = 'none';
      var delBtn = card.querySelector('.work-delete-btn');
      if (delBtn) delBtn.style.display = 'none';
    });

    var delBtn = card.querySelector('.work-delete-btn');
    if (delBtn) {
      delBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        showConfirmDialog('确定删除作品 "' + (work.title || '未命名') + '" 吗？此操作不可恢复。', function() {
          if (window.WorksStore) {
            window.WorksStore.deleteWork(work.id);
          }
          renderWorksList();
          showNotification('作品已删除', 'info');
        });
      });
    }

    return card;
  }

  // 格式化字数
  function formatWordCount(count) {
    if (count >= 10000) {
      return (count / 10000).toFixed(1) + '万';
    }
    return count.toLocaleString();
  }

  // 更新作品统计
  function updateWorksStats(works) {
    var totalCount = works.length;
    var serializingCount = works.filter(function(w) { return w.status === '连载中'; }).length;
    var completedCount = works.filter(function(w) { return w.status === '已完结'; }).length;
    var totalWords = works.reduce(function(sum, w) { return sum + (w.totalWordCount || 0); }, 0);

    var statNumbers = document.querySelectorAll('.stat-number');
    if (statNumbers.length >= 4) {
      statNumbers[0].textContent = totalCount;
      statNumbers[1].textContent = serializingCount;
      statNumbers[2].textContent = completedCount;
      statNumbers[3].textContent = formatWordCount(totalWords);
    }
  }

  function applyWorksFilter() {
    var searchInput = document.querySelector('input[placeholder="搜索作品..."]');
    var query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    var activeFilter = '';
    var filterBtns = getWorkFilterButtons();
    filterBtns.forEach(function(btn) {
      var bg = btn.style.background;
      if (bg && bg.indexOf('brand') !== -1) {
        activeFilter = btn.textContent.trim();
      }
    });

    var worksGrid = getWorksGrid();
    if (!worksGrid) return;
    var workCards = worksGrid.children;
    Array.from(workCards).forEach(function(card, index) {
      var data = worksData[index];
      var title = card.querySelector('.truncate') ? card.querySelector('.truncate').textContent.toLowerCase() : '';
      var genreEl = card.querySelector('[style*="background: var(--bg-overlay-l3); color: var(--text-default);"]');
      var genre = genreEl ? genreEl.textContent.toLowerCase() : '';

      var matchesSearch = query === '' || title.indexOf(query) !== -1 || genre.indexOf(query) !== -1;
      var matchesFilter = activeFilter === '' || activeFilter === '全部' || (data && data.status === activeFilter);

      if (matchesSearch && matchesFilter) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });

    updateStats();
  }

  function updateStats() {
    var worksGrid = getWorksGrid();
    var workCards = worksGrid ? worksGrid.children : [];
    var visibleCount = 0;
    Array.from(workCards).forEach(function(card) {
      if (card.style.display !== 'none') visibleCount++;
    });

    var totalWordCount = worksData.reduce(function(sum, item) {
      return sum + item.wordCount;
    }, 0);

    var totalWordCountEl = findElementByText('.whitespace-nowrap', '总字数');
    if (totalWordCountEl) {
      var valueEl = totalWordCountEl.parentElement.querySelector('span:last-child');
      if (valueEl) {
        valueEl.textContent = (totalWordCount / 10000).toFixed(1) + '万';
      }
    }

    var allCountEl = findElementByText('.flex.items-center.gap-3', '全部作品');
    if (allCountEl) {
      var countEl = allCountEl.querySelector('span:last-child');
      if (countEl) countEl.textContent = worksData.length;
    }
  }

  function loadMoreWorks() {
    var grid = getWorksGrid();
    if (!grid) return;

    var loadMoreBtn = findButtonByText('加载更多');
    if (!loadMoreBtn) return;

    currentPage++;
    var startIndex = (currentPage - 1) * itemsPerPage;
    var endIndex = startIndex + itemsPerPage;
    var paginatedData = worksData.slice(startIndex, endIndex);

    if (paginatedData.length === 0) {
      showNotification('已加载全部作品', 'info');
      loadMoreBtn.style.opacity = '0.5';
      loadMoreBtn.disabled = true;
      return;
    }

    paginatedData.forEach(function(data) {
      var card = createWorkCard(data);
      grid.appendChild(card);
    });

    showNotification('已加载第 ' + currentPage + ' 页', 'info');

    if (endIndex >= worksData.length) {
      loadMoreBtn.style.opacity = '0.5';
      loadMoreBtn.disabled = true;
    }
  }

  function createWorkCard(data) {
    var card = document.createElement('div');
    card.className = 'rounded-md overflow-hidden cursor-pointer';
    card.style.cssText = 'background: var(--bg-base-secondary); border: 1px solid var(--border-neutral-l1); border-radius: var(--radius-4); transition: transform 120ms cubic-bezier(.2,.8,.2,1), background-color 120ms cubic-bezier(.2,.8,.2,1);';

    var patterns = [
      'repeating-linear-gradient(0deg, transparent, transparent 10px, var(--bg-overlay-l1) 10px, var(--bg-overlay-l1) 12px)',
      'repeating-linear-gradient(135deg, transparent, transparent 14px, var(--bg-overlay-l1) 14px, var(--bg-overlay-l1) 16px)',
      'repeating-linear-gradient(45deg, transparent, transparent 7px, var(--bg-overlay-l1) 7px, var(--bg-overlay-l1) 8px)'
    ];
    var patternIndex = data.id % patterns.length;
    var progressBarColor = data.status === '已完结' ? 'var(--bg-brand)' : 'var(--bg-brand)';

    card.innerHTML =
      '<div class="relative" style="height: 120px; overflow: hidden; background: var(--bg-base-secondary);">' +
      '<div class="absolute inset-0" style="background: ' + patterns[patternIndex] + ', var(--bg-base-secondary);"></div>' +
      '<div class="absolute" style="bottom: 0; left: 0; right: 0; height: 3px; background: var(--bg-brand);"></div>' +
      '<div class="absolute top-2 left-2 inline-flex items-center justify-center whitespace-nowrap rounded-md px-2" style="height: 20px; font-size: 11px; background: var(--bg-overlay-l3); color: var(--text-default);">' + data.genre + '</div>' +
      '</div>' +
      '<div class="p-3">' +
      '<div class="truncate" style="font-size: var(--heading-xs-font-size); font-weight: 600; color: var(--text-default); line-height: var(--heading-xs-line-height); margin-bottom: var(--spacer-4);">' + data.title + '</div>' +
      '<div class="truncate" style="font-size: var(--body-xs-font-size); color: var(--text-secondary); line-height: 1.4; margin-bottom: var(--spacer-8);">' + data.genre + ' · ' + data.chapters + ' 章</div>' +
      '<div class="w-full rounded-full" style="height: 4px; background: var(--bg-overlay-l3); margin-bottom: var(--spacer-8);">' +
      '<div class="rounded-full" style="height: 4px; width: ' + data.progress + '%; background: ' + progressBarColor + ';"></div>' +
      '</div>' +
      '<div class="flex items-center justify-between">' +
      '<span class="truncate" style="font-size: 11px; color: var(--text-tertiary); line-height: 1.4;">最后编辑: ' + data.lastEdit + '</span>' +
      '<span class="whitespace-nowrap flex-shrink-0" style="font-size: 11px; color: var(--text-tertiary); line-height: 1.4;">' + (data.wordCount / 10000).toFixed(1) + '万</span>' +
      '</div>' +
      '</div>';

    card.addEventListener('mouseenter', function() {
      card.style.transform = 'translateY(-2px)';
      card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    });

    card.addEventListener('mouseleave', function() {
      card.style.transform = '';
      card.style.boxShadow = '';
    });

    card.addEventListener('click', function() {
      window.location.href = 'editor.html';
    });

    return card;
  }

  // ========== 素材库页面功能 ==========
  var materialsCurrentPage = 1;
  var materialsItemsPerPage = 6;

  function initMaterialsPage() {
    // 页面检测：仅在素材库页执行
    if (!document.querySelector('.materials-tabs') && document.querySelectorAll('.material-card').length === 0) {
      return;
    }

    // 初始渲染素材列表
    renderMaterialsList();

    var materialTabs = document.querySelectorAll('.materials-tabs .ds-tab');
    materialTabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        materialTabs.forEach(function(t) { t.classList.remove('is-active'); });
        tab.classList.add('is-active');
        renderMaterialsList();
      });
    });

    var searchInput = document.querySelector('.materials-tabs + .flex input');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        renderMaterialsList();
      });
    }

    var useInspirationBtn = findButtonByText('使用灵感');
    if (useInspirationBtn) {
      useInspirationBtn.addEventListener('click', function() {
        var card = useInspirationBtn.closest('.ds-card');
        var title = card && card.querySelector('h2') ? card.querySelector('h2').textContent : '灵感';
        showNotification('已将灵感 "' + title + '" 添加到当前章节', 'info');
      });
    }

    var aiExpandBtns = findButtonsByText('AI 展开');
    aiExpandBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var card = btn.closest('.ds-card') || btn.closest('.material-card') || btn.closest('div');
        if (!card) return;
        var titleEl = card.querySelector('h2, h3');
        var contentEl = card.querySelector('p');
        var title = titleEl ? titleEl.textContent : '';
        var content = contentEl ? contentEl.textContent : '';
        expandMaterial(title, content, btn);
      });
    });

    // 引用按钮
    var quoteBtns = findButtonsByText('引用');
    quoteBtns.forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var card = btn.closest('.ds-card') || btn.closest('.material-card') || btn.closest('div');
        var titleEl = card ? card.querySelector('h2, h3') : null;
        var title = titleEl ? titleEl.textContent : '素材';
        showNotification('已引用 "' + title + '" 到编辑器', 'info');
      });
    });
  }

  // 渲染素材列表（从 localStorage 读取真实数据）
  function renderMaterialsList() {
    var grid = getMaterialsGrid();
    if (!grid) return;

    // 获取搜索关键词
    var searchInput = document.querySelector('.materials-tabs + .flex input');
    var query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    // 获取当前选中的分类
    var activeCategory = '全部';
    var materialTabs = document.querySelectorAll('.materials-tabs .ds-tab');
    materialTabs.forEach(function(tab) {
      if (tab.classList.contains('is-active')) {
        activeCategory = tab.textContent.trim();
      }
    });

    // 从 localStorage 读取真实数据
    var allMaterials = window.MaterialsStore ? window.MaterialsStore.getAllMaterials() : [];

    // 筛选
    var filteredMaterials = allMaterials.filter(function(material) {
      var matchCategory = activeCategory === '全部' || material.category === activeCategory;
      var matchQuery = !query ||
        (material.title && material.title.toLowerCase().indexOf(query) !== -1) ||
        (material.content && material.content.toLowerCase().indexOf(query) !== -1) ||
        (material.tags && material.tags.some(function(t) { return t.toLowerCase().indexOf(query) !== -1; }));
      return matchCategory && matchQuery;
    });

    // 清空网格
    grid.innerHTML = '';

    if (filteredMaterials.length === 0) {
      // 空状态
      var emptyState = document.createElement('div');
      emptyState.className = 'col-span-full flex flex-col items-center justify-center py-16 text-center';
      emptyState.style.color = 'var(--text-tertiary)';
      emptyState.innerHTML =
        '<img src="../assets/icons/dl-builtin-trae/layers.svg" width="48" height="48" alt="" style="opacity: 0.3; margin-bottom: 16px;">' +
        '<div style="font-size: var(--heading-sm-font-size); font-weight: 500; color: var(--text-secondary); margin-bottom: 8px;">暂无素材</div>' +
        '<div style="font-size: var(--body-sm-font-size); line-height: 1.5;">点击"AI 生成素材"获取创作灵感，或使用标签筛选</div>';
      grid.appendChild(emptyState);
      return;
    }

    // 渲染素材卡片
    filteredMaterials.forEach(function(material) {
      var card = createMaterialCardFromData(material);
      grid.appendChild(card);
    });
  }

  // 从数据创建素材卡片
  function createMaterialCardFromData(material) {
    var card = document.createElement('div');
    card.className = 'material-card';
    card.dataset.materialId = material.id;
    card.style.cssText = 'background: var(--bg-base-secondary); border: 1px solid var(--border-neutral-l1); border-radius: var(--radius-lg); padding: var(--spacer-12); transition: all 120ms cubic-bezier(.2,.8,.2,1); cursor: pointer;';

    var tagsHtml = '';
    if (material.tags && material.tags.length > 0) {
      material.tags.forEach(function(tag) {
        tagsHtml += '<span class="inline-flex items-center justify-center whitespace-nowrap rounded-md px-2" style="height: 20px; font-size: 11px; background: var(--bg-overlay-l2); color: var(--text-tertiary);">' + escapeHtml(tag) + '</span>';
      });
    }

    card.innerHTML =
      '<div class="flex items-start justify-between mb-2">' +
      '<span style="font-size: 11px; color: var(--text-tertiary);">' + escapeHtml(material.category || '其他') + '</span>' +
      '<img src="../assets/icons/dl-builtin-trae/chevron-right.svg" width="14" height="14" alt="" class="opacity-30">' +
      '</div>' +
      '<h3 style="font-size: var(--body-sm-font-size); font-weight: 500; color: var(--text-default); margin-bottom: 6px;">' + escapeHtml(material.title || '未命名素材') + '</h3>' +
      '<p style="font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 8px;">' + escapeHtml(material.content || '') + '</p>' +
      '<div class="flex items-center gap-1.5 flex-wrap">' + tagsHtml + '</div>' +
      '<div class="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-l1" style="border-color: var(--border-neutral-l1);">' +
      '<button class="copy-btn" style="padding: 4px 8px; background: transparent; border: none; color: var(--text-tertiary); font-size: 11px;">复制</button>' +
      '<button class="expand-btn" style="padding: 4px 8px; background: transparent; border: none; color: var(--text-brand); font-size: 11px;">AI 展开</button>' +
      '<button class="delete-btn" style="padding: 4px 8px; background: transparent; border: none; color: var(--text-tertiary); font-size: 11px; margin-left: auto;">删除</button>' +
      '</div>';

    // 卡片悬停效果
    card.addEventListener('mouseenter', function() {
      card.style.borderColor = 'var(--border-neutral-l2)';
      card.style.transform = 'translateY(-2px)';
      card.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
    });

    card.addEventListener('mouseleave', function() {
      card.style.borderColor = 'var(--border-neutral-l1)';
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = 'none';
    });

    // 复制按钮
    var copyBtn = card.querySelector('.copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (navigator.clipboard) {
          navigator.clipboard.writeText(material.content || '').then(function() {
            showNotification('已复制到剪贴板', 'info');
          });
        }
      });
    }

    // 删除按钮
    var deleteBtn = card.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        showConfirmDialog('确定删除素材 "' + (material.title || '未命名素材') + '" 吗？', function() {
          if (window.MaterialsStore) {
            window.MaterialsStore.deleteMaterial(material.id);
          }
          renderMaterialsList();
          showNotification('素材已删除', 'info');
        });
      });
    }

    // AI 展开按钮
    var expandBtn = card.querySelector('.expand-btn');
    if (expandBtn) {
      expandBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        expandMaterial(material.title, material.content, expandBtn);
      });
    }

    return card;
  }

  // ========== 新建作品页面功能 ==========
  function initNewWorkPage() {
    var genreChips = document.querySelectorAll('.genre-chip');
    genreChips.forEach(function(chip) {
      chip.addEventListener('click', function() {
        genreChips.forEach(function(c) {
          c.style.background = 'var(--bg-overlay-l1)';
          c.style.color = 'var(--text-secondary)';
          c.classList.remove('selected');
        });
        chip.style.background = 'var(--bg-brand)';
        chip.style.color = 'var(--text-onbrand)';
        chip.classList.add('selected');
      });
    });

    var styleChips = document.querySelectorAll('.style-chip');
    styleChips.forEach(function(chip) {
      chip.addEventListener('click', function() {
        styleChips.forEach(function(c) {
          c.style.background = 'var(--bg-overlay-l1)';
          c.style.color = 'var(--text-secondary)';
          c.classList.remove('selected');
        });
        chip.style.background = 'var(--bg-brand)';
        chip.style.color = 'var(--text-onbrand)';
        chip.classList.add('selected');
      });
    });

    var wordcountChips = document.querySelectorAll('.wordcount-chip');
    wordcountChips.forEach(function(chip) {
      chip.addEventListener('click', function() {
        wordcountChips.forEach(function(c) {
          c.style.background = 'var(--bg-overlay-l1)';
          c.style.color = 'var(--text-secondary)';
          c.classList.remove('selected');
        });
        chip.style.background = 'var(--bg-brand)';
        chip.style.color = 'var(--text-onbrand)';
        chip.classList.add('selected');

        if (chip.textContent.trim() === '自定义') {
          showCustomWordCountInput();
        }
      });
    });

    var cancelBtn = document.querySelector('[data-dom-id="btn-cancel"]');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function() {
        showConfirmDialog('确定要取消创建作品吗？', function() {
          window.location.href = 'works.html';
        });
      });
    }

    var createBtn = document.querySelector('[data-dom-id="btn-create"]');
    if (createBtn) {
      createBtn.addEventListener('click', function() {
        var titleInput = document.getElementById('work-title-input');
        var title = titleInput ? titleInput.value.trim() : '';

        if (!title) {
          showNotification('请填写作品名称', 'warn');
          return;
        }

        // 获取作品简介
        var descTextarea = document.querySelector('textarea');
        var description = descTextarea ? descTextarea.value.trim() : '';

        // 获取选中的作品类型
        var selectedGenre = document.querySelector('.genre-chip.selected');
        var genre = selectedGenre ? selectedGenre.textContent.trim() : '科幻';

        // 获取选中的写作风格
        var selectedStyle = document.querySelector('.style-chip.selected');
        var style = selectedStyle ? selectedStyle.textContent.trim() : '沉浸叙事';

        // 获取目标字数
        var selectedWordcount = document.querySelector('.wordcount-chip.selected');
        var wordcountText = selectedWordcount ? selectedWordcount.textContent.trim() : '3,000字';
        var targetWordCount = parseInt(wordcountText.replace(/[^0-9]/g, '')) || 3000;

        // 调用 WorksStore 保存作品
        if (window.WorksStore) {
          var work = window.WorksStore.createWork({
            title: title,
            genre: genre,
            description: description,
            style: style,
            targetWordCount: targetWordCount
          });

          // 设置为当前作品
          if (work && work.id) {
            window.WorksStore.setCurrentWork(work.id);
            
            // 创建默认章节
            window.WorksStore.addChapter(work.id, {
              title: '第一章',
              content: ''
            });
          }

          showNotification('作品 "' + title + '" 创建成功！', 'info');
          setTimeout(function() {
            window.location.href = 'editor.html';
          }, 1000);
        } else {
          showNotification('作品创建失败，请刷新页面重试', 'error');
        }
      });
    }
  }

  function showCustomWordCountInput() {
    var customInput = document.getElementById('custom-wordcount-input');
    if (customInput) {
      customInput.parentElement.classList.remove('hidden');
      return;
    }

    var chipsContainer = document.querySelector('.wordcount-chip').parentElement;
    var inputWrap = document.createElement('div');
    inputWrap.className = 'flex items-center gap-2 mt-2';
    inputWrap.innerHTML = '<input type="number" id="custom-wordcount-input" placeholder="输入目标字数" style="width: 120px; height: 32px; padding: 0 10px; background: var(--bg-overlay-l1); border: 1px solid var(--border-neutral-l2); border-radius: 6px; font-size: 13px; color: var(--text-default); outline: none;">';
    chipsContainer.parentElement.appendChild(inputWrap);

    var input = inputWrap.querySelector('input');
    input.focus();
    input.addEventListener('blur', function() {
      var val = parseInt(input.value);
      if (val && val > 0) {
        var customChip = null;
        var chips = document.querySelectorAll('.wordcount-chip');
        chips.forEach(function(c) {
          if (c.textContent.indexOf('自定义') !== -1 || c.textContent.indexOf('字') === -1) customChip = c;
        });
        if (customChip) customChip.textContent = val + '字';
      }
    });
  }

  // ========== 编辑器页面功能 ==========
  var currentChapterId = null;

  function initEditorPage() {
    var currentWork = window.WorksStore ? window.WorksStore.getCurrentWork() : null;
    
    if (!currentWork) {
      renderEmptyEditor();
      return;
    }

    updateWorkTitle(currentWork);
    renderOutlineTree(currentWork);
    renderEditorTabs(currentWork);

    if (currentWork.chapters && currentWork.chapters.length > 0) {
      var firstChapter = currentWork.chapters[0];
      currentChapterId = firstChapter.id;
      loadChapterContent(firstChapter);
    } else {
      renderEmptyEditor();
    }
  }

  function updateWorkTitle(work) {
    var titleEl = document.querySelector('h1');
    if (titleEl) {
      titleEl.textContent = work.title || '未命名作品';
    }

    var breadcrumbEl = document.querySelector('h1 + span');
    if (breadcrumbEl) {
      breadcrumbEl.textContent = (work.title || '未命名作品') + ' > 章节';
    }

    var currentWorkEl = document.querySelector('[style*="font-size: var(--body-base-font-size); color: var(--text-secondary); line-height: var(--body-base-line-height);"]');
    if (currentWorkEl && currentWorkEl.textContent === '未选择') {
      currentWorkEl.textContent = work.title || '未命名作品';
    }

    var contextBar = document.querySelector('aside[style*="width: 340px"] .flex.items-center.justify-between.px-4');
    if (contextBar) {
      var contextSpan = contextBar.querySelector('span');
      if (contextSpan) {
        contextSpan.textContent = (work.title || '未命名作品') + ' · 章节';
      }
    }

    var rightContextBar = document.querySelector('.flex.items-center.justify-between.px-4[style*="height: 32px"]');
    if (rightContextBar) {
      var rightSpan = rightContextBar.querySelector('span');
      if (rightSpan) {
        rightSpan.textContent = (work.title || '未命名作品') + ' · 章节';
      }
    }
  }

  function renderEmptyEditor() {
    var article = document.getElementById('editor-article');
    if (article) {
      article.innerHTML =
        '<h2 style="font-size: var(--heading-sm-font-size); font-weight: 600; color: var(--text-default); line-height: 1.4; margin-bottom: 32px; text-wrap: balance;">欢迎开始创作</h2>' +
        '<p style="margin-bottom: 24px; text-indent: 2em;">请先创建一个作品，或从作品列表中选择一个作品开始编辑。<span style="display: inline-block; width: 2px; height: 1em; background: var(--text-default); vertical-align: text-bottom; animation: blink 1s step-end infinite;"></span></p>';
    }

    var container = document.getElementById('outline-tree-container');
    if (container) {
      container.innerHTML =
        '<div class="flex flex-col items-center justify-center py-12 text-center">' +
        '<img src="../assets/icons/dl-builtin-trae/file-text.svg" width="32" height="32" alt="" style="opacity: 0.3; margin-bottom: 8px;">' +
        '<div style="font-size: 12px; color: var(--text-tertiary);">暂无章节</div>' +
        '</div>';
    }
  }

  function renderOutlineTree(work) {
    var container = document.getElementById('outline-tree-container');
    if (!container) return;

    container.innerHTML = '';

    if (!work.chapters || work.chapters.length === 0) {
      container.innerHTML =
        '<div class="flex flex-col items-center justify-center py-12 text-center">' +
        '<img src="../assets/icons/dl-builtin-trae/file-text.svg" width="32" height="32" alt="" style="opacity: 0.3; margin-bottom: 8px;">' +
        '<div style="font-size: 12px; color: var(--text-tertiary);">暂无章节</div>' +
        '</div>';
      return;
    }

    var defaultVolumeTitle = '第一卷';
    var volumeDiv = document.createElement('div');
    volumeDiv.innerHTML =
      '<div class="flex items-center gap-2 px-2 rounded cursor-pointer outline-volume-row" style="height: 32px; color: var(--text-default); font-size: 13px; font-weight: 500;">' +
      '<img src="../assets/icons/dl-builtin-trae/chevron-down.svg" width="12" height="12" alt="" class="flex-shrink-0" style="color: var(--icon-tertiary);">' +
      '<img src="../assets/icons/dl-builtin-trae/folder.svg" width="14" height="14" alt="" class="flex-shrink-0" style="color: var(--icon-brand);">' +
      '<span class="truncate">' + escapeHtml(work.title || defaultVolumeTitle) + '</span>' +
      '</div>' +
      '<div class="outline-chapters-container">';

    work.chapters.forEach(function(chapter, index) {
      var isActive = currentChapterId === chapter.id;
      var chapterRow = document.createElement('div');
      chapterRow.className = 'outline-chapter-row';
      chapterRow.dataset.chapterId = chapter.id;
      chapterRow.style.cssText =
        'display: flex; align-items: center; gap: 2px; border-radius: 4px; cursor: pointer; height: 32px; padding-left: 28px; margin-left: 6px; border-left: 2px solid ' +
        (isActive ? 'var(--bg-brand)' : 'transparent') + '; background: ' +
        (isActive ? 'var(--bg-overlay-l1)' : 'transparent') + '; color: ' +
        (isActive ? 'var(--icon-brand)' : 'var(--text-secondary)') + '; font-size: 13px;';

      chapterRow.innerHTML =
        '<img src="../assets/icons/dl-builtin-trae/file-text.svg" width="14" height="14" alt="" class="flex-shrink-0" style="opacity: ' + (isActive ? '1' : '0.6') + ';">' +
        '<span class="truncate" style="flex:1;">' + escapeHtml(chapter.title || '未命名章节') + '</span>' +
        '<button class="chapter-delete-btn" style="width:20px; height:20px; border:none; background:transparent; color:var(--text-tertiary); font-size:12px; cursor:pointer; padding:0; display:none; align-items:center; justify-content:center; flex-shrink:0;">✕</button>';

      chapterRow.addEventListener('click', function() {
        selectChapter(chapter.id);
      });

      chapterRow.addEventListener('mouseenter', function() {
        if (!isActive) {
          chapterRow.style.background = 'var(--bg-overlay-l2)';
        }
        var delBtn = chapterRow.querySelector('.chapter-delete-btn');
        if (delBtn) delBtn.style.display = 'flex';
      });

      chapterRow.addEventListener('mouseleave', function() {
        if (!isActive) {
          chapterRow.style.background = 'transparent';
        }
        var delBtn = chapterRow.querySelector('.chapter-delete-btn');
        if (delBtn) delBtn.style.display = 'none';
      });

      var chapterDelBtn = chapterRow.querySelector('.chapter-delete-btn');
      if (chapterDelBtn) {
        chapterDelBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          showConfirmDialog('确定删除章节 "' + (chapter.title || '未命名章节') + '" 吗？', function() {
            closeChapterTab(chapter.id);
          });
        });
      }

      volumeDiv.querySelector('.outline-chapters-container').appendChild(chapterRow);
    });

    volumeDiv.querySelector('.outline-chapters-container').innerHTML += '</div>';
    container.appendChild(volumeDiv);

    var volumeRow = container.querySelector('.outline-volume-row');
    var chevron = volumeRow.querySelector('img[src*="chevron"]');
    var folderIcon = volumeRow.querySelector('img[src*="folder.svg"]');
    var chaptersContainer = container.querySelector('.outline-chapters-container');

    volumeRow.addEventListener('click', function() {
      var isExpanded = chevron.src.indexOf('chevron-down') !== -1;
      if (isExpanded) {
        chaptersContainer.style.display = 'none';
        chevron.src = chevron.src.replace('chevron-down', 'chevron-right');
        folderIcon.style.opacity = '0.6';
        volumeRow.style.color = 'var(--text-secondary)';
      } else {
        chaptersContainer.style.display = '';
        chevron.src = chevron.src.replace('chevron-right', 'chevron-down');
        folderIcon.style.opacity = '1';
        volumeRow.style.color = 'var(--text-default)';
      }
    });

    var addChapterBtn = document.createElement('button');
    addChapterBtn.className = 'w-full flex items-center justify-center gap-2 rounded-md cursor-pointer mt-2';
    addChapterBtn.style.cssText = 'height: 32px; background: transparent; border: 1px dashed var(--border-neutral-l2); color: var(--text-tertiary); font-size: 12px;';
    addChapterBtn.innerHTML =
      '<img src="../assets/icons/dl-builtin-trae/plus.svg" width="14" height="14" alt="" style="opacity: 0.6;">' +
      '<span>新建章节</span>';
    addChapterBtn.addEventListener('click', function() {
      showAddChapterDialog(work);
    });
    container.appendChild(addChapterBtn);
  }

  function renderEditorTabs(work) {
    var container = document.getElementById('editor-tabs-container');
    if (!container) return;

    var spacer = container.querySelector('.ds-editortabs__spacer');
    if (!spacer) {
      spacer = document.createElement('span');
      spacer.className = 'ds-editortabs__spacer';
    }

    container.innerHTML = '';

    if (!work.chapters || work.chapters.length === 0) {
      container.appendChild(spacer);
      return;
    }

    work.chapters.forEach(function(chapter) {
      var isActive = currentChapterId === chapter.id;
      var tab = document.createElement('span');
      tab.className = 'ds-editortab' + (isActive ? ' is-active' : '');
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      tab.dataset.chapterId = chapter.id;

      tab.innerHTML =
        '<span class="ic"><img src="../assets/icons/dl-builtin-trae/file-text.svg" width="14" height="14" alt="" class="icon" style="opacity: ' + (isActive ? '1' : '0.6') + ';"></span>' +
        '<span>' + escapeHtml(chapter.title || '未命名章节') + '</span>' +
        '<span class="close"><img src="../assets/icons/dl-builtin-trae/x.svg" width="12" height="12" alt="close" class="icon"></span>';

      tab.addEventListener('click', function(e) {
        var closeBtn = tab.querySelector('.close');
        if (closeBtn && closeBtn.contains(e.target)) {
          closeChapterTab(chapter.id);
          return;
        }
        selectChapter(chapter.id);
      });

      container.appendChild(tab);
    });

    container.appendChild(spacer);
  }

  function selectChapter(chapterId) {
    var work = window.WorksStore ? window.WorksStore.getCurrentWork() : null;
    if (!work || !work.chapters) return;

    var chapter = work.chapters.find(function(c) { return c.id === chapterId; });
    if (!chapter) return;

    var prevArticle = document.getElementById('editor-article');
    var prevContent = prevArticle ? prevArticle.innerHTML : '';
    if (prevContent && prevContent.trim() && prevContent.trim() !== '<br>' && prevContent.trim() !== '&nbsp;' && prevContent.trim() !== '<p><br></p>') {
      saveCurrentChapter();
    }

    currentChapterId = chapterId;

    loadChapterContent(chapter);

    var chapterRows = document.querySelectorAll('.outline-chapter-row');
    chapterRows.forEach(function(row) {
      var isActive = row.dataset.chapterId === chapterId;
      row.style.background = isActive ? 'var(--bg-overlay-l1)' : 'transparent';
      row.style.color = isActive ? 'var(--icon-brand)' : 'var(--text-secondary)';
      row.style.borderLeftColor = isActive ? 'var(--bg-brand)' : 'transparent';
      var icons = row.querySelectorAll('img');
      icons.forEach(function(i) { i.style.opacity = isActive ? '1' : '0.6'; });
    });

    var tabs = document.querySelectorAll('.ds-editortab');
    tabs.forEach(function(tab) {
      var isActive = tab.dataset.chapterId === chapterId;
      if (isActive) {
        tab.classList.add('is-active');
        tab.setAttribute('aria-selected', 'true');
        var icon = tab.querySelector('.ic img');
        if (icon) icon.style.opacity = '1';
      } else {
        tab.classList.remove('is-active');
        tab.setAttribute('aria-selected', 'false');
        var icon = tab.querySelector('.ic img');
        if (icon) icon.style.opacity = '0.6';
      }
    });
  }

  function updateWordCount() {
    var article = document.querySelector('article');
    if (!article) return;

    var text = article.textContent || '';
    var wordCount = text.length;

    var chapterCountEl = document.querySelector('.flex.items-center.gap-3 span');
    if (chapterCountEl && chapterCountEl.textContent.indexOf('字') !== -1) {
      chapterCountEl.textContent = '本章 ' + wordCount.toLocaleString() + ' 字';
    }

    var currentWork = window.WorksStore ? window.WorksStore.getCurrentWork() : null;
    if (currentWork) {
      var progress = currentWork.targetWordCount > 0
        ? Math.min(100, Math.round((wordCount / currentWork.targetWordCount) * 100))
        : 0;
      var progressEl = document.querySelector('[style*="width:"][style*="%"]');
      if (progressEl) {
        progressEl.style.width = progress + '%';
      }
    }
  }

  function loadChapterContent(chapter) {
    var article = document.getElementById('editor-article');
    if (!article) return;

    if (chapter.content && chapter.content.trim()) {
      article.innerHTML = chapter.content;
    } else {
      article.innerHTML =
        '<h2 style="font-size: var(--heading-sm-font-size); font-weight: 600; color: var(--text-default); line-height: 1.4; margin-bottom: 32px; text-wrap: balance;">' + escapeHtml(chapter.title || '未命名章节') + '</h2>' +
        '<p style="margin-bottom: 24px; text-indent: 2em;">在这里开始你的创作...<span style="display: inline-block; width: 2px; height: 1em; background: var(--text-default); vertical-align: text-bottom; animation: blink 1s step-end infinite;"></span></p>';
    }

    if (typeof updateWordCount === 'function') {
      updateWordCount();
    }
  }

  function saveCurrentChapter() {
    if (!currentChapterId) return;

    var article = document.getElementById('editor-article');
    if (!article) return;

    var content = article.innerHTML;
    if (!content || content.trim() === '' || content.trim() === '<br>' || content.trim() === '&nbsp;' || content.trim() === '<p><br></p>') return;

    var work = window.WorksStore ? window.WorksStore.getCurrentWork() : null;
    if (!work) return;

    if (window.WorksStore) {
      window.WorksStore.updateChapter(work.id, currentChapterId, content);
    }
  }

  function closeChapterTab(chapterId) {
    if (!chapterId || !currentChapterId) return;

    var work = window.WorksStore ? window.WorksStore.getCurrentWork() : null;
    if (!work || !work.chapters) return;

    if (work.chapters.length === 1) {
      showNotification('至少保留一个章节', 'warn');
      return;
    }

    saveCurrentChapter();

    work.chapters = work.chapters.filter(function(c) { return c.id !== chapterId; });
    if (window.WorksStore) {
      window.WorksStore.updateWork(work.id, { chapters: work.chapters });
    }

    if (currentChapterId === chapterId) {
      currentChapterId = work.chapters[0].id;
      var firstChapter = work.chapters[0];
      loadChapterContent(firstChapter);
    }

    renderOutlineTree(work);
    renderEditorTabs(work);
  }

  function showAddChapterDialog(work) {
    showInputDialog('新建章节', '请输入章节标题', function(title) {
      if (!title) return;

      if (window.WorksStore) {
        var chapter = window.WorksStore.addChapter(work.id, {
          title: title,
          content: ''
        });

        if (chapter) {
          currentChapterId = chapter.id;
          var updatedWork = window.WorksStore.getWorkById(work.id);
          renderOutlineTree(updatedWork);
          renderEditorTabs(updatedWork);
          loadChapterContent(chapter);
          showNotification('章节 "' + title + '" 创建成功', 'info');
        }
      }
    });
  }

  // ========== 编辑器大纲树功能 ==========
  function initOutlineTree() {
    var volumeRows = document.querySelectorAll('.flex.items-center.gap-2.px-2.rounded.cursor-pointer');
    volumeRows.forEach(function(row) {
      var chevron = row.querySelector('img[src*="chevron"]');
      if (chevron) {
        row.addEventListener('click', function() {
          var nextSibling = row.nextElementSibling;
          if (nextSibling && nextSibling.querySelector('.ds-filetree__row, input')) {
            var isExpanded = chevron.src.indexOf('chevron-down') !== -1;
            if (isExpanded) {
              nextSibling.style.display = 'none';
              chevron.src = chevron.src.replace('chevron-down', 'chevron-right');
              var folderIcon = row.querySelector('img[src*="folder.svg"]');
              if (folderIcon) folderIcon.style.opacity = '0.6';
              row.style.color = 'var(--text-secondary)';
            } else {
              nextSibling.style.display = '';
              chevron.src = chevron.src.replace('chevron-right', 'chevron-down');
              var folderIcon = row.querySelector('img[src*="folder.svg"]');
              if (folderIcon) folderIcon.style.opacity = '1';
              row.style.color = 'var(--text-default)';
            }
          }
        });
      }
    });

    var chapterRows = document.querySelectorAll('.flex.items-center.gap-2.rounded.cursor-pointer + div div');
    chapterRows.forEach(function(row) {
      row.addEventListener('click', function() {
        chapterRows.forEach(function(r) {
          r.style.background = 'transparent';
          r.style.color = 'var(--text-secondary)';
          r.style.borderLeftColor = 'transparent';
          var icons = r.querySelectorAll('img');
          icons.forEach(function(i) { i.style.opacity = '0.6'; });
        });
        row.style.background = 'var(--bg-overlay-l1)';
        row.style.color = 'var(--icon-brand)';
        row.style.borderLeftColor = 'var(--bg-brand)';
        var icons = row.querySelectorAll('img');
        icons.forEach(function(i) { i.style.opacity = '1'; });

        var chapterTitle = row.querySelector('span').textContent.trim();
        scrollToChapter(chapterTitle);
      });

      row.addEventListener('mouseenter', function() {
        if (row.style.background !== 'var(--bg-overlay-l1)') {
          row.style.background = 'var(--bg-overlay-l2)';
        }
      });

      row.addEventListener('mouseleave', function() {
        if (row.style.background !== 'var(--bg-overlay-l1)') {
          row.style.background = 'transparent';
        }
      });
    });
  }

  function scrollToChapter(chapterTitle) {
    var article = document.querySelector('article');
    if (!article) return;

    var headings = article.querySelectorAll('h1, h2, h3');
    var targetHeading = null;
    headings.forEach(function(h) {
      if (h.textContent.trim().indexOf(chapterTitle) !== -1) {
        targetHeading = h;
      }
    });

    if (targetHeading) {
      targetHeading.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetHeading.style.backgroundColor = 'var(--bg-overlay-l2)';
      targetHeading.style.transition = 'background-color 0.3s';
      setTimeout(function() {
        targetHeading.style.backgroundColor = '';
      }, 1500);
    } else {
      article.scrollTop = 0;
    }
  }

  // ========== 编辑器格式化工具栏 ==========
  function initFormattingToolbar() {
    var toolbarBtns = document.querySelectorAll('.flex.items-center.gap-1.px-4 button');
    toolbarBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var title = btn.getAttribute('title');
        if (title === '粗体') {
          applyFormat('bold');
        } else if (title === '斜体') {
          applyFormat('italic');
        } else if (title === '下划线') {
          applyFormat('underline');
        } else if (title === '删除线') {
          applyFormat('strikethrough');
        } else if (title === '标题') {
          applyFormat('heading');
        } else if (title === '列表') {
          applyFormat('list');
        } else if (title === '链接') {
          applyFormat('link');
        }
      });

      btn.addEventListener('mouseenter', function() {
        btn.style.background = 'var(--bg-overlay-l1)';
        var icons = btn.querySelectorAll('img');
        icons.forEach(function(i) { i.style.opacity = '1'; });
      });

      btn.addEventListener('mouseleave', function() {
        btn.style.background = 'transparent';
        var icons = btn.querySelectorAll('img');
        icons.forEach(function(i) { i.style.opacity = '0.6'; });
      });
    });
  }

  // 通用输入弹窗（替代原生 prompt）
  function showInputDialog(title, placeholder, onConfirm) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:9999; display:flex; align-items:center; justify-content:center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'background:var(--bg-base-secondary); border:1px solid var(--border-neutral-l2); border-radius:12px; padding:24px; width:420px; max-width:90%; box-shadow:0 8px 32px rgba(0,0,0,0.4); animation:fadeIn 0.2s ease-out;';

    dialog.innerHTML =
      '<h3 style="font-size:16px; color:var(--text-default); margin-bottom:16px;">' + escapeHtml(title) + '</h3>' +
      '<input type="text" placeholder="' + escapeHtml(placeholder) + '" style="width:100%; height:36px; padding:8px 12px; background:var(--bg-base-tertiary); color:var(--text-default); border:1px solid var(--border-neutral-l2); border-radius:8px; font-size:13px; outline:none; box-sizing:border-box;">' +
      '<div style="display:flex; gap:8px; justify-content:flex-end; margin-top:16px;">' +
      '<button class="cancel-btn" style="padding:6px 16px; height:32px; background:transparent; color:var(--text-secondary); border:1px solid var(--border-neutral-l1); border-radius:6px; cursor:pointer; font-size:13px;">取消</button>' +
      '<button class="confirm-btn" style="padding:6px 16px; height:32px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; cursor:pointer; font-size:13px;">确认</button>' +
      '</div>';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    var input = dialog.querySelector('input');
    input.focus();

    function closeDialog() {
      overlay.remove();
    }

    function confirm() {
      var value = input.value.trim();
      closeDialog();
      if (value && onConfirm) onConfirm(value);
    }

    dialog.querySelector('.cancel-btn').addEventListener('click', closeDialog);
    dialog.querySelector('.confirm-btn').addEventListener('click', confirm);
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') confirm();
      if (e.key === 'Escape') closeDialog();
    });
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeDialog();
    });
  }

  function applyFormat(type) {
    var article = document.querySelector('article');
    if (!article) return;

    var selection = window.getSelection();
    var selectedText = selection.toString();

    if (type === 'bold') {
      if (selectedText) {
        wrapSelection('<strong>', '</strong>', selection);
        showNotification('已应用粗体格式', 'info');
      } else {
        insertAtCursor('<strong>粗体文本</strong>');
        showNotification('已插入粗体格式', 'info');
      }
    } else if (type === 'italic') {
      if (selectedText) {
        wrapSelection('<em>', '</em>', selection);
        showNotification('已应用斜体格式', 'info');
      } else {
        insertAtCursor('<em>斜体文本</em>');
        showNotification('已插入斜体格式', 'info');
      }
    } else if (type === 'underline') {
      if (selectedText) {
        wrapSelection('<u>', '</u>', selection);
        showNotification('已应用下划线格式', 'info');
      } else {
        insertAtCursor('<u>下划线文本</u>');
        showNotification('已插入下划线格式', 'info');
      }
    } else if (type === 'strikethrough') {
      if (selectedText) {
        wrapSelection('<s>', '</s>', selection);
        showNotification('已应用删除线格式', 'info');
      } else {
        insertAtCursor('<s>删除线文本</s>');
        showNotification('已插入删除线格式', 'info');
      }
    } else if (type === 'heading') {
      insertAtCursor('<h3 style="font-size: var(--heading-sm-font-size); font-weight: 600; color: var(--text-default); margin-top: 24px; margin-bottom: 16px;">标题文本</h3>');
      showNotification('已插入标题', 'info');
    } else if (type === 'list') {
      insertAtCursor('<ul style="margin-left: 24px; margin-bottom: 24px; list-style-type: disc;"><li>列表项一</li><li>列表项二</li></ul>');
      showNotification('已插入列表', 'info');
    } else if (type === 'link') {
      // 保存当前选区（弹窗会令选区丢失，回调中需恢复）
      var savedRange = null;
      if (selectedText && selection.rangeCount > 0) {
        savedRange = selection.getRangeAt(0).cloneRange();
      }
      showInputDialog('插入链接', '请输入链接地址（例如：https://example.com）', function(url) {
        if (savedRange) {
          selection.removeAllRanges();
          selection.addRange(savedRange);
          wrapSelection('<a href="' + url + '" style="color: var(--icon-brand); text-decoration: underline;">', '</a>', selection);
        } else {
          insertAtCursor('<a href="' + url + '" style="color: var(--icon-brand); text-decoration: underline;">链接文本</a>');
        }
        showNotification('链接已插入', 'info');
      });
    }
  }

  function wrapSelection(openingTag, closingTag, selection) {
    var range = selection.getRangeAt(0);
    var selectedContent = range.extractContents();
    var wrapper = document.createElement('span');
    wrapper.innerHTML = openingTag + selectedContent.textContent + closingTag;
    range.insertNode(wrapper.firstChild);
    selection.removeAllRanges();
  }

  function insertAtCursor(html) {
    var article = document.querySelector('article');
    if (!article) return;

    var selection = window.getSelection();
    if (selection.rangeCount > 0) {
      var range = selection.getRangeAt(0);
      range.deleteContents();
      var div = document.createElement('div');
      div.innerHTML = html;
      var fragment = document.createDocumentFragment();
      while (div.firstChild) {
        fragment.appendChild(div.firstChild);
      }
      range.insertNode(fragment);
      selection.removeAllRanges();
    } else {
      article.innerHTML += html;
    }
  }

  // ========== 通知中心 ==========
  var notificationsData = [
    { id: 1, icon: 'sparkles.32f08c.svg', title: 'AI 创作建议已生成', time: '3分钟前', color: 'var(--icon-brand)' },
    { id: 2, icon: 'check-circle.33c192.svg', title: '作品已自动保存', time: '10分钟前', color: 'var(--icon-brand)' },
    { id: 3, icon: 'clock.svg', title: '今日写作目标已完成', time: '今天 09:30', color: 'var(--text-tertiary)' },
    { id: 4, icon: 'zap.svg', title: '新功能上线：AI 对话生成', time: '昨天', color: 'var(--icon-brand)' },
    { id: 5, icon: 'info.svg', title: '系统维护通知：今晚 22:00-23:00', time: '2天前', color: 'var(--text-tertiary)' }
  ];

  function initNotificationCenter() {
    var bellIcons = document.querySelectorAll('img[src*="bell.svg"]');
    bellIcons.forEach(function(bell) {
      bell.addEventListener('click', function(e) {
        e.stopPropagation();
        showNotificationPanel();
      });

      bell.addEventListener('mouseenter', function() {
        bell.style.opacity = '1';
      });

      bell.addEventListener('mouseleave', function() {
        bell.style.opacity = '0.6';
      });
    });
  }

  function showNotificationPanel() {
    var existingPanel = document.getElementById('notification-panel');
    if (existingPanel) {
      existingPanel.remove();
      return;
    }

    var panel = document.createElement('div');
    panel.id = 'notification-panel';
    panel.style.cssText = 'position:fixed; top:72px; right:24px; width:360px; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.4); z-index:1000; padding:16px; animation: slideDown 0.2s ease-out;';

    var notificationsHtml = '';
    notificationsData.forEach(function(notification) {
      notificationsHtml +=
        '<div class="notification-item" style="padding:12px; background:var(--bg-overlay-l1); border-radius:8px; margin-bottom:8px; cursor:pointer; transition: background 0.15s;">' +
        '<div style="display:flex; items-center; gap:8px;">' +
        '<img src="../assets/icons/dl-builtin-trae/' + notification.icon + '" width="16" height="16" alt="" style="color:' + notification.color + ';">' +
        '<div class="flex-1 min-w-0">' +
        '<div style="font-size:13px; color:var(--text-default);">';
      if (notification.id === 1) {
        notificationsHtml += '<span style="padding:1px 4px; background:var(--bg-brand); color:var(--text-onbrand); font-size:10px; border-radius:3px; margin-right:4px;">新</span>';
      }
      notificationsHtml += notification.title + '</div>' +
        '<div style="font-size:11px; color:var(--text-tertiary); margin-top:2px;">' + notification.time + '</div>' +
        '</div>' +
        '</div>' +
        '</div>';
    });

    panel.innerHTML =
      '<div style="display:flex; items-center; justify-content:space-between; margin-bottom:16px;">' +
      '<h3 style="font-size:14px; font-weight:600; color:var(--text-default);">通知中心</h3>' +
      '<div style="display:flex; items-center; gap:8px;">' +
      '<span style="font-size:11px; color:var(--text-tertiary);">' + notificationsData.length + ' 条</span>' +
      '<img src="../assets/icons/dl-builtin-trae/x.svg" width="16" height="16" alt="关闭" class="cursor-pointer opacity-50" id="close-notification" style="margin-left:8px;">' +
      '</div>' +
      '</div>' +
      '<div style="max-height:360px; overflow-y:auto; padding-right:4px;">' +
      notificationsHtml +
      '</div>';

    document.body.appendChild(panel);

    var styleSheet = document.createElement('style');
    styleSheet.textContent = `
      .notification-item:hover {
        background: var(--bg-overlay-l2) !important;
      }
    `;
    document.head.appendChild(styleSheet);

    document.getElementById('close-notification').addEventListener('click', function() {
      panel.remove();
    });

    var notificationItems = panel.querySelectorAll('.notification-item');
    notificationItems.forEach(function(item) {
      item.addEventListener('click', function() {
        var title = item.querySelector('div div:first-child').textContent.trim();
        showNotification('已查看: ' + title, 'info');
        item.style.background = 'var(--bg-overlay-l3)';
        item.style.opacity = '0.7';
      });
    });

    document.addEventListener('click', function(e) {
      if (!panel.contains(e.target) && !e.target.src) {
        panel.remove();
      }
    });
  }

  // ========== 设置按钮 ==========
  function initSettings() {
    var settingsBtn = document.querySelector('[data-dom-id="nav-settings"]');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        showSettingsPanel();
      });

      settingsBtn.addEventListener('mouseenter', function() {
        settingsBtn.style.color = 'var(--text-default)';
        var icon = settingsBtn.querySelector('img');
        if (icon) icon.style.opacity = '1';
      });

      settingsBtn.addEventListener('mouseleave', function() {
        settingsBtn.style.color = 'var(--text-tertiary)';
        var icon = settingsBtn.querySelector('img');
        if (icon) icon.style.opacity = '0.5';
      });
    }

    // 检查更新按钮
    var updateBtn = document.getElementById('check-update-btn');
    if (updateBtn) {
      updateBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (window.autoUpdate && window.autoUpdate.checkForUpdates) {
          window.autoUpdate.checkForUpdates();
          showNotification('正在检查更新...', 'info');
        } else {
          showNotification('当前为网页版，请下载桌面版使用自动更新功能', 'info');
        }
      });

      updateBtn.addEventListener('mouseenter', function() {
        updateBtn.style.color = 'var(--text-default)';
        var icon = updateBtn.querySelector('img');
        if (icon) icon.style.opacity = '1';
      });

      updateBtn.addEventListener('mouseleave', function() {
        updateBtn.style.color = 'var(--text-tertiary)';
        var icon = updateBtn.querySelector('img');
        if (icon) icon.style.opacity = '0.5';
      });
    }
  }

  function showSettingsPanel() {
    var existingPanel = document.getElementById('settings-panel');
    if (existingPanel) {
      existingPanel.remove();
      return;
    }

    var panel = document.createElement('div');
    panel.id = 'settings-panel';
    panel.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); width:480px; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.4); z-index:1000; padding:24px; animation: fadeInCenter 0.2s ease-out;';

    panel.innerHTML =
      '<div style="display:flex; items-center; justify-content:space-between; margin-bottom:20px;">' +
      '<h3 style="font-size:16px; font-weight:600; color:var(--text-default);">偏好设置</h3>' +
      '<img src="../assets/icons/dl-builtin-trae/x.svg" width="16" height="16" alt="关闭" class="cursor-pointer opacity-50" id="close-settings">' +
      '</div>' +
      '<div style="display:flex; flex-direction:column; gap:20px;">' +
      '<div>' +
      '<label style="font-size:13px; color:var(--text-secondary); margin-bottom:8px; display:block;">主题</label>' +
      '<div style="display:flex; gap:8px;">' +
      '<button class="theme-btn selected" data-theme="dark" style="padding:8px 16px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; font-size:13px;">深色</button>' +
      '<button class="theme-btn" data-theme="light" style="padding:8px 16px; background:var(--bg-overlay-l1); color:var(--text-secondary); border:1px solid var(--border-neutral-l1); border-radius:6px; font-size:13px;">浅色</button>' +
      '</div>' +
      '</div>' +
      '<div>' +
      '<label style="font-size:13px; color:var(--text-secondary); margin-bottom:8px; display:block;">字体大小</label>' +
      '<div style="display:flex; gap:8px;">' +
      '<button class="font-size-btn" data-size="small" style="padding:8px 16px; background:var(--bg-overlay-l1); color:var(--text-secondary); border:1px solid var(--border-neutral-l1); border-radius:6px; font-size:12px;">小</button>' +
      '<button class="font-size-btn selected" data-size="medium" style="padding:8px 16px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; font-size:13px;">中</button>' +
      '<button class="font-size-btn" data-size="large" style="padding:8px 16px; background:var(--bg-overlay-l1); color:var(--text-secondary); border:1px solid var(--border-neutral-l1); border-radius:6px; font-size:14px;">大</button>' +
      '</div>' +
      '</div>' +
      '<div>' +
      '<label style="font-size:13px; color:var(--text-secondary); margin-bottom:8px; display:block;">写作模式</label>' +
      '<div style="display:flex; gap:8px;">' +
      '<button class="mode-btn selected" data-mode="normal" style="padding:8px 16px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; font-size:13px;">普通模式</button>' +
      '<button class="mode-btn" data-mode="focus" style="padding:8px 16px; background:var(--bg-overlay-l1); color:var(--text-secondary); border:1px solid var(--border-neutral-l1); border-radius:6px; font-size:13px;">专注模式</button>' +
      '</div>' +
      '</div>' +
      '<div>' +
      '<label style="font-size:13px; color:var(--text-secondary); margin-bottom:8px; display:block;">自动保存</label>' +
      '<div style="display:flex; items-center; gap:8px;">' +
      '<span style="font-size:13px; color:var(--text-default);">开启</span>' +
      '<label class="toggle-switch" style="width:44px; height:24px; background:var(--bg-overlay-l2); border-radius:12px; position:relative; cursor:pointer;">' +
      '<input type="checkbox" checked style="display:none;">' +
      '<div style="width:20px; height:20px; background:var(--bg-brand); border-radius:50%; position:absolute; top:2px; left:2px; transition:left 0.2s;"></div>' +
      '</label>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div style="display:flex; justify-content:flex-end; gap:8px; margin-top:24px;">' +
      '<button id="cancel-settings" style="padding:8px 16px; background:transparent; color:var(--text-secondary); border:1px solid var(--border-neutral-l1); border-radius:6px; font-size:13px;">取消</button>' +
      '<button id="save-settings" style="padding:8px 16px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; font-size:13px;">保存</button>' +
      '</div>';

    document.body.appendChild(panel);

    var styleSheet = document.createElement('style');
    styleSheet.textContent = `
      .toggle-switch input:checked + div { left: 22px; }
    `;
    document.head.appendChild(styleSheet);

    var themeBtns = panel.querySelectorAll('.theme-btn');
    themeBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        themeBtns.forEach(function(b) {
          b.style.background = 'var(--bg-overlay-l1)';
          b.style.color = 'var(--text-secondary)';
          b.style.border = '1px solid var(--border-neutral-l1)';
          b.classList.remove('selected');
        });
        btn.style.background = 'var(--bg-brand)';
        btn.style.color = 'var(--text-onbrand)';
        btn.style.border = 'none';
        btn.classList.add('selected');
      });
    });

    var fontSizeBtns = panel.querySelectorAll('.font-size-btn');
    fontSizeBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        fontSizeBtns.forEach(function(b) {
          b.style.background = 'var(--bg-overlay-l1)';
          b.style.color = 'var(--text-secondary)';
          b.style.border = '1px solid var(--border-neutral-l1)';
          b.classList.remove('selected');
        });
        btn.style.background = 'var(--bg-brand)';
        btn.style.color = 'var(--text-onbrand)';
        btn.style.border = 'none';
        btn.classList.add('selected');

        var size = btn.getAttribute('data-size');
        applyFontSize(size);
      });
    });

    var modeBtns = panel.querySelectorAll('.mode-btn');
    modeBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        modeBtns.forEach(function(b) {
          b.style.background = 'var(--bg-overlay-l1)';
          b.style.color = 'var(--text-secondary)';
          b.style.border = '1px solid var(--border-neutral-l1)';
          b.classList.remove('selected');
        });
        btn.style.background = 'var(--bg-brand)';
        btn.style.color = 'var(--text-onbrand)';
        btn.style.border = 'none';
        btn.classList.add('selected');

        var mode = btn.getAttribute('data-mode');
        applyWritingMode(mode);
      });
    });

    var toggleSwitch = panel.querySelector('.toggle-switch');
    if (toggleSwitch) {
      toggleSwitch.addEventListener('click', function() {
        var input = toggleSwitch.querySelector('input');
        if (input) input.checked = !input.checked;
      });
    }

    document.getElementById('close-settings').addEventListener('click', function() { panel.remove(); });
    document.getElementById('cancel-settings').addEventListener('click', function() { panel.remove(); });
    document.getElementById('save-settings').addEventListener('click', function() {
      showNotification('设置已保存', 'info');
      panel.remove();
    });
  }

  function applyFontSize(size) {
    var article = document.querySelector('article');
    if (!article) return;

    if (size === 'small') {
      article.style.fontSize = '14px';
      article.style.lineHeight = '1.7';
    } else if (size === 'medium') {
      article.style.fontSize = '16px';
      article.style.lineHeight = '1.9';
    } else if (size === 'large') {
      article.style.fontSize = '18px';
      article.style.lineHeight = '2.0';
    }
    showNotification('字体大小已调整', 'info');
  }

  function applyWritingMode(mode) {
    var mainContent = document.querySelector('#main-content');
    var leftPanel = document.querySelector('aside:first-of-type');
    var rightPanel = document.querySelector('aside:last-of-type');

    if (mode === 'focus') {
      if (leftPanel) leftPanel.style.display = 'none';
      if (rightPanel) rightPanel.style.display = 'none';
      showNotification('已切换到专注模式', 'info');
    } else {
      if (leftPanel) leftPanel.style.display = '';
      if (rightPanel) rightPanel.style.display = '';
      showNotification('已切换到普通模式', 'info');
    }
  }

  // ========== 创作者菜单 ==========
  function initCreatorMenu() {
    var menuItems = document.querySelectorAll('#creator-popup .flex.items-center.gap-2\\.5');
    if (menuItems.length === 0) {
      menuItems = document.querySelectorAll('#creator-popup .flex.items-center.gap-2\\.5, #creator-popup [class*="flex items-center"]');
    }

    menuItems.forEach(function(item) {
      item.addEventListener('click', function() {
        var spanEl = item.querySelector('span');
        if (!spanEl) return;
        var text = spanEl.textContent.trim();

        // 关闭弹窗
        var creatorPopup = document.getElementById('creator-popup');
        if (creatorPopup) creatorPopup.classList.add('hidden');

        if (text === '退出登录') {
          showConfirmDialog('确定要退出登录吗？', function() {
            showNotification('已退出登录', 'info');
            setTimeout(function() {
              window.location.href = 'editor.html';
            }, 1000);
          });
        } else if (text === '升级 Pro') {
          showProDialog();
        } else if (text === '个人资料') {
          showProfileDialog();
        } else if (text === '偏好设置') {
          showSettingsPanel();
        } else if (text === '帮助与反馈') {
          showHelpDialog();
        }
      });

      item.addEventListener('mouseenter', function() {
        item.style.background = 'var(--bg-overlay-l1)';
        item.style.color = 'var(--text-default)';
      });

      item.addEventListener('mouseleave', function() {
        item.style.background = 'transparent';
        item.style.color = 'var(--text-secondary)';
      });
    });
  }

  function showProfileDialog() {
    var existing = document.getElementById('profile-dialog-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'profile-dialog-overlay';
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:1000; display:flex; align-items:center; justify-content:center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'width:420px; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.4); padding:24px; animation:fadeIn 0.2s ease-out;';

    dialog.innerHTML =
      '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">' +
      '<h3 style="font-size:16px; font-weight:600; color:var(--text-default);">个人资料</h3>' +
      '<img src="../assets/icons/dl-builtin-trae/x.svg" width="16" height="16" alt="关闭" class="cursor-pointer opacity-50" id="close-profile">' +
      '</div>' +
      '<div style="display:flex; flex-direction:column; align-items:center; gap:12px; margin-bottom:24px;">' +
      '<div style="width:64px; height:64px; border-radius:50%; background:var(--bg-brand); color:var(--text-onbrand); display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:600;">创</div>' +
      '<div style="text-align:center;">' +
      '<div style="font-size:15px; font-weight:500; color:var(--text-default);">创作者</div>' +
      '<div style="font-size:12px; color:var(--text-tertiary); margin-top:2px;">creator@example.com</div>' +
      '</div>' +
      '</div>' +
      '<div style="display:flex; flex-direction:column; gap:12px;">' +
      '<div style="display:flex; justify-content:space-between; padding:10px 12px; background:var(--bg-overlay-l1); border-radius:8px;">' +
      '<span style="font-size:13px; color:var(--text-secondary);">作品总数</span>' +
      '<span style="font-size:13px; color:var(--text-default); font-weight:500;">12 部</span>' +
      '</div>' +
      '<div style="display:flex; justify-content:space-between; padding:10px 12px; background:var(--bg-overlay-l1); border-radius:8px;">' +
      '<span style="font-size:13px; color:var(--text-secondary);">总字数</span>' +
      '<span style="font-size:13px; color:var(--text-default); font-weight:500;">58.3 万</span>' +
      '</div>' +
      '<div style="display:flex; justify-content:space-between; padding:10px 12px; background:var(--bg-overlay-l1); border-radius:8px;">' +
      '<span style="font-size:13px; color:var(--text-secondary);">连续写作</span>' +
      '<span style="font-size:13px; color:var(--text-default); font-weight:500;">7 天</span>' +
      '</div>' +
      '<div style="display:flex; justify-content:space-between; padding:10px 12px; background:var(--bg-overlay-l1); border-radius:8px;">' +
      '<span style="font-size:13px; color:var(--text-secondary);">账户类型</span>' +
      '<span style="font-size:13px; color:var(--text-brand); font-weight:500;">免费版</span>' +
      '</div>' +
      '</div>';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });
    document.getElementById('close-profile').addEventListener('click', function() { overlay.remove(); });
  }

  function showProDialog() {
    var existing = document.getElementById('pro-dialog-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'pro-dialog-overlay';
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:1000; display:flex; align-items:center; justify-content:center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'width:460px; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.4); padding:24px; animation:fadeIn 0.2s ease-out;';

    dialog.innerHTML =
      '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">' +
      '<div style="display:flex; align-items:center; gap:8px;">' +
      '<img src="../assets/icons/dl-builtin-trae/zap.svg" width="18" height="18" alt="" style="color:var(--icon-brand);">' +
      '<h3 style="font-size:16px; font-weight:600; color:var(--text-default);">升级 Pro</h3>' +
      '</div>' +
      '<img src="../assets/icons/dl-builtin-trae/x.svg" width="16" height="16" alt="关闭" class="cursor-pointer opacity-50" id="close-pro">' +
      '</div>' +
      '<div style="text-align:center; margin-bottom:20px;">' +
      '<div style="font-size:32px; font-weight:700; color:var(--text-default);">29<span style="font-size:14px; color:var(--text-tertiary); font-weight:400;"> 元/月</span></div>' +
      '<div style="font-size:12px; color:var(--text-tertiary); margin-top:4px;">年付立减 30%</div>' +
      '</div>' +
      '<div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">' +
      '<div style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-secondary);">' +
      '<img src="../assets/icons/dl-builtin-trae/check-circle.33c192.svg" width="14" height="14" alt="" style="color:var(--icon-brand);">' +
      '<span>无限次 AI 续写、润色、对话生成</span>' +
      '</div>' +
      '<div style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-secondary);">' +
      '<img src="../assets/icons/dl-builtin-trae/check-circle.33c192.svg" width="14" height="14" alt="" style="color:var(--icon-brand);">' +
      '<span>支持所有 AI 模型（GPT-4o、Claude、DeepSeek）</span>' +
      '</div>' +
      '<div style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-secondary);">' +
      '<img src="../assets/icons/dl-builtin-trae/check-circle.33c192.svg" width="14" height="14" alt="" style="color:var(--icon-brand);">' +
      '<span>无限素材库存储</span>' +
      '</div>' +
      '<div style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-secondary);">' +
      '<img src="../assets/icons/dl-builtin-trae/check-circle.33c192.svg" width="14" height="14" alt="" style="color:var(--icon-brand);">' +
      '<span>专属写作数据分析</span>' +
      '</div>' +
      '<div style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-secondary);">' +
      '<img src="../assets/icons/dl-builtin-trae/check-circle.33c192.svg" width="14" height="14" alt="" style="color:var(--icon-brand);">' +
      '<span>优先客服支持</span>' +
      '</div>' +
      '</div>' +
      '<button id="upgrade-btn" style="width:100%; height:40px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:8px; font-size:14px; font-weight:500; cursor:pointer;">立即升级</button>';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });
    document.getElementById('close-pro').addEventListener('click', function() { overlay.remove(); });
    document.getElementById('upgrade-btn').addEventListener('click', function() {
      showNotification('支付功能即将上线，敬请期待', 'info');
      overlay.remove();
    });
  }

  function showHelpDialog() {
    var existing = document.getElementById('help-dialog-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'help-dialog-overlay';
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:1000; display:flex; align-items:center; justify-content:center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'width:460px; max-height:80vh; overflow-y:auto; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.4); padding:24px; animation:fadeIn 0.2s ease-out;';

    dialog.innerHTML =
      '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">' +
      '<h3 style="font-size:16px; font-weight:600; color:var(--text-default);">帮助与反馈</h3>' +
      '<img src="../assets/icons/dl-builtin-trae/x.svg" width="16" height="16" alt="关闭" class="cursor-pointer opacity-50" id="close-help">' +
      '</div>' +
      '<div style="display:flex; flex-direction:column; gap:16px;">' +
      '<div>' +
      '<div style="font-size:13px; font-weight:500; color:var(--text-default); margin-bottom:8px;">常见问题</div>' +
      '<div style="display:flex; flex-direction:column; gap:8px;">' +
      '<div class="help-faq" style="padding:10px 12px; background:var(--bg-overlay-l1); border-radius:8px; cursor:pointer; font-size:12px; color:var(--text-secondary);">如何配置 AI 模型的 API Key？</div>' +
      '<div class="help-faq" style="padding:10px 12px; background:var(--bg-overlay-l1); border-radius:8px; cursor:pointer; font-size:12px; color:var(--text-secondary);">支持哪些 AI 模型？</div>' +
      '<div class="help-faq" style="padding:10px 12px; background:var(--bg-overlay-l1); border-radius:8px; cursor:pointer; font-size:12px; color:var(--text-secondary);">如何使用续写和润色功能？</div>' +
      '<div class="help-faq" style="padding:10px 12px; background:var(--bg-overlay-l1); border-radius:8px; cursor:pointer; font-size:12px; color:var(--text-secondary);">素材库支持哪些类型？</div>' +
      '</div>' +
      '</div>' +
      '<div>' +
      '<div style="font-size:13px; font-weight:500; color:var(--text-default); margin-bottom:8px;">反馈建议</div>' +
      '<textarea id="feedback-text" placeholder="请输入你的反馈或建议..." style="width:100%; height:80px; padding:10px 12px; background:var(--bg-overlay-l1); border:1px solid var(--border-neutral-l1); border-radius:8px; color:var(--text-default); font-size:13px; resize:none; outline:none; box-sizing:border-box;"></textarea>' +
      '<button id="submit-feedback" style="margin-top:8px; padding:8px 16px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; font-size:13px; cursor:pointer;">提交反馈</button>' +
      '</div>' +
      '<div style="padding:12px; background:var(--bg-overlay-l1); border-radius:8px;">' +
      '<div style="font-size:12px; color:var(--text-tertiary); margin-bottom:4px;">联系方式</div>' +
      '<div style="font-size:12px; color:var(--text-secondary);">邮箱：support@aiwriting.com</div>' +
      '</div>' +
      '</div>';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });
    document.getElementById('close-help').addEventListener('click', function() { overlay.remove(); });

    var faqItems = dialog.querySelectorAll('.help-faq');
    faqItems.forEach(function(item) {
      item.addEventListener('click', function() {
        var q = item.textContent;
        var answers = {
          '如何配置 AI 模型的 API Key？': '点击左下角的模型名称，在弹出的面板中选择"添加自定义 API"，填写模型名称、API 地址和 API Key 即可。支持 OpenAI、Anthropic、DeepSeek 等平台。',
          '支持哪些 AI 模型？': '内置支持 GPT-4o、Claude 4 Sonnet、DeepSeek R1、Qwen Max。也支持任何 OpenAI 兼容接口的自定义模型。使用前需配置对应平台的 API Key。',
          '如何使用续写和润色功能？': '在编辑器页面，上方工具栏有"续写下一段""润色全文""生成对话""检查一致性"四个按钮。点击即可调用 AI 处理当前编辑器中的内容，结果会显示在右侧 AI 对话面板中。',
          '素材库支持哪些类型？': '素材库支持情节模板、人物设定、世界观、场景描写、对话风格五大类。可以点击"AI 生成素材"自动生成，也可以手动添加。每条素材支持标签筛选和搜索。'
        };
        item.textContent = q + '\n\n' + (answers[q] || '暂无详细说明');
        item.style.whiteSpace = 'pre-wrap';
        item.style.color = 'var(--text-default)';
        item.addEventListener('click', function() {
          item.textContent = q;
          item.style.whiteSpace = 'normal';
          item.style.color = 'var(--text-secondary)';
        }, { once: true });
      });
    });

    document.getElementById('submit-feedback').addEventListener('click', function() {
      var text = document.getElementById('feedback-text').value.trim();
      if (!text) {
        showNotification('请输入反馈内容', 'warn');
        return;
      }
      showNotification('反馈已提交，感谢你的支持', 'info');
      document.getElementById('feedback-text').value = '';
      overlay.remove();
    });
  }

  function showConfirmDialog(message, onConfirm) {
    var existing = document.getElementById('confirm-dialog-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'confirm-dialog-overlay';
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:1000; display:flex; align-items:center; justify-content:center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'width:360px; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.4); padding:24px; animation:fadeIn 0.2s ease-out;';

    dialog.innerHTML =
      '<div style="font-size:14px; color:var(--text-default); margin-bottom:20px; text-align:center;">' + message + '</div>' +
      '<div style="display:flex; gap:8px; justify-content:center;">' +
      '<button id="confirm-cancel" style="padding:8px 20px; background:transparent; color:var(--text-secondary); border:1px solid var(--border-neutral-l1); border-radius:6px; font-size:13px; cursor:pointer;">取消</button>' +
      '<button id="confirm-ok" style="padding:8px 20px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; font-size:13px; cursor:pointer;">确定</button>' +
      '</div>';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });
    document.getElementById('confirm-cancel').addEventListener('click', function() { overlay.remove(); });
    document.getElementById('confirm-ok').addEventListener('click', function() {
      overlay.remove();
      if (onConfirm) onConfirm();
    });
  }

  // ========== AI 助手聊天（编辑器右侧面板）==========
  function initComposer() {
    var input = document.getElementById('ai-input-textarea');
    var sendBtn = document.getElementById('ai-send-btn');
    var clearBtn = document.getElementById('clear-chat-btn');
    var stopBtn = document.getElementById('stop-generate-btn');

    if (!input) return;

    // 清除对话历史
    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        showConfirmDialog('确定清空所有 AI 对话历史吗？', function() {
          chatHistory.length = 0;
          var messagesContainer = document.getElementById('chat-messages-container');
          if (messagesContainer) {
            // 保留欢迎消息
            var welcomeMsg = messagesContainer.querySelector('.flex.gap-2');
            messagesContainer.innerHTML = '';
            if (welcomeMsg) messagesContainer.appendChild(welcomeMsg);
          }
          showNotification('对话历史已清空', 'info');
        });
      });
    }

    // 停止生成
    if (stopBtn) {
      stopBtn.addEventListener('click', function() {
        isGenerating = false;
        updateAIStatus('已停止');
        stopBtn.classList.add('hidden');
      });
    }

    // 发送消息
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    if (sendBtn) {
      sendBtn.addEventListener('click', sendMessage);
    }

    function sendMessage() {
      if (isGenerating) return;
      var content = input.value.trim();
      if (!content) return;

      var messagesContainer = document.getElementById('chat-messages-container');
      if (!messagesContainer) return;

      // 意图识别
      var detectedIntent = detectUserIntent(content);
      if (detectedIntent) {
        handleDetectedIntent(detectedIntent, content);
        input.value = '';
        return;
      }

      // 普通对话
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

      var context = getWorkContext();
      var editorText = getEditorText();
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
          updateAIStatus('就绪');
          if (stopBtn) stopBtn.classList.add('hidden');
        },
        onError: function(err) {
          aiContent.innerHTML = '<span style="color: #f87171;">调用失败: ' + escapeHtml(err.message) + '</span>';
          isGenerating = false;
          updateAIStatus('就绪');
          if (stopBtn) stopBtn.classList.add('hidden');
        }
      });
    }

    // 插入选中内容按钮
    var insertBtn = document.querySelector('.ds-composer__icon-btn[title="插入选中内容"]');
    if (insertBtn) {
      insertBtn.addEventListener('click', function() {
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
  }

  // 意图识别
  function detectUserIntent(message) {
    var lowerMsg = message.toLowerCase();

    var intentPatterns = [
      { patterns: ['续写', '接着写', '继续写', '写下去', '接着', '继续'], intent: 'continueWriting' },
      { patterns: ['润色', '优化', '修改', '改进', '美化'], intent: 'polish' },
      { patterns: ['对话', '生成对话', '写对话', '添加对话'], intent: 'generateDialogue' },
      { patterns: ['卡文', '写不出来', '卡壳', '卡住了', '没思路', '不知道怎么写'], intent: 'diagnose' },
      { patterns: ['排版', '格式化', '格式'], intent: 'format' },
      { patterns: ['扩写', '扩展', '展开', '详细'], intent: 'expandText' },
      { patterns: ['精简', '压缩', '缩短', '简洁'], intent: 'condenseText' },
      { patterns: ['检查', '一致性', '逻辑问题', '矛盾'], intent: 'checkConsistency' },
      { patterns: ['自动写作', '批量写', '大量写', '写完'], intent: 'autoWrite' }
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

  // 处理识别到的意图
  function handleDetectedIntent(detected, message) {
    var editorText = getEditorText();
    var selection = window.getSelection();
    var selectedText = selection ? selection.toString().trim() : '';

    // 查找对应的按钮配置
    var allButtons = DEFAULT_QUICK_BUTTONS.concat(EXPANDED_BUTTONS);
    var btnConfig = null;

    for (var i = 0; i < allButtons.length; i++) {
      if (allButtons[i].action === detected.intent) {
        btnConfig = allButtons[i];
        break;
      }
    }

    if (!btnConfig) return;

    // 显示识别提示
    var messagesContainer = document.getElementById('chat-messages-container');
    if (messagesContainer) {
      var intentMsg = createMessageEl('系统', '识别为：' + btnConfig.label + '，正在处理...', 'user');
      intentMsg.querySelector('.msg-content').style.background = 'var(--bg-overlay-l2)';
      intentMsg.querySelector('.msg-content').style.color = 'var(--text-secondary)';
      intentMsg.querySelector('.msg-content').style.fontSize = '12px';
      messagesContainer.appendChild(intentMsg);
    }

    // 根据意图执行操作
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

  // 更新 AI 状态栏
  function updateAIStatus(status) {
    var statusText = document.getElementById('ai-status-text');
    if (statusText) {
      statusText.textContent = status;
    }
  }

  // 格式化 AI 响应（支持简单的 Markdown）
  function formatAIResponse(text) {
    if (!text) return '';

    // 转义 HTML
    var result = escapeHtml(text);

    // 处理换行
    result = result.replace(/\n/g, '<br>');

    // 处理加粗
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // 处理斜体
    result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // 处理标题（简化）
    result = result.replace(/^### (.+)$/gm, '<h4 style="margin:8px 0 4px;font-size:14px;font-weight:600;">$1</h4>');
    result = result.replace(/^## (.+)$/gm, '<h3 style="margin:12px 0 6px;font-size:15px;font-weight:600;">$1</h3>');
    result = result.replace(/^# (.+)$/gm, '<h2 style="margin:12px 0 8px;font-size:16px;font-weight:600;">$1</h2>');

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

  // ========== 设定管理面板 ==========
  function initMemoryPanel() {
    // 在右侧面板 AI 对话区域上方添加"设定管理"按钮
    var rightPanel = document.querySelector('aside[style*="width: 340px"]');
    if (!rightPanel) return;

    var panelHeader = rightPanel.querySelector('.flex.items-center.justify-between.px-4');
    if (!panelHeader) return;

    var memoryBtn = document.createElement('button');
    memoryBtn.id = 'memory-panel-btn';
    memoryBtn.style.cssText = 'padding:4px 10px; height:24px; background:var(--bg-overlay-l1); border:1px solid var(--border-neutral-l1); border-radius:6px; color:var(--text-secondary); font-size:11px; cursor:pointer; display:flex; align-items:center; gap:4px; transition:all 0.15s;';
    memoryBtn.innerHTML = '<img src="../assets/icons/dl-builtin-trae/layers.svg" width="12" height="12" alt="" style="opacity:0.6;">设定管理';
    panelHeader.appendChild(memoryBtn);

    memoryBtn.addEventListener('mouseenter', function() {
      memoryBtn.style.borderColor = 'var(--border-neutral-l2)';
      memoryBtn.style.color = 'var(--text-default)';
    });
    memoryBtn.addEventListener('mouseleave', function() {
      memoryBtn.style.borderColor = 'var(--border-neutral-l1)';
      memoryBtn.style.color = 'var(--text-secondary)';
    });

    memoryBtn.addEventListener('click', function() {
      showMemoryPanel();
    });

    var viewOutlineLink = rightPanel.querySelector('a');
    if (viewOutlineLink) {
      viewOutlineLink.addEventListener('click', function(e) {
        e.preventDefault();
        var leftPanel = document.querySelector('aside[style*="width: 260px"]');
        if (leftPanel) {
          leftPanel.style.display = leftPanel.style.display === 'none' ? 'flex' : 'none';
          showNotification(leftPanel.style.display === 'flex' ? '大纲面板已显示' : '大纲面板已隐藏', 'info');
        }
      });
    }

    var sidebarToggle = rightPanel.querySelector('.flex.items-center.justify-center.w-6.h-6.cursor-pointer');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', function() {
        rightPanel.style.display = rightPanel.style.display === 'none' ? 'flex' : 'none';
        showNotification(rightPanel.style.display === 'flex' ? '右侧面板已显示' : '右侧面板已隐藏', 'info');
      });
    }
  }

  function showMemoryPanel() {
    var existing = document.getElementById('memory-panel-overlay');
    if (existing) { existing.remove(); return; }

    var memory = window.AIService.getMemory();

    var overlay = document.createElement('div');
    overlay.id = 'memory-panel-overlay';
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:1000; display:flex; align-items:center; justify-content:center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'width:580px; max-height:80vh; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.4); display:flex; flex-direction:column; animation:fadeIn 0.2s ease-out;';

    // Tab 按钮
    var tabs = ['角色设定簿', '世界观', '伏笔追踪', '全局摘要', '文风'];
    var tabBtnsHtml = '';
    tabs.forEach(function(tab, i) {
      tabBtnsHtml += '<button class="memory-tab-btn" data-tab="' + i + '" style="padding:8px 14px; background:' + (i === 0 ? 'var(--bg-overlay-l1)' : 'transparent') + '; color:' + (i === 0 ? 'var(--text-default)' : 'var(--text-tertiary)') + '; border:none; border-bottom:2px solid ' + (i === 0 ? 'var(--bg-brand)' : 'transparent') + '; font-size:13px; cursor:pointer; white-space:nowrap; transition:all 0.15s;">' + tab + '</button>';
    });

    // Tab 0: 角色设定簿
    var charactersHtml = '';
    if (memory.characters && memory.characters.length > 0) {
      memory.characters.forEach(function(c, idx) {
        charactersHtml +=
          '<div class="character-item" data-idx="' + idx + '" style="padding:12px; background:var(--bg-overlay-l1); border-radius:8px; margin-bottom:8px;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
          '<span style="font-size:14px; font-weight:500; color:var(--text-default);">' + escapeHtml(c.name || '未命名') + '</span>' +
          '<button class="remove-character-btn" data-name="' + escapeHtml(c.name || '') + '" style="padding:2px 8px; background:transparent; border:1px solid var(--border-neutral-l1); border-radius:4px; color:var(--text-tertiary); font-size:11px; cursor:pointer;">删除</button>' +
          '</div>' +
          '<div style="font-size:12px; color:var(--text-secondary); line-height:1.6;">' +
          (c.personality ? '<div><span style="color:var(--text-tertiary);">性格：</span>' + escapeHtml(c.personality) + '</div>' : '') +
          (c.speechStyle ? '<div><span style="color:var(--text-tertiary);">说话风格：</span>' + escapeHtml(c.speechStyle) + '</div>' : '') +
          '</div>' +
          '</div>';
      });
    } else {
      charactersHtml = '<div style="text-align:center; padding:32px 0; font-size:13px; color:var(--text-tertiary);">暂无角色，点击下方按钮添加</div>';
    }

    var tabContents = [
      // 0: 角色设定簿
      '<div class="memory-tab-content" data-tab="0" style="padding:16px; overflow-y:auto; flex:1;">' +
        charactersHtml +
        '<div style="display:flex; gap:8px; margin-top:12px;">' +
        '<button id="add-character-btn" style="padding:6px 14px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; font-size:12px; cursor:pointer;">添加角色</button>' +
        '<button id="extract-characters-btn" style="padding:6px 14px; background:transparent; color:var(--text-brand); border:1px solid var(--border-neutral-l1); border-radius:6px; font-size:12px; cursor:pointer;">从文本提取</button>' +
        '</div>' +
      '</div>',

      // 1: 世界观
      '<div class="memory-tab-content" data-tab="1" style="padding:16px; overflow-y:auto; flex:1;">' +
        '<textarea id="memory-world-settings" style="width:100%; min-height:200px; padding:10px 12px; background:var(--bg-overlay-l1); border:1px solid var(--border-neutral-l1); border-radius:8px; color:var(--text-default); font-size:13px; line-height:1.6; resize:vertical; outline:none; box-sizing:border-box;">' + escapeHtml(memory.worldSettings || '') + '</textarea>' +
        '<div style="display:flex; justify-content:flex-end; margin-top:8px;">' +
        '<button id="save-world-settings-btn" style="padding:6px 14px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; font-size:12px; cursor:pointer;">保存</button>' +
        '</div>' +
      '</div>',

      // 2: 伏笔追踪
      '<div class="memory-tab-content" data-tab="2" style="padding:16px; overflow-y:auto; flex:1;">' +
        (function() {
          var html = '';
          var unresolved = memory.foreshadowing ? memory.foreshadowing.filter(function(f) { return !f.resolved; }) : [];
          if (unresolved.length > 0) {
            unresolved.forEach(function(f) {
              html +=
                '<div style="padding:12px; background:var(--bg-overlay-l1); border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">' +
                '<div style="flex:1; font-size:13px; color:var(--text-default); line-height:1.5;">' + escapeHtml(f.description || '未描述') +
                (f.hint ? '<div style="font-size:11px; color:var(--text-tertiary); margin-top:4px;">提示：' + escapeHtml(f.hint) + '</div>' : '') +
                '</div>' +
                '<div style="display:flex; gap:4px; flex-shrink:0;">' +
                '<button class="resolve-foreshadowing-btn" data-id="' + escapeHtml(String(f.id)) + '" style="padding:4px 10px; background:transparent; border:1px solid var(--border-neutral-l1); border-radius:4px; color:var(--icon-brand); font-size:11px; cursor:pointer;">已解决</button>' +
                '<button class="remove-foreshadowing-btn" data-id="' + escapeHtml(String(f.id)) + '" style="padding:4px 10px; background:transparent; border:1px solid var(--border-neutral-l1); border-radius:4px; color:var(--text-tertiary); font-size:11px; cursor:pointer;">删除</button>' +
                '</div>' +
                '</div>';
            });
          } else {
            html = '<div style="text-align:center; padding:32px 0; font-size:13px; color:var(--text-tertiary);">暂无未解决的伏笔</div>';
          }
          return html;
        })() +
      '</div>',

      // 3: 全局摘要
      '<div class="memory-tab-content" data-tab="3" style="padding:16px; overflow-y:auto; flex:1;">' +
        '<div id="memory-summary-display" style="padding:12px; background:var(--bg-overlay-l1); border-radius:8px; font-size:13px; line-height:1.7; color:var(--text-default); white-space:pre-wrap; min-height:120px;">' + escapeHtml(memory.globalSummary || '暂无摘要') + '</div>' +
        '<div style="display:flex; justify-content:flex-end; margin-top:8px;">' +
        '<button id="ai-update-summary-btn" style="padding:6px 14px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; font-size:12px; cursor:pointer; display:flex; align-items:center; gap:4px;">' +
        '<img src="../assets/icons/dl-builtin-trae/sparkles.32f08c.svg" width="12" height="12" alt="">AI更新摘要</button>' +
        '</div>' +
      '</div>',

      // 4: 文风
      '<div class="memory-tab-content" data-tab="4" style="padding:16px; overflow-y:auto; flex:1;">' +
        '<textarea id="memory-style-notes" style="width:100%; min-height:200px; padding:10px 12px; background:var(--bg-overlay-l1); border:1px solid var(--border-neutral-l1); border-radius:8px; color:var(--text-default); font-size:13px; line-height:1.6; resize:vertical; outline:none; box-sizing:border-box;">' + escapeHtml(memory.styleNotes || '') + '</textarea>' +
        '<div style="display:flex; justify-content:flex-end; margin-top:8px;">' +
        '<button id="save-style-notes-btn" style="padding:6px 14px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; font-size:12px; cursor:pointer;">保存</button>' +
        '</div>' +
      '</div>'
    ];

    dialog.innerHTML =
      '<div style="display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--border-neutral-l1); flex-shrink:0;">' +
        '<h3 style="font-size:15px; font-weight:600; color:var(--text-default);">设定管理</h3>' +
        '<img src="../assets/icons/dl-builtin-trae/x.svg" width="16" height="16" alt="关闭" id="close-memory-panel" style="cursor:pointer; opacity:0.5;">' +
      '</div>' +
      '<div style="display:flex; gap:0; border-bottom:1px solid var(--border-neutral-l1); padding:0 16px; flex-shrink:0; overflow-x:auto;">' + tabBtnsHtml + '</div>' +
      tabContents.join('');

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // 关闭
    document.getElementById('close-memory-panel').addEventListener('click', function() { overlay.remove(); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

    // Tab 切换
    var tabBtns = dialog.querySelectorAll('.memory-tab-btn');
    tabBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var tabIdx = btn.getAttribute('data-tab');
        tabBtns.forEach(function(b) {
          b.style.background = 'transparent';
          b.style.color = 'var(--text-tertiary)';
          b.style.borderBottom = '2px solid transparent';
        });
        btn.style.background = 'var(--bg-overlay-l1)';
        btn.style.color = 'var(--text-default)';
        btn.style.borderBottom = '2px solid var(--bg-brand)';

        var contents = dialog.querySelectorAll('.memory-tab-content');
        contents.forEach(function(c) { c.style.display = 'none'; });
        var target = dialog.querySelector('.memory-tab-content[data-tab="' + tabIdx + '"]');
        if (target) target.style.display = '';
      });
    });

    // 角色设定簿：添加角色
    var addCharBtn = document.getElementById('add-character-btn');
    if (addCharBtn) {
      addCharBtn.addEventListener('click', function() {
        showAddCharacterDialog(function(character) {
          window.AIService.updateMemory('character', character);
          showNotification('角色 "' + character.name + '" 已添加', 'info');
          overlay.remove();
          showMemoryPanel(); // 刷新面板
        });
      });
    }

    // 角色设定簿：从文本提取
    var extractBtn = document.getElementById('extract-characters-btn');
    if (extractBtn) {
      extractBtn.addEventListener('click', function() {
        if (isGenerating) return;
        var editorText = getEditorText();
        if (!editorText) {
          showNotification('编辑器中没有内容', 'warn');
          return;
        }
        extractBtn.textContent = '提取中...';
        extractBtn.style.pointerEvents = 'none';

        var messages = window.AIService.PROMPTS.extractCharacters(editorText);
        window.AIService.chat(messages, {
          stream: false,
          temperature: 0.3,
          max_tokens: 2000,
          onDone: function(fullContent) {
            try {
              // 尝试解析 JSON
              var jsonStr = fullContent.trim();
              var match = jsonStr.match(/\[[\s\S]*\]/);
              if (match) jsonStr = match[0];
              var characters = JSON.parse(jsonStr);
              if (Array.isArray(characters)) {
                characters.forEach(function(c) {
                  if (c.name) window.AIService.updateMemory('character', c);
                });
                showNotification('已提取 ' + characters.length + ' 个角色', 'info');
              }
            } catch (e) {
              showNotification('角色提取结果解析失败，请手动添加', 'warn');
            }
            extractBtn.textContent = '从文本提取';
            extractBtn.style.pointerEvents = '';
            overlay.remove();
            showMemoryPanel();
          },
          onError: function(err) {
            showNotification('提取失败: ' + err.message, 'error');
            extractBtn.textContent = '从文本提取';
            extractBtn.style.pointerEvents = '';
          }
        });
      });
    }

    // 角色设定簿：删除角色
    var removeBtns = dialog.querySelectorAll('.remove-character-btn');
    removeBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var name = btn.getAttribute('data-name');
        if (name) {
          window.AIService.updateMemory('removeCharacter', name);
          showNotification('角色 "' + name + '" 已删除', 'info');
          overlay.remove();
          showMemoryPanel();
        }
      });
    });

    // 世界观：保存
    var saveWorldBtn = document.getElementById('save-world-settings-btn');
    if (saveWorldBtn) {
      saveWorldBtn.addEventListener('click', function() {
        var textarea = document.getElementById('memory-world-settings');
        var val = textarea ? textarea.value : '';
        window.AIService.updateMemory('worldSettings', val);
        showNotification('世界观设定已保存', 'info');
      });
    }

    // 伏笔追踪：已解决
    var resolveBtns = dialog.querySelectorAll('.resolve-foreshadowing-btn');
    resolveBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var fId = btn.getAttribute('data-id');
        if (fId) {
          window.AIService.updateMemory('resolveForeshadowing', fId);
          showNotification('伏笔已标记为已解决', 'info');
          overlay.remove();
          showMemoryPanel();
        }
      });
    });

    // 伏笔追踪：删除
    var removeFBtns = dialog.querySelectorAll('.remove-foreshadowing-btn');
    removeFBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var fId = btn.getAttribute('data-id');
        if (fId) {
          showConfirmDialog('确定彻底删除此伏笔吗？', function() {
            window.AIService.updateMemory('removeForeshadowing', fId);
            showNotification('伏笔已删除', 'info');
            overlay.remove();
            showMemoryPanel();
          });
        }
      });
    });

    // 全局摘要：AI更新
    var aiSummaryBtn = document.getElementById('ai-update-summary-btn');
    if (aiSummaryBtn) {
      aiSummaryBtn.addEventListener('click', function() {
        if (isGenerating) return;
        var editorText = getEditorText();
        if (!editorText) {
          showNotification('编辑器中没有内容', 'warn');
          return;
        }
        aiSummaryBtn.textContent = '更新中...';
        aiSummaryBtn.style.pointerEvents = 'none';

        var messages = window.AIService.PROMPTS.generateSummary(editorText);
        window.AIService.chat(messages, {
          stream: false,
          temperature: 0.3,
          max_tokens: 3000,
          onDone: function(fullContent) {
            window.AIService.updateMemory('globalSummary', fullContent);
            var display = document.getElementById('memory-summary-display');
            if (display) display.textContent = fullContent;
            showNotification('全局摘要已更新', 'info');
            aiSummaryBtn.innerHTML = '<img src="../assets/icons/dl-builtin-trae/sparkles.32f08c.svg" width="12" height="12" alt="">AI更新摘要';
            aiSummaryBtn.style.pointerEvents = '';
          },
          onError: function(err) {
            showNotification('摘要更新失败: ' + err.message, 'error');
            aiSummaryBtn.innerHTML = '<img src="../assets/icons/dl-builtin-trae/sparkles.32f08c.svg" width="12" height="12" alt="">AI更新摘要';
            aiSummaryBtn.style.pointerEvents = '';
          }
        });
      });
    }

    // 文风：保存
    var saveStyleBtn = document.getElementById('save-style-notes-btn');
    if (saveStyleBtn) {
      saveStyleBtn.addEventListener('click', function() {
        var textarea = document.getElementById('memory-style-notes');
        var val = textarea ? textarea.value : '';
        window.AIService.updateMemory('styleNotes', val);
        showNotification('文风备注已保存', 'info');
      });
    }
  }

  function showAddCharacterDialog(onConfirm) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:1001; display:flex; align-items:center; justify-content:center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'width:420px; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:12px; padding:24px; box-shadow:0 8px 32px rgba(0,0,0,0.4); animation:fadeIn 0.2s ease-out;';

    dialog.innerHTML =
      '<h3 style="font-size:16px; color:var(--text-default); margin-bottom:16px;">添加角色</h3>' +
      '<div style="display:flex; flex-direction:column; gap:10px;">' +
      '<div><label style="font-size:12px; color:var(--text-tertiary); display:block; margin-bottom:4px;">姓名 *</label><input id="char-name" type="text" style="width:100%; height:32px; padding:0 10px; background:var(--bg-overlay-l1); border:1px solid var(--border-neutral-l1); border-radius:6px; color:var(--text-default); font-size:13px; outline:none; box-sizing:border-box;"></div>' +
      '<div><label style="font-size:12px; color:var(--text-tertiary); display:block; margin-bottom:4px;">性格</label><input id="char-personality" type="text" style="width:100%; height:32px; padding:0 10px; background:var(--bg-overlay-l1); border:1px solid var(--border-neutral-l1); border-radius:6px; color:var(--text-default); font-size:13px; outline:none; box-sizing:border-box;"></div>' +
      '<div><label style="font-size:12px; color:var(--text-tertiary); display:block; margin-bottom:4px;">说话风格</label><input id="char-speech-style" type="text" style="width:100%; height:32px; padding:0 10px; background:var(--bg-overlay-l1); border:1px solid var(--border-neutral-l1); border-radius:6px; color:var(--text-default); font-size:13px; outline:none; box-sizing:border-box;"></div>' +
      '</div>' +
      '<div style="display:flex; gap:8px; justify-content:flex-end; margin-top:20px;">' +
      '<button id="cancel-add-char" style="padding:8px 16px; background:transparent; color:var(--text-secondary); border:1px solid var(--border-neutral-l1); border-radius:6px; font-size:13px; cursor:pointer;">取消</button>' +
      '<button id="confirm-add-char" style="padding:8px 16px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; font-size:13px; cursor:pointer;">添加</button>' +
      '</div>';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    var nameInput = document.getElementById('char-name');
    if (nameInput) nameInput.focus();

    function close() { overlay.remove(); }

    overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
    document.getElementById('cancel-add-char').addEventListener('click', close);

    document.getElementById('confirm-add-char').addEventListener('click', function() {
      var name = document.getElementById('char-name').value.trim();
      if (!name) {
        showNotification('请填写角色姓名', 'warn');
        return;
      }
      var character = {
        name: name,
        personality: document.getElementById('char-personality').value.trim(),
        speechStyle: document.getElementById('char-speech-style').value.trim()
      };
      close();
      if (onConfirm) onConfirm(character);
    });
  }

  // ========== 自动保存 ==========
  function initAutoSave() {
    var lastSaveTime = 0;
    var autoSaveInterval = 30000; // 30秒自动保存

    // 加载草稿
    function loadDraft() {
      var article = document.querySelector('article');
      if (!article) return;

      var currentContent = article.innerHTML;
      if (currentContent && currentContent.indexOf('欢迎开始创作') !== -1) {
        var currentWork = window.WorksStore ? window.WorksStore.getCurrentWork() : null;
        if (currentWork && currentChapterId) {
          var chapter = currentWork.chapters.find(function(c) { return c.id === currentChapterId; });
          if (chapter && chapter.content && chapter.content.indexOf('欢迎开始创作') === -1) {
            article.innerHTML = chapter.content;
            return;
          }
        }
        var draft = localStorage.getItem('ai_writing_editor_draft');
        if (draft && draft.length > 100 && draft.indexOf('欢迎开始创作') === -1) {
          article.innerHTML = draft;
        }
      }
    }

    // 保存草稿
    function saveDraft() {
      var article = document.querySelector('article');
      if (!article) return;

      var content = article.innerHTML;
      if (!content || content.trim().length < 50) return;

      if (content.indexOf('欢迎开始创作') !== -1) return;

      try {
        localStorage.setItem('ai_writing_editor_draft', content);
      } catch (e) {}

      var currentWork = window.WorksStore ? window.WorksStore.getCurrentWork() : null;
      if (currentWork && currentChapterId && window.WorksStore) {
        window.WorksStore.updateChapter(currentWork.id, currentChapterId, content);
      } else if (currentWork && currentWork.chapters && currentWork.chapters.length > 0) {
        var latestChapter = currentWork.chapters[currentWork.chapters.length - 1];
        if (window.WorksStore) {
          window.WorksStore.updateChapter(currentWork.id, latestChapter.id, content);
        }
      }

      updateWordCount();
      lastSaveTime = Date.now();
    }

    

    // 初始化时加载草稿
    setTimeout(loadDraft, 500);

    // 定时自动保存
    setInterval(saveDraft, autoSaveInterval);

    // 页面离开前保存
    window.addEventListener('beforeunload', saveDraft);

    // 用户输入时防抖保存
    var saveTimeout = null;
    document.addEventListener('input', function(e) {
      if (e.target.closest('article')) {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveDraft, 5000);
      }
    });
  }

  // ========== 快捷按钮系统（新）==========
  // 默认按钮配置
  var DEFAULT_QUICK_BUTTONS = [
    { id: 'continue', label: '续写', icon: 'pen-tool', action: 'continueWriting', processType: 'append', desc: '根据已有内容续写下一段' },
    { id: 'polish', label: '润色', icon: 'edit', action: 'polish', processType: 'replace', desc: '优化表达，提升文学性' },
    { id: 'dialogue', label: '对话', icon: 'message-circle', action: 'generateDialogue', processType: 'append', desc: '生成符合人物性格的对话' },
    { id: 'autoWrite', label: '自动写作', icon: 'wand', action: 'autoWrite', processType: 'special', desc: '多种自动写作模式' },
    { id: 'diagnose', label: '诊断', icon: 'stethoscope', action: 'diagnose', processType: 'chat', desc: '分析卡文原因并给出方案' },
    { id: 'checkConsistency', label: '一致性', icon: 'check-circle', action: 'checkConsistency', processType: 'chat', desc: '检查人物、剧情一致性' },
    { id: 'format', label: '排版', icon: 'align-left', action: 'format', processType: 'special', desc: '一键排版和导出' }
  ];

  // 扩展按钮配置
  var EXPANDED_BUTTONS = [
    { id: 'expand', label: '扩写', icon: 'maximize', action: 'expandText', processType: 'replaceSelection', desc: '扩展内容，增加细节' },
    { id: 'condense', label: '精简', icon: 'minimize', action: 'condenseText', processType: 'replaceSelection', desc: '压缩文字，更凝练' },
    { id: 'scene', label: '场景增强', icon: 'image', action: 'enhanceScene', processType: 'replaceSelection', desc: '增强五感描写' },
    { id: 'innerThought', label: '心理增强', icon: 'heart', action: 'enhanceInnerThought', processType: 'replaceSelection', desc: '丰富内心活动' },
    { id: 'plotSuggest', label: '剧情建议', icon: 'compass', action: 'suggestPlotDirection', processType: 'chat', desc: '给出多个剧情走向建议' },
    { id: 'extractChars', label: '提取角色', icon: 'users', action: 'extractCharacters', processType: 'chat', desc: '从文本提取角色设定' },
    { id: 'summary', label: '更新摘要', icon: 'file-text', action: 'generateSummary', processType: 'memory', desc: '更新全局记忆摘要' }
  ];

  // 自动写作模式
  var autoWriteMode = 'interactive'; // direct, outline, quick, interactive

  // 加载自定义按钮配置
  function loadCustomButtons() {
    try {
      var saved = localStorage.getItem('ai_writing_custom_buttons');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  }

  function saveCustomButtons(buttons) {
    try {
      localStorage.setItem('ai_writing_custom_buttons', JSON.stringify(buttons));
    } catch (e) {}
  }

  // 获取按钮配置（合并默认和自定义）
  function getButtonConfig() {
    var custom = loadCustomButtons();
    if (custom && custom.quickButtons) {
      return custom;
    }
    return {
      quickButtons: DEFAULT_QUICK_BUTTONS.slice(0, 5),
      expandedButtons: DEFAULT_QUICK_BUTTONS.slice(5).concat(EXPANDED_BUTTONS)
    };
  }

  // 创建快捷按钮元素
  function createQuickButton(config, isExpanded) {
    var btn = document.createElement('button');
    btn.className = 'quick-action-btn';
    btn.setAttribute('data-action', config.action);
    btn.setAttribute('data-process-type', config.processType);
    btn.setAttribute('title', config.desc);

    if (isExpanded) {
      btn.style.cssText = 'display:flex; align-items:center; gap:8px; width:100%; height:32px; padding:0 12px; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:6px; color:var(--text-secondary); font-size:12px; cursor:pointer; transition:all 0.15s;';
    } else {
      btn.style.cssText = 'display:flex; align-items:center; justify-content:center; height:28px; padding:0 10px; background:transparent; border:1px solid var(--border-neutral-l2); border-radius:6px; color:var(--text-secondary); font-size:12px; cursor:pointer; transition:all 0.15s;';
    }

    btn.innerHTML = '<span class="btn-label">' + config.label + '</span>';

    btn.addEventListener('mouseenter', function() {
      btn.style.borderColor = 'var(--border-brand)';
      btn.style.color = 'var(--text-default)';
      btn.style.background = 'var(--bg-overlay-l1)';
    });
    btn.addEventListener('mouseleave', function() {
      btn.style.borderColor = 'var(--border-neutral-l2)';
      btn.style.color = 'var(--text-secondary)';
      btn.style.background = isExpanded ? 'var(--bg-base-tertiary)' : 'transparent';
    });

    btn.addEventListener('click', function() {
      handleQuickAction(config);
    });

    return btn;
  }

  // 渲染快捷按钮
  function renderQuickButtons() {
    var quickWrapper = document.getElementById('quick-buttons-wrapper');
    var expandedWrapper = document.getElementById('expanded-buttons-wrapper');

    if (!quickWrapper) return;

    var config = getButtonConfig();

    quickWrapper.innerHTML = '';
    expandedWrapper.innerHTML = '';

    config.quickButtons.forEach(function(btnConfig) {
      quickWrapper.appendChild(createQuickButton(btnConfig, false));
    });

    config.expandedButtons.forEach(function(btnConfig) {
      expandedWrapper.appendChild(createQuickButton(btnConfig, true));
    });
  }

  // 处理快捷按钮点击
  function handleQuickAction(config) {
    if (isGenerating) {
      showNotification('请等待当前操作完成', 'warn');
      return;
    }

    var editorText = getEditorText();
    var selection = window.getSelection();
    var selectedText = selection ? selection.toString().trim() : '';

    // 根据处理类型执行不同操作
    switch (config.processType) {
      case 'append':
        if (!editorText) {
          showNotification('编辑器中没有内容', 'warn');
          return;
        }
        executeAIAction(config, editorText, 'append');
        break;

      case 'replace':
        if (!editorText) {
          showNotification('编辑器中没有内容', 'warn');
          return;
        }
        executeAIAction(config, editorText, 'replace');
        break;

      case 'replaceSelection':
        if (!selectedText) {
          showNotification('请先选中要处理的文本', 'warn');
          return;
        }
        executeAIAction(config, selectedText, 'replaceSelection');
        break;

      case 'chat':
        if (!editorText && config.action !== 'diagnose') {
          showNotification('编辑器中没有内容', 'warn');
          return;
        }
        executeAIAction(config, editorText, 'chat');
        break;

      case 'special':
        handleSpecialAction(config);
        break;

      case 'memory':
        if (!editorText) {
          showNotification('编辑器中没有内容', 'warn');
          return;
        }
        executeAIAction(config, editorText, 'memory');
        break;

      default:
        executeAIAction(config, editorText, 'chat');
    }
  }

  // 执行 AI 操作
  function executeAIAction(config, text, processType) {
    var messagesContainer = document.getElementById('chat-messages-container');
    if (!messagesContainer) return;

    // 添加用户消息
    var userMsg = createMessageEl('用户', config.label + (processType === 'replaceSelection' ? '（选中文本）' : ''), 'user');
    messagesContainer.appendChild(userMsg);

    // 添加 AI 消息占位
    var aiMsg = createMessageEl('AI', '', 'ai');
    var aiContent = aiMsg.querySelector('.msg-content');
    aiContent.innerHTML = '<span style="color: var(--text-tertiary);">正在生成...</span>';
    messagesContainer.appendChild(aiMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // 更新状态栏
    updateAIStatus('正在生成...');

    isGenerating = true;
    var context = getWorkContext();
    var messages = window.AIService.PROMPTS[config.action](context, text);

    var firstChunk = true;
    var fullResult = '';

    window.AIService.chat(messages, {
      stream: true,
      temperature: 0.8,
      max_tokens: 4096,
      onChunk: function(delta, fullContent) {
        if (firstChunk) {
          aiContent.innerHTML = '';
          firstChunk = false;
        }
        fullResult = fullContent;
        aiContent.innerHTML = formatAIResponse(fullContent);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      },
      onDone: function(fullContent) {
        if (firstChunk) {
          aiContent.textContent = fullContent || '(空回复)';
          fullResult = fullContent;
        }

        // 根据处理类型处理结果
        processAIResult(config, fullContent, processType, aiContent, messagesContainer);

        chatHistory.push({ role: 'user', content: config.label + ': ' + text.substring(0, 200) });
        chatHistory.push({ role: 'assistant', content: fullContent });
        isGenerating = false;
        updateAIStatus('就绪');
      },
      onError: function(err) {
        aiContent.innerHTML = '<span style="color: #f87171;">调用失败: ' + escapeHtml(err.message) + '</span>';
        isGenerating = false;
        updateAIStatus('就绪');
      }
    });
  }

  // 处理 AI 结果
  function processAIResult(config, fullContent, processType, aiContent, messagesContainer) {
    var article = document.querySelector('article');
    var selection = window.getSelection();
    var selectedText = selection ? selection.toString().trim() : '';

    if (!article || !fullContent) return;

    switch (processType) {
      case 'append':
        // 追加到编辑器
        var appendParagraphs = processNovelText(fullContent, {
          filterHeadings: true,
          cleanMarkdown: true,
          optimizeDialogue: true
        });
        var appendHtml = paragraphsToHtml(appendParagraphs, { textIndent: true });
        article.insertAdjacentHTML('beforeend', appendHtml);
        showNotification(config.label + '已追加（' + appendParagraphs.length + ' 段）', 'info');
        break;

      case 'replace':
        // 替换全文或选中区域
        var replaceParagraphs = processNovelText(fullContent, {
          filterHeadings: true,
          cleanMarkdown: true,
          optimizeDialogue: false
        });
        var replaceHtml = paragraphsToHtml(replaceParagraphs, { textIndent: true });
        if (selectedText && selection.rangeCount > 0) {
          var range = selection.getRangeAt(0);
          range.deleteContents();
          var tempDiv = document.createElement('div');
          tempDiv.innerHTML = replaceHtml;
          var fragment = document.createDocumentFragment();
          while (tempDiv.firstChild) {
            fragment.appendChild(tempDiv.firstChild);
          }
          range.insertNode(fragment);
          selection.removeAllRanges();
        } else {
          var existingTitle = article.querySelector('h1, h2, h3');
          var titleHtml = existingTitle ? existingTitle.outerHTML + '\n' : '';
          article.innerHTML = titleHtml + replaceHtml;
        }
        showNotification(config.label + '完成（' + replaceParagraphs.length + ' 段）', 'info');
        break;

      case 'replaceSelection':
        // 替换选中内容
        if (selectedText && selection.rangeCount > 0) {
          var selParagraphs = processNovelText(fullContent, {
            filterHeadings: true,
            cleanMarkdown: true,
            optimizeDialogue: true
          });
          var selHtml = paragraphsToHtml(selParagraphs, { textIndent: true });
          var selRange = selection.getRangeAt(0);
          selRange.deleteContents();
          var selTempDiv = document.createElement('div');
          selTempDiv.innerHTML = selHtml;
          var selFragment = document.createDocumentFragment();
          while (selTempDiv.firstChild) {
            selFragment.appendChild(selTempDiv.firstChild);
          }
          selRange.insertNode(selFragment);
          selection.removeAllRanges();
          showNotification(config.label + '完成（' + selParagraphs.length + ' 段）', 'info');
        }
        break;

      case 'memory':
        // 更新记忆系统
        window.AIService.updateMemory('globalSummary', fullContent);
        showNotification('全局摘要已更新并保存', 'info');
        break;

      case 'chat':
        // 仅在对话中展示，添加应用按钮
        addApplyButton(aiContent, fullContent, config);
        break;
    }

    if (typeof updateWordCount === 'function') {
      updateWordCount();
    }
    if (typeof saveCurrentChapter === 'function') {
      saveCurrentChapter();
    }
  }

  // 为聊天消息添加应用按钮
  function addApplyButton(aiContent, fullContent, config) {
    var actionsDiv = document.createElement('div');
    actionsDiv.style.cssText = 'margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;';

    var applyBtn = document.createElement('button');
    applyBtn.textContent = '应用到编辑器';
    applyBtn.style.cssText = 'padding:4px 12px; height:28px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; font-size:12px; cursor:pointer;';
    applyBtn.addEventListener('click', function() {
      var article = document.querySelector('article');
      if (!article) return;

      var paragraphs = processNovelText(fullContent, {
        filterHeadings: true,
        cleanMarkdown: true,
        optimizeDialogue: true
      });
      var html = paragraphsToHtml(paragraphs, { textIndent: true });
      article.insertAdjacentHTML('beforeend', html);
      showNotification('内容已追加到编辑器', 'info');

      if (typeof updateWordCount === 'function') updateWordCount();
      if (typeof saveCurrentChapter === 'function') saveCurrentChapter();
    });

    var copyBtn = document.createElement('button');
    copyBtn.textContent = '复制';
    copyBtn.style.cssText = 'padding:4px 12px; height:28px; background:transparent; color:var(--text-secondary); border:1px solid var(--border-neutral-l2); border-radius:6px; font-size:12px; cursor:pointer;';
    copyBtn.addEventListener('click', function() {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(fullContent).then(function() {
          showNotification('已复制到剪贴板', 'info');
        });
      }
    });

    actionsDiv.appendChild(applyBtn);
    actionsDiv.appendChild(copyBtn);
    aiContent.appendChild(actionsDiv);
  }

  // 处理特殊操作（自动写作、排版）
  function handleSpecialAction(config) {
    if (config.action === 'autoWrite') {
      showAutoWriteDialog();
    } else if (config.action === 'format') {
      showFormatDialog();
    }
  }

  // 显示自动写作对话框
  function showAutoWriteDialog() {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:9999; display:flex; align-items:center; justify-content:center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'background:var(--bg-base-secondary); border:1px solid var(--border-neutral-l2); border-radius:12px; padding:24px; width:420px; max-width:90%; box-shadow:0 8px 32px rgba(0,0,0,0.4);';

    dialog.innerHTML =
      '<h3 style="font-size:16px; color:var(--text-default); font-weight:600; margin-bottom:16px;">自动写作模式</h3>' +
      '<div style="display:flex; flex-direction:column; gap:12px;">' +
        '<button class="auto-write-mode-btn" data-mode="direct" style="display:flex; align-items:center; gap:12px; padding:12px; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:8px; cursor:pointer; text-align:left;">' +
          '<div style="width:32px; height:32px; border-radius:6px; background:var(--bg-brand); display:flex; align-items:center; justify-content:center;"><img src="../assets/icons/dl-builtin-trae/play.svg" width="16" height="16" alt=""></div>' +
          '<div><div style="font-size:13px; color:var(--text-default); font-weight:500;">直接开始</div><div style="font-size:11px; color:var(--text-tertiary);">AI直接续写，每段询问是否继续</div></div>' +
        '</button>' +
        '<button class="auto-write-mode-btn" data-mode="outline" style="display:flex; align-items:center; gap:12px; padding:12px; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:8px; cursor:pointer; text-align:left;">' +
          '<div style="width:32px; height:32px; border-radius:6px; background:var(--bg-overlay-l2); display:flex; align-items:center; justify-content:center;"><img src="../assets/icons/dl-builtin-trae/list.svg" width="16" height="16" alt=""></div>' +
          '<div><div style="font-size:13px; color:var(--text-default); font-weight:500;">先定大纲</div><div style="font-size:11px; color:var(--text-tertiary);">生成段落大纲，确认后按大纲写</div></div>' +
        '</button>' +
        '<button class="auto-write-mode-btn" data-mode="quick" style="display:flex; align-items:center; gap:12px; padding:12px; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:8px; cursor:pointer; text-align:left;">' +
          '<div style="width:32px; height:32px; border-radius:6px; background:var(--bg-overlay-l2); display:flex; align-items:center; justify-content:center;"><img src="../assets/icons/dl-builtin-trae/settings.svg" width="16" height="16" alt=""></div>' +
          '<div><div style="font-size:13px; color:var(--text-default); font-weight:500;">快速设定</div><div style="font-size:11px; color:var(--text-tertiary);">设置字数、主题、关键事件等</div></div>' +
        '</button>' +
        '<button class="auto-write-mode-btn" data-mode="interactive" style="display:flex; align-items:center; gap:12px; padding:12px; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:8px; cursor:pointer; text-align:left;">' +
          '<div style="width:32px; height:32px; border-radius:6px; background:var(--bg-overlay-l2); display:flex; align-items:center; justify-content:center;"><img src="../assets/icons/dl-builtin-trae/edit.svg" width="16" height="16" alt=""></div>' +
          '<div><div style="font-size:13px; color:var(--text-default); font-weight:500;">边写边调</div><div style="font-size:11px; color:var(--text-tertiary);">默认模式，随时打断调整</div></div>' +
        '</button>' +
      '</div>' +
      '<div style="margin-top:16px; display:flex; justify-content:flex-end;">' +
        '<button class="cancel-auto-write" style="padding:6px 16px; height:32px; background:transparent; color:var(--text-secondary); border:1px solid var(--border-neutral-l1); border-radius:6px; cursor:pointer; font-size:13px;">取消</button>' +
      '</div>';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // 事件绑定
    dialog.querySelector('.cancel-auto-write').addEventListener('click', function() { overlay.remove(); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

    var modeBtns = dialog.querySelectorAll('.auto-write-mode-btn');
    modeBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var mode = btn.getAttribute('data-mode');
        overlay.remove();
        startAutoWrite(mode);
      });
      btn.addEventListener('mouseenter', function() {
        btn.style.borderColor = 'var(--border-brand)';
      });
      btn.addEventListener('mouseleave', function() {
        btn.style.borderColor = 'var(--border-neutral-l2)';
      });
    });
  }

  // 开始自动写作
  function startAutoWrite(mode) {
    autoWriteMode = mode;

    if (mode === 'quick') {
      showQuickSettingsDialog();
      return;
    }

    if (mode === 'outline') {
      generateOutlineForAutoWrite();
      return;
    }

    // 直接开始或边写边调模式
    executeAutoWriteDirect();
  }

  // 显示快速设定对话框
  function showQuickSettingsDialog() {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:9999; display:flex; align-items:center; justify-content:center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'background:var(--bg-base-secondary); border:1px solid var(--border-neutral-l2); border-radius:12px; padding:24px; width:440px; max-width:90%; box-shadow:0 8px 32px rgba(0,0,0,0.4);';

    dialog.innerHTML =
      '<h3 style="font-size:16px; color:var(--text-default); font-weight:600; margin-bottom:16px;">快速设定</h3>' +
      '<div style="display:flex; flex-direction:column; gap:12px;">' +
        '<div style="display:flex; flex-direction:column; gap:4px;">' +
          '<label style="font-size:12px; color:var(--text-tertiary);">目标字数</label>' +
          '<input id="auto-word-count" type="number" placeholder="例如: 2000" style="height:32px; padding:0 12px; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:6px; color:var(--text-default); font-size:13px;">' +
        '</div>' +
        '<div style="display:flex; flex-direction:column; gap:4px;">' +
          '<label style="font-size:12px; color:var(--text-tertiary);">本章主题</label>' +
          '<input id="auto-theme" type="text" placeholder="例如: 主角觉醒" style="height:32px; padding:0 12px; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:6px; color:var(--text-default); font-size:13px;">' +
        '</div>' +
        '<div style="display:flex; flex-direction:column; gap:4px;">' +
          '<label style="font-size:12px; color:var(--text-tertiary);">关键事件（用逗号分隔）</label>' +
          '<input id="auto-events" type="text" placeholder="例如: 相遇,冲突,和解" style="height:32px; padding:0 12px; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:6px; color:var(--text-default); font-size:13px;">' +
        '</div>' +
        '<div style="display:flex; flex-direction:column; gap:4px;">' +
          '<label style="font-size:12px; color:var(--text-tertiary);">避免内容</label>' +
          '<input id="auto-avoid" type="text" placeholder="例如: 血腥描写,过度暴力" style="height:32px; padding:0 12px; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:6px; color:var(--text-default); font-size:13px;">' +
        '</div>' +
      '</div>' +
      '<div style="margin-top:16px; display:flex; gap:8px; justify-content:flex-end;">' +
        '<button class="cancel-quick-settings" style="padding:6px 16px; height:32px; background:transparent; color:var(--text-secondary); border:1px solid var(--border-neutral-l1); border-radius:6px; cursor:pointer; font-size:13px;">取消</button>' +
        '<button class="start-quick-write" style="padding:6px 16px; height:32px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; cursor:pointer; font-size:13px;">开始写作</button>' +
      '</div>';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    dialog.querySelector('.cancel-quick-settings').addEventListener('click', function() { overlay.remove(); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

    dialog.querySelector('.start-quick-write').addEventListener('click', function() {
      var settings = {
        targetWords: dialog.querySelector('#auto-word-count').value,
        theme: dialog.querySelector('#auto-theme').value,
        keyEvents: dialog.querySelector('#auto-events').value,
        avoid: dialog.querySelector('#auto-avoid').value
      };
      overlay.remove();
      executeAutoWriteWithSettings(settings);
    });
  }

  // 执行自动写作 - 直接模式
  function executeAutoWriteDirect() {
    var editorText = getEditorText();
    if (!editorText) {
      showNotification('编辑器中没有内容', 'warn');
      return;
    }

    var messagesContainer = document.getElementById('chat-messages-container');
    if (!messagesContainer) return;

    var userMsg = createMessageEl('用户', '自动写作：直接开始', 'user');
    messagesContainer.appendChild(userMsg);

    var aiMsg = createMessageEl('AI', '', 'ai');
    var aiContent = aiMsg.querySelector('.msg-content');
    aiContent.innerHTML = '<span style="color: var(--text-tertiary);">正在生成...</span>';
    messagesContainer.appendChild(aiMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    updateAIStatus('正在自动写作...');

    isGenerating = true;
    var context = getWorkContext();
    var messages = window.AIService.PROMPTS.autoWriteDirect(context, editorText);

    var firstChunk = true;
    var fullResult = '';

    window.AIService.chat(messages, {
      stream: true,
      temperature: 0.8,
      max_tokens: 2000,
      onChunk: function(delta, fullContent) {
        if (firstChunk) { aiContent.innerHTML = ''; firstChunk = false; }
        fullResult = fullContent;
        aiContent.innerHTML = formatAIResponse(fullContent);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      },
      onDone: function(fullContent) {
        if (firstChunk) { aiContent.textContent = fullContent || '(空回复)'; fullResult = fullContent; }

        // 追加到编辑器
        var article = document.querySelector('article');
        if (article && fullContent) {
          var paragraphs = processNovelText(fullContent, { filterHeadings: true, cleanMarkdown: true, optimizeDialogue: true });
          var html = paragraphsToHtml(paragraphs, { textIndent: true });
          article.insertAdjacentHTML('beforeend', html);
          showNotification('已写入 ' + paragraphs.length + ' 段，可以继续或调整', 'info');

          // 添加继续按钮
          addContinueWriteButton(aiContent, messagesContainer);
        }

        chatHistory.push({ role: 'user', content: '自动写作' });
        chatHistory.push({ role: 'assistant', content: fullContent });
        isGenerating = false;
        updateAIStatus('就绪');

        if (typeof updateWordCount === 'function') updateWordCount();
        if (typeof saveCurrentChapter === 'function') saveCurrentChapter();
      },
      onError: function(err) {
        aiContent.innerHTML = '<span style="color: #f87171;">调用失败: ' + escapeHtml(err.message) + '</span>';
        isGenerating = false;
        updateAIStatus('就绪');
      }
    });
  }

  // 添加继续写作按钮
  function addContinueWriteButton(aiContent, messagesContainer) {
    var actionsDiv = document.createElement('div');
    actionsDiv.style.cssText = 'margin-top:12px; display:flex; gap:8px;';

    var continueBtn = document.createElement('button');
    continueBtn.textContent = '继续写作';
    continueBtn.style.cssText = 'padding:4px 12px; height:28px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; font-size:12px; cursor:pointer;';
    continueBtn.addEventListener('click', function() {
      executeAutoWriteDirect();
    });

    var stopBtn = document.createElement('button');
    stopBtn.textContent = '完成';
    stopBtn.style.cssText = 'padding:4px 12px; height:28px; background:transparent; color:var(--text-secondary); border:1px solid var(--border-neutral-l2); border-radius:6px; font-size:12px; cursor:pointer;';
    stopBtn.addEventListener('click', function() {
      showNotification('自动写作已完成', 'info');
    });

    actionsDiv.appendChild(continueBtn);
    actionsDiv.appendChild(stopBtn);
    aiContent.appendChild(actionsDiv);
  }

  // 执行自动写作 - 带设定
  function executeAutoWriteWithSettings(settings) {
    var editorText = getEditorText();

    var messagesContainer = document.getElementById('chat-messages-container');
    if (!messagesContainer) return;

    var settingsText = '';
    if (settings.targetWords) settingsText += '目标字数: ' + settings.targetWords + '字 ';
    if (settings.theme) settingsText += '主题: ' + settings.theme + ' ';
    if (settings.keyEvents) settingsText += '关键事件: ' + settings.keyEvents;

    var userMsg = createMessageEl('用户', '自动写作：' + settingsText, 'user');
    messagesContainer.appendChild(userMsg);

    var aiMsg = createMessageEl('AI', '', 'ai');
    var aiContent = aiMsg.querySelector('.msg-content');
    aiContent.innerHTML = '<span style="color: var(--text-tertiary);">正在按设定生成...</span>';
    messagesContainer.appendChild(aiMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    updateAIStatus('正在按设定写作...');

    isGenerating = true;
    var context = getWorkContext();
    var messages = window.AIService.PROMPTS.autoWriteWithSettings(context, editorText || '', settings);

    var firstChunk = true;
    var fullResult = '';

    window.AIService.chat(messages, {
      stream: true,
      temperature: 0.8,
      max_tokens: 3000,
      onChunk: function(delta, fullContent) {
        if (firstChunk) { aiContent.innerHTML = ''; firstChunk = false; }
        fullResult = fullContent;
        aiContent.innerHTML = formatAIResponse(fullContent);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      },
      onDone: function(fullContent) {
        if (firstChunk) { aiContent.textContent = fullContent || '(空回复)'; fullResult = fullContent; }

        var article = document.querySelector('article');
        if (article && fullContent) {
          var paragraphs = processNovelText(fullContent, { filterHeadings: true, cleanMarkdown: true, optimizeDialogue: true });
          var html = paragraphsToHtml(paragraphs, { textIndent: true });
          article.insertAdjacentHTML('beforeend', html);
          showNotification('已写入 ' + paragraphs.length + ' 段', 'info');
          addContinueWriteButton(aiContent, messagesContainer);
        }

        chatHistory.push({ role: 'user', content: '自动写作（带设定）' });
        chatHistory.push({ role: 'assistant', content: fullContent });
        isGenerating = false;
        updateAIStatus('就绪');

        if (typeof updateWordCount === 'function') updateWordCount();
        if (typeof saveCurrentChapter === 'function') saveCurrentChapter();
      },
      onError: function(err) {
        aiContent.innerHTML = '<span style="color: #f87171;">调用失败: ' + escapeHtml(err.message) + '</span>';
        isGenerating = false;
        updateAIStatus('就绪');
      }
    });
  }

  // 生成大纲（自动写作大纲模式）
  function generateOutlineForAutoWrite() {
    var editorText = getEditorText();
    if (!editorText) {
      showNotification('编辑器中没有内容', 'warn');
      return;
    }

    var messagesContainer = document.getElementById('chat-messages-container');
    if (!messagesContainer) return;

    var userMsg = createMessageEl('用户', '生成段落大纲', 'user');
    messagesContainer.appendChild(userMsg);

    var aiMsg = createMessageEl('AI', '', 'ai');
    var aiContent = aiMsg.querySelector('.msg-content');
    aiContent.innerHTML = '<span style="color: var(--text-tertiary);">正在生成大纲...</span>';
    messagesContainer.appendChild(aiMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    updateAIStatus('正在生成大纲...');

    isGenerating = true;
    var context = getWorkContext();
    var messages = window.AIService.PROMPTS.autoWriteOutline(context, editorText, '');

    var firstChunk = true;
    var outlineContent = '';

    window.AIService.chat(messages, {
      stream: true,
      temperature: 0.7,
      max_tokens: 1500,
      onChunk: function(delta, fullContent) {
        if (firstChunk) { aiContent.innerHTML = ''; firstChunk = false; }
        outlineContent = fullContent;
        aiContent.innerHTML = formatAIResponse(fullContent);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      },
      onDone: function(fullContent) {
        if (firstChunk) { aiContent.textContent = fullContent || '(空回复)'; outlineContent = fullContent; }

        // 解析大纲并添加确认按钮
        var outlineItems = parseOutline(fullContent);
        addOutlineConfirmButtons(aiContent, outlineItems, messagesContainer);

        chatHistory.push({ role: 'user', content: '生成段落大纲' });
        chatHistory.push({ role: 'assistant', content: fullContent });
        isGenerating = false;
        updateAIStatus('就绪');
      },
      onError: function(err) {
        aiContent.innerHTML = '<span style="color: #f87171;">调用失败: ' + escapeHtml(err.message) + '</span>';
        isGenerating = false;
        updateAIStatus('就绪');
      }
    });
  }

  // 解析大纲
  function parseOutline(outlineText) {
    var lines = outlineText.split('\n');
    var items = [];
    lines.forEach(function(line) {
      line = line.trim();
      if (/^\d+[\.\、\:]/.test(line) || /^[一二三四五六七八九十]+[\.\、\:]/.test(line)) {
        items.push(line);
      }
    });
    return items;
  }

  // 添加大纲确认按钮
  function addOutlineConfirmButtons(aiContent, outlineItems, messagesContainer) {
    var actionsDiv = document.createElement('div');
    actionsDiv.style.cssText = 'margin-top:16px; padding-top:12px; border-top:1px solid var(--border-neutral-l2);';

    actionsDiv.innerHTML =
      '<div style="font-size:12px; color:var(--text-secondary); margin-bottom:8px;">确认大纲后开始写作：</div>' +
      '<div style="display:flex; gap:8px;">' +
        '<button class="confirm-outline-btn" style="padding:6px 16px; height:32px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; cursor:pointer; font-size:13px;">确认并开始写作</button>' +
        '<button class="regenerate-outline-btn" style="padding:6px 16px; height:32px; background:transparent; color:var(--text-secondary); border:1px solid var(--border-neutral-l2); border-radius:6px; cursor:pointer; font-size:13px;">重新生成</button>' +
      '</div>';

    actionsDiv.querySelector('.confirm-outline-btn').addEventListener('click', function() {
      if (outlineItems.length > 0) {
        startWritingByOutline(outlineItems, 0, messagesContainer);
      } else {
        showNotification('无法解析大纲，请手动描述', 'warn');
      }
    });

    actionsDiv.querySelector('.regenerate-outline-btn').addEventListener('click', function() {
      generateOutlineForAutoWrite();
    });

    aiContent.appendChild(actionsDiv);
  }

  // 按大纲写作
  function startWritingByOutline(outlineItems, currentIndex, messagesContainer) {
    if (currentIndex >= outlineItems.length) {
      showNotification('按大纲写作完成', 'info');
      return;
    }

    var outlineItem = outlineItems[currentIndex];
    var prevItem = currentIndex > 0 ? outlineItems[currentIndex - 1] : null;

    var userMsg = createMessageEl('用户', '写作：' + outlineItem, 'user');
    messagesContainer.appendChild(userMsg);

    var aiMsg = createMessageEl('AI', '', 'ai');
    var aiContent = aiMsg.querySelector('.msg-content');
    aiContent.innerHTML = '<span style="color: var(--text-tertiary);">正在生成...</span>';
    messagesContainer.appendChild(aiMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    updateAIStatus('正在写作：' + outlineItem);

    isGenerating = true;
    var context = getWorkContext();
    var editorText = getEditorText();
    var messages = window.AIService.PROMPTS.autoWriteByOutline(context, editorText, outlineItem, prevItem);

    var firstChunk = true;

    window.AIService.chat(messages, {
      stream: true,
      temperature: 0.8,
      max_tokens: 1500,
      onChunk: function(delta, fullContent) {
        if (firstChunk) { aiContent.innerHTML = ''; firstChunk = false; }
        aiContent.innerHTML = formatAIResponse(fullContent);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      },
      onDone: function(fullContent) {
        if (firstChunk) { aiContent.textContent = fullContent || '(空回复)'; }

        var article = document.querySelector('article');
        if (article && fullContent) {
          var paragraphs = processNovelText(fullContent, { filterHeadings: true, cleanMarkdown: true, optimizeDialogue: true });
          var html = paragraphsToHtml(paragraphs, { textIndent: true });
          article.insertAdjacentHTML('beforeend', html);

          // 添加继续按钮
          var actionsDiv = document.createElement('div');
          actionsDiv.style.cssText = 'margin-top:12px; display:flex; gap:8px;';

          if (currentIndex < outlineItems.length - 1) {
            var nextBtn = document.createElement('button');
            nextBtn.textContent = '写下一段';
            nextBtn.style.cssText = 'padding:4px 12px; height:28px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; font-size:12px; cursor:pointer;';
            nextBtn.addEventListener('click', function() {
              startWritingByOutline(outlineItems, currentIndex + 1, messagesContainer);
            });
            actionsDiv.appendChild(nextBtn);
          }

          var finishBtn = document.createElement('button');
          finishBtn.textContent = '完成写作';
          finishBtn.style.cssText = 'padding:4px 12px; height:28px; background:transparent; color:var(--text-secondary); border:1px solid var(--border-neutral-l2); border-radius:6px; font-size:12px; cursor:pointer;';
          actionsDiv.appendChild(finishBtn);

          aiContent.appendChild(actionsDiv);
        }

        chatHistory.push({ role: 'user', content: outlineItem });
        chatHistory.push({ role: 'assistant', content: fullContent });
        isGenerating = false;
        updateAIStatus('就绪');

        if (typeof updateWordCount === 'function') updateWordCount();
        if (typeof saveCurrentChapter === 'function') saveCurrentChapter();
      },
      onError: function(err) {
        aiContent.innerHTML = '<span style="color: #f87171;">调用失败: ' + escapeHtml(err.message) + '</span>';
        isGenerating = false;
        updateAIStatus('就绪');
      }
    });
  }

  // 显示排版对话框
  function showFormatDialog() {
    var editorText = getEditorText();
    if (!editorText) {
      showNotification('编辑器中没有内容', 'warn');
      return;
    }

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:9999; display:flex; align-items:center; justify-content:center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'background:var(--bg-base-secondary); border:1px solid var(--border-neutral-l2); border-radius:12px; padding:24px; width:420px; max-width:90%; box-shadow:0 8px 32px rgba(0,0,0,0.4);';

    dialog.innerHTML =
      '<h3 style="font-size:16px; color:var(--text-default); font-weight:600; margin-bottom:16px;">智能排版</h3>' +
      '<div style="display:flex; flex-direction:column; gap:12px;">' +
        '<button class="format-btn" data-type="dialogue" style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:8px; cursor:pointer;">' +
          '<div><div style="font-size:13px; color:var(--text-default);">对话格式化</div><div style="font-size:11px; color:var(--text-tertiary);">优化对话标签和分段</div></div>' +
          '<img src="../assets/icons/dl-builtin-trae/message-circle.svg" width="18" height="18" alt="" style="opacity:0.6;">' +
        '</button>' +
        '<button class="format-btn" data-type="timeline" style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:8px; cursor:pointer;">' +
          '<div><div style="font-size:13px; color:var(--text-default);">时间线检查</div><div style="font-size:11px; color:var(--text-tertiary);">检查时间顺序一致性</div></div>' +
          '<img src="../assets/icons/dl-builtin-trae/clock.svg" width="18" height="18" alt="" style="opacity:0.6;">' +
        '</button>' +
        '<div style="border-top:1px solid var(--border-neutral-l2); padding-top:12px; margin-top:4px;">' +
          '<div style="font-size:12px; color:var(--text-tertiary); margin-bottom:8px;">导出为平台格式</div>' +
          '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
            '<button class="export-btn" data-platform="起点" style="padding:6px 12px; height:28px; background:var(--bg-overlay-l1); border:1px solid var(--border-neutral-l2); border-radius:6px; color:var(--text-secondary); font-size:12px; cursor:pointer;">起点</button>' +
            '<button class="export-btn" data-platform="晋江" style="padding:6px 12px; height:28px; background:var(--bg-overlay-l1); border:1px solid var(--border-neutral-l2); border-radius:6px; color:var(--text-secondary); font-size:12px; cursor:pointer;">晋江</button>' +
            '<button class="export-btn" data-platform="番茄" style="padding:6px 12px; height:28px; background:var(--bg-overlay-l1); border:1px solid var(--border-neutral-l2); border-radius:6px; color:var(--text-secondary); font-size:12px; cursor:pointer;">番茄</button>' +
            '<button class="export-btn" data-platform="知乎" style="padding:6px 12px; height:28px; background:var(--bg-overlay-l1); border:1px solid var(--border-neutral-l2); border-radius:6px; color:var(--text-secondary); font-size:12px; cursor:pointer;">知乎</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div style="margin-top:16px; display:flex; justify-content:flex-end;">' +
        '<button class="close-format-dialog" style="padding:6px 16px; height:32px; background:transparent; color:var(--text-secondary); border:1px solid var(--border-neutral-l1); border-radius:6px; cursor:pointer; font-size:13px;">关闭</button>' +
      '</div>';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    dialog.querySelector('.close-format-dialog').addEventListener('click', function() { overlay.remove(); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

    // 格式化按钮
    var formatBtns = dialog.querySelectorAll('.format-btn');
    formatBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var type = btn.getAttribute('data-type');
        overlay.remove();
        executeFormat(type, editorText);
      });
      btn.addEventListener('mouseenter', function() { btn.style.borderColor = 'var(--border-brand)'; });
      btn.addEventListener('mouseleave', function() { btn.style.borderColor = 'var(--border-neutral-l2)'; });
    });

    // 导出按钮
    var exportBtns = dialog.querySelectorAll('.export-btn');
    exportBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var platform = btn.getAttribute('data-platform');
        overlay.remove();
        executeExport(platform, editorText);
      });
    });
  }

  // 执行格式化
  function executeFormat(type, text) {
    var messagesContainer = document.getElementById('chat-messages-container');
    if (!messagesContainer) return;

    var actionName = type === 'dialogue' ? '对话格式化' : '时间线检查';
    var userMsg = createMessageEl('用户', actionName, 'user');
    messagesContainer.appendChild(userMsg);

    var aiMsg = createMessageEl('AI', '', 'ai');
    var aiContent = aiMsg.querySelector('.msg-content');
    aiContent.innerHTML = '<span style="color: var(--text-tertiary);">正在处理...</span>';
    messagesContainer.appendChild(aiMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    isGenerating = true;
    var messages = type === 'dialogue'
      ? window.AIService.PROMPTS.formatDialogue(text)
      : window.AIService.PROMPTS.checkTimeline(text);

    var firstChunk = true;

    window.AIService.chat(messages, {
      stream: true,
      temperature: 0.3,
      max_tokens: 4000,
      onChunk: function(delta, fullContent) {
        if (firstChunk) { aiContent.innerHTML = ''; firstChunk = false; }
        aiContent.innerHTML = formatAIResponse(fullContent);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      },
      onDone: function(fullContent) {
        if (firstChunk) { aiContent.textContent = fullContent || '(空回复)'; }

        if (type === 'dialogue') {
          addApplyButton(aiContent, fullContent, { label: '格式化' });
        }

        chatHistory.push({ role: 'user', content: actionName });
        chatHistory.push({ role: 'assistant', content: fullContent });
        isGenerating = false;
      },
      onError: function(err) {
        aiContent.innerHTML = '<span style="color: #f87171;">调用失败: ' + escapeHtml(err.message) + '</span>';
        isGenerating = false;
      }
    });
  }

  // 执行导出
  function executeExport(platform, text) {
    var messagesContainer = document.getElementById('chat-messages-container');
    if (!messagesContainer) return;

    var userMsg = createMessageEl('用户', '导出为 ' + platform + ' 格式', 'user');
    messagesContainer.appendChild(userMsg);

    var aiMsg = createMessageEl('AI', '', 'ai');
    var aiContent = aiMsg.querySelector('.msg-content');
    aiContent.innerHTML = '<span style="color: var(--text-tertiary);">正在转换格式...</span>';
    messagesContainer.appendChild(aiMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    isGenerating = true;
    var messages = window.AIService.PROMPTS.exportForPlatform(text, platform);

    var firstChunk = true;

    window.AIService.chat(messages, {
      stream: true,
      temperature: 0.2,
      max_tokens: 8000,
      onChunk: function(delta, fullContent) {
        if (firstChunk) { aiContent.innerHTML = ''; firstChunk = false; }
        aiContent.innerHTML = formatAIResponse(fullContent);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      },
      onDone: function(fullContent) {
        if (firstChunk) { aiContent.textContent = fullContent || '(空回复)'; }

        // 添加复制按钮
        var actionsDiv = document.createElement('div');
        actionsDiv.style.cssText = 'margin-top:12px; display:flex; gap:8px;';

        var copyBtn = document.createElement('button');
        copyBtn.textContent = '复制全文';
        copyBtn.style.cssText = 'padding:4px 12px; height:28px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; font-size:12px; cursor:pointer;';
        copyBtn.addEventListener('click', function() {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(fullContent).then(function() {
              showNotification('已复制到剪贴板，可直接粘贴到 ' + platform, 'info');
            });
          }
        });

        actionsDiv.appendChild(copyBtn);
        aiContent.appendChild(actionsDiv);

        chatHistory.push({ role: 'user', content: '导出 ' + platform + ' 格式' });
        chatHistory.push({ role: 'assistant', content: fullContent });
        isGenerating = false;
      },
      onError: function(err) {
        aiContent.innerHTML = '<span style="color: #f87171;">调用失败: ' + escapeHtml(err.message) + '</span>';
        isGenerating = false;
      }
    });
  }

  // ========== 主初始化函数 ==========
  function initQuickActions() {
    // 渲染快捷按钮
    renderQuickButtons();

    // 展开更多按钮
    var expandBtn = document.getElementById('expand-actions-btn');
    var expandedContainer = document.getElementById('expanded-actions-container');

    if (expandBtn && expandedContainer) {
      expandBtn.addEventListener('click', function() {
        expandedContainer.classList.toggle('hidden');
        var icon = expandBtn.querySelector('img');
        if (expandedContainer.classList.contains('hidden')) {
          icon.style.transform = 'rotate(0deg)';
          expandBtn.lastChild.textContent = '更多功能';
        } else {
          icon.style.transform = 'rotate(180deg)';
          expandBtn.lastChild.textContent = '收起';
        }
      });
    }

    // 自定义按钮
    var customizeBtn = document.getElementById('customize-buttons-btn');
    if (customizeBtn) {
      customizeBtn.addEventListener('click', function() {
        showCustomizeButtonsDialog();
      });
    }
  }

  // 显示自定义按钮对话框
  function showCustomizeButtonsDialog() {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:9999; display:flex; align-items:center; justify-content:center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'background:var(--bg-base-secondary); border:1px solid var(--border-neutral-l2); border-radius:12px; padding:24px; width:500px; max-width:90%; max-height:70vh; overflow-y:auto; box-shadow:0 8px 32px rgba(0,0,0,0.4);';

    var allButtons = DEFAULT_QUICK_BUTTONS.concat(EXPANDED_BUTTONS);
    var buttonListHtml = allButtons.map(function(btn) {
      return '<div class="button-item" data-id="' + btn.id + '" style="display:flex; align-items:center; gap:12px; padding:8px; border:1px solid var(--border-neutral-l2); border-radius:6px; margin-bottom:8px; cursor:move;">' +
        '<input type="checkbox" class="button-toggle" data-id="' + btn.id + '" style="width:16px; height:16px;">' +
        '<span style="font-size:13px; color:var(--text-default); flex:1;">' + btn.label + '</span>' +
        '<span style="font-size:11px; color:var(--text-tertiary);">' + btn.desc + '</span>' +
      '</div>';
    }).join('');

    dialog.innerHTML =
      '<h3 style="font-size:16px; color:var(--text-default); font-weight:600; margin-bottom:16px;">自定义快捷按钮</h3>' +
      '<p style="font-size:12px; color:var(--text-tertiary); margin-bottom:12px;">勾选显示的按钮，拖动调整顺序。前5个显示在快捷区，其余在"更多功能"中。</p>' +
      '<div id="button-list" style="max-height:300px; overflow-y:auto;">' + buttonListHtml + '</div>' +
      '<div style="margin-top:16px; display:flex; gap:8px; justify-content:flex-end;">' +
        '<button class="cancel-customize" style="padding:6px 16px; height:32px; background:transparent; color:var(--text-secondary); border:1px solid var(--border-neutral-l1); border-radius:6px; cursor:pointer; font-size:13px;">取消</button>' +
        '<button class="save-customize" style="padding:6px 16px; height:32px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; cursor:pointer; font-size:13px;">保存</button>' +
      '</div>';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // 加载当前配置
    var currentConfig = getButtonConfig();
    var enabledIds = currentConfig.quickButtons.map(function(b) { return b.id; });
    var checkboxes = dialog.querySelectorAll('.button-toggle');
    checkboxes.forEach(function(cb) {
      cb.checked = enabledIds.indexOf(cb.getAttribute('data-id')) !== -1;
    });

    // 事件
    dialog.querySelector('.cancel-customize').addEventListener('click', function() { overlay.remove(); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

    dialog.querySelector('.save-customize').addEventListener('click', function() {
      var checkedIds = [];
      dialog.querySelectorAll('.button-toggle:checked').forEach(function(cb) {
        checkedIds.push(cb.getAttribute('data-id'));
      });

      var newQuickButtons = [];
      var newExpandedButtons = [];

      checkedIds.forEach(function(id, index) {
        var btnConfig = allButtons.find(function(b) { return b.id === id; });
        if (btnConfig) {
          if (index < 5) {
            newQuickButtons.push(btnConfig);
          } else {
            newExpandedButtons.push(btnConfig);
          }
        }
      });

      // 添加未勾选的到扩展区
      allButtons.forEach(function(btn) {
        if (checkedIds.indexOf(btn.id) === -1) {
          newExpandedButtons.push(btn);
        }
      });

      saveCustomButtons({
        quickButtons: newQuickButtons,
        expandedButtons: newExpandedButtons
      });

      renderQuickButtons();
      overlay.remove();
      showNotification('快捷按钮已更新', 'info');
    });
  }

  // ========== 通知提示 ==========
  function showNotification(text, type) {
    var existing = document.getElementById('notification-bar');
    if (existing) existing.remove();

    var bar = document.createElement('div');
    bar.id = 'notification-bar';
    var bg = type === 'error' ? '#ef4444' : type === 'warn' ? '#f59e0b' : 'var(--bg-brand)';
    bar.style.cssText = 'position:fixed; top:16px; left:50%; transform:translateX(-50%); z-index:9999; padding:8px 20px; background:' + bg + '; color:#fff; border-radius:8px; font-size:13px; box-shadow:0 4px 16px rgba(0,0,0,0.3); transition:opacity 0.3s;';
    bar.textContent = text;
    document.body.appendChild(bar);

    setTimeout(function() {
      bar.style.opacity = '0';
      setTimeout(function() { bar.remove(); }, 300);
    }, 3000);
  }

  // ========== 模型选择器 + API 配置面板 ==========
  function initModelSelector() {
    var trigger = document.getElementById('ai-model-trigger');
    var popup = document.getElementById('ai-model-popup');
    var modelName = document.getElementById('ai-model-name');
    var options = popup ? popup.querySelectorAll('.ai-model-option') : [];
    var addApiTrigger = document.getElementById('add-api-trigger');
    var apiPanel = document.getElementById('add-api-panel');
    var closeApiPanel = document.getElementById('close-api-panel');
    var creatorTrigger = document.getElementById('creator-profile-trigger');
    var creatorPopup = document.getElementById('creator-popup');

    if (window.AIService && modelName) {
      var currentModel = window.AIService.getCurrentModel();
      modelName.textContent = currentModel || '未配置';
    }

    if (trigger && popup) {
      trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        popup.classList.toggle('hidden');
        if (creatorPopup) creatorPopup.classList.add('hidden');
        if (apiPanel) apiPanel.classList.add('hidden');
        updateModelStatus();
        renderModelOptions();
      });
    }

    if (addApiTrigger && apiPanel) {
      addApiTrigger.addEventListener('click', function(e) {
        e.stopPropagation();
        apiPanel.classList.toggle('hidden');
      });
    }

    if (closeApiPanel && apiPanel) {
      closeApiPanel.addEventListener('click', function(e) {
        e.stopPropagation();
        apiPanel.classList.add('hidden');
      });
    }

    var apiConfirmBtn = apiPanel ? apiPanel.querySelector('button') : null;
    if (apiConfirmBtn) {
      apiConfirmBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        var inputs = apiPanel.querySelectorAll('input');
        var modelNameVal = inputs[0] ? inputs[0].value.trim() : '';
        var apiUrlVal = inputs[1] ? inputs[1].value.trim() : '';
        var apiKeyVal = inputs[2] ? inputs[2].value.trim() : '';

        if (!modelNameVal || !apiUrlVal || !apiKeyVal) {
          showNotification('请填写所有字段', 'warn');
          return;
        }

        var provider = 'openai';
        if (apiUrlVal.indexOf('anthropic.com') !== -1) {
          provider = 'anthropic';
        }

        var config = {
          provider: provider,
          model: modelNameVal,
          apiUrl: apiUrlVal,
          apiKey: apiKeyVal
        };

        window.AIService.setModelConfig(modelNameVal, config);
        window.AIService.setCurrentModel(modelNameVal);
        showNotification('已添加模型: ' + modelNameVal, 'info');

        inputs.forEach(function(inp) { inp.value = ''; });
        apiPanel.classList.add('hidden');
        updateModelStatus();
      });
    }

    if (creatorTrigger && creatorPopup) {
      creatorTrigger.addEventListener('click', function(e) {
        e.stopPropagation();
        creatorPopup.classList.toggle('hidden');
        if (popup) popup.classList.add('hidden');
        if (apiPanel) apiPanel.classList.add('hidden');
      });
    }

    document.addEventListener('click', function(e) {
      if (popup && trigger && !popup.contains(e.target) && !trigger.contains(e.target) &&
          (!apiPanel || !apiPanel.contains(e.target))) {
        popup.classList.add('hidden');
      }
      if (apiPanel && !apiPanel.contains(e.target) &&
          (!addApiTrigger || !addApiTrigger.contains(e.target))) {
        apiPanel.classList.add('hidden');
      }
      if (creatorPopup && creatorTrigger &&
          !creatorPopup.contains(e.target) && !creatorTrigger.contains(e.target)) {
        creatorPopup.classList.add('hidden');
      }
    });
  }

  function updateModelStatus() {
    if (!window.AIService) return;
    var config = window.AIService.getModelsConfig();
    var options = document.querySelectorAll('.ai-model-option');
    options.forEach(function(opt) {
      var name = opt.getAttribute('data-model');
      var modelConfig = config[name];
      var statusEl = opt.querySelector('.api-status');
      if (modelConfig && modelConfig.apiKey) {
        if (!statusEl) {
          statusEl = document.createElement('span');
          statusEl.className = 'api-status';
          statusEl.style.cssText = 'font-size:10px; color:var(--icon-brand); margin-left:auto;';
          statusEl.textContent = '已配置';
          opt.appendChild(statusEl);
        } else {
          statusEl.textContent = '已配置';
          statusEl.style.color = 'var(--icon-brand)';
        }
      } else if (statusEl) {
        statusEl.textContent = '未配置';
        statusEl.style.color = 'var(--text-tertiary)';
      }
    });
  }

  function renderModelOptions() {
    var popup = document.getElementById('ai-model-popup');
    if (!popup || !window.AIService) return;

    var config = window.AIService.getModelsConfig();
    var modelNameEl = document.getElementById('ai-model-name');

    var optionsContainer = popup.querySelector('.flex.flex-col');
    if (!optionsContainer) return;

    optionsContainer.innerHTML = '';

    var modelNames = Object.keys(config);
    if (modelNames.length === 0) {
      var emptyMsg = document.createElement('div');
      emptyMsg.style.cssText = 'padding:16px; text-align:center; font-size:13px; color:var(--text-tertiary);';
      emptyMsg.textContent = '暂无模型，请点击下方"添加自定义 API"';
      optionsContainer.appendChild(emptyMsg);
      return;
    }

    var currentModel = window.AIService.getCurrentModel();
    if (modelNameEl) modelNameEl.textContent = currentModel;

    modelNames.forEach(function(name) {
      var opt = document.createElement('div');
      opt.className = 'ai-model-option';
      opt.setAttribute('data-model', name);
      opt.style.cssText = 'display:flex; align-items:center; gap:8px; padding:8px 12px; cursor:pointer; transition:background 0.15s;';
      if (name === currentModel) {
        opt.style.background = 'var(--bg-overlay-l1)';
      }

      var isBuiltin = window.AIService.BUILTIN_MODELS[name];
      var hasApiKey = config[name].apiKey;

      opt.innerHTML =
        '<img src="../assets/icons/dl-builtin-trae/check.svg" width="14" height="14" alt="" class="' + (name === currentModel ? '' : 'opacity-0') + '" style="color:var(--icon-brand);">' +
        '<span style="font-size:13px; color:var(--text-default);">' + name + '</span>' +
        '<span class="api-status" style="font-size:10px; color:var(--text-tertiary); margin-left:auto;">' + (hasApiKey ? '已配置' : '未配置') + '</span>' +
        (isBuiltin && !hasApiKey ? '<button class="config-model-btn" style="padding:2px 8px; height:24px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:4px; font-size:11px; cursor:pointer;">配置</button>' : '') +
        '<button class="delete-model-btn" style="width:20px; height:20px; border:none; background:transparent; color:var(--text-tertiary); font-size:12px; cursor:pointer; padding:0; display:flex; align-items:center; justify-content:center;">✕</button>';

      opt.addEventListener('click', function(e) {
        if (e.target.closest('.delete-model-btn') || e.target.closest('.config-model-btn')) return;
        e.stopPropagation();
        if (modelNameEl) modelNameEl.textContent = name;
        window.AIService.setCurrentModel(name);
        popup.classList.add('hidden');
        showNotification('已切换到 ' + name, 'info');
      });

      var configBtn = opt.querySelector('.config-model-btn');
      if (configBtn) {
        configBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          showPresetModelConfigPanel(name);
        });
      }

      var delModelBtn = opt.querySelector('.delete-model-btn');
      if (delModelBtn) {
        delModelBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          showConfirmDialog('确定删除模型 "' + name + '" 的配置吗？', function() {
            window.AIService.deleteModelConfig(name);
            var remaining = Object.keys(window.AIService.getModelsConfig());
            if (remaining.length > 0) {
              window.AIService.setCurrentModel(remaining[0]);
            }
            renderModelOptions();
            updateModelStatus();
            showNotification('模型 "' + name + '" 已删除', 'info');
          });
        });
      }

      optionsContainer.appendChild(opt);
    });
  }

  function showPresetModelConfigPanel(modelName) {
    var builtinConfig = window.AIService.BUILTIN_MODELS[modelName];
    if (!builtinConfig) return;

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:9999; display:flex; align-items:center; justify-content:center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'background:var(--bg-base-secondary); border:1px solid var(--border-neutral-l2); border-radius:12px; padding:24px; width:360px; max-width:90%; box-shadow:0 8px 32px rgba(0,0,0,0.4); animation:fadeIn 0.2s ease-out;';

    dialog.innerHTML =
      '<div style="display:flex; items-center; justify-content:space-between; margin-bottom:16px;">' +
      '<h3 style="font-size:16px; color:var(--text-default); font-weight:600;">配置 ' + modelName + '</h3>' +
      '<img src="../assets/icons/dl-builtin-trae/x.svg" width="16" height="16" alt="关闭" class="close-dialog-btn cursor-pointer opacity-50" style="cursor:pointer;">' +
      '</div>' +
      '<div style="margin-bottom:16px;">' +
      '<div style="font-size:12px; color:var(--text-tertiary); margin-bottom:4px;">模型</div>' +
      '<div style="font-size:13px; color:var(--text-default);">' + builtinConfig.model + '</div>' +
      '</div>' +
      '<div style="margin-bottom:16px;">' +
      '<div style="font-size:12px; color:var(--text-tertiary); margin-bottom:4px;">API 地址</div>' +
      '<div style="font-size:12px; color:var(--text-secondary); word-break:break-all;">' + builtinConfig.apiUrl + '</div>' +
      '</div>' +
      '<div class="flex flex-col gap-1">' +
      '<label style="font-size:12px; color:var(--text-tertiary);">API Key</label>' +
      '<input type="password" placeholder="sk-..." class="rounded-md px-2.5 py-1.5 border-none outline-none" style="height:32px; background:var(--bg-base-tertiary); color:var(--text-default); font-size:13px; border:1px solid var(--border-neutral-l2);">' +
      '</div>' +
      '<div style="display:flex; gap:8px; justify-content:flex-end; margin-top:20px;">' +
      '<button class="cancel-btn" style="padding:6px 16px; height:32px; background:transparent; color:var(--text-secondary); border:1px solid var(--border-neutral-l1); border-radius:6px; cursor:pointer; font-size:13px;">取消</button>' +
      '<button class="confirm-btn" style="padding:6px 16px; height:32px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; cursor:pointer; font-size:13px;">确认配置</button>' +
      '</div>';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    var input = dialog.querySelector('input');
    input.focus();

    function closeDialog() {
      overlay.remove();
    }

    function confirm() {
      var apiKey = input.value.trim();
      if (!apiKey) {
        showNotification('请输入 API Key', 'warn');
        return;
      }

      var config = {
        provider: builtinConfig.provider,
        model: builtinConfig.model,
        apiUrl: builtinConfig.apiUrl,
        apiKey: apiKey
      };

      window.AIService.setModelConfig(modelName, config);
      window.AIService.setCurrentModel(modelName);

      closeDialog();
      renderModelOptions();
      updateModelStatus();

      var modelNameEl = document.getElementById('ai-model-name');
      if (modelNameEl) modelNameEl.textContent = modelName;

      showNotification(modelName + ' 配置成功', 'info');
    }

    dialog.querySelector('.close-dialog-btn').addEventListener('click', closeDialog);
    dialog.querySelector('.cancel-btn').addEventListener('click', closeDialog);
    dialog.querySelector('.confirm-btn').addEventListener('click', confirm);
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') confirm();
      if (e.key === 'Escape') closeDialog();
    });
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeDialog();
    });
  }

  // ========== 素材库 AI 功能 ==========
  function initMaterialsAI() {
    var generateBtn = null;
    var allButtons = document.querySelectorAll('button');
    allButtons.forEach(function(btn) {
      if (btn.textContent.indexOf('AI 生成素材') !== -1) { generateBtn = btn; }
    });

    if (generateBtn) {
      generateBtn.addEventListener('click', function() {
        if (isGenerating) return;
        
        // 获取当前选中的分类
        var activeCategory = '全部';
        var materialTabs = document.querySelectorAll('.materials-tabs .ds-tab');
        materialTabs.forEach(function(tab) {
          if (tab.classList.contains('is-active')) {
            activeCategory = tab.textContent.trim();
          }
        });
        
        showMaterialDialog('AI 生成素材', '请描述你需要的素材（例如：一个悬疑小说的开场场景）', function(description) {
          generateMaterial(description, activeCategory === '全部' ? '其他' : activeCategory);
        });
      });
    }

    // 注意：「AI 展开」和「引用」按钮的事件监听已在 initMaterialsPage() 中绑定，
    // 此处不再重复绑定，避免事件触发两次。
  }

  function showMaterialDialog(title, placeholder, onConfirm) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:9999; display:flex; align-items:center; justify-content:center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'background:var(--bg-base-secondary); border:1px solid var(--border-neutral-l2); border-radius:12px; padding:24px; width:420px; max-width:90%; box-shadow:0 8px 32px rgba(0,0,0,0.4);';

    dialog.innerHTML =
      '<h3 style="font-size:16px; color:var(--text-default); margin-bottom:16px;">' + escapeHtml(title) + '</h3>' +
      '<textarea placeholder="' + escapeHtml(placeholder) + '" style="width:100%; min-height:80px; padding:10px 12px; background:var(--bg-base-tertiary); color:var(--text-default); border:1px solid var(--border-neutral-l2); border-radius:8px; font-size:13px; resize:vertical; outline:none; box-sizing:border-box;"></textarea>' +
      '<div style="display:flex; gap:8px; justify-content:flex-end; margin-top:16px;">' +
      '<button class="cancel-btn" style="padding:6px 16px; height:32px; background:transparent; color:var(--text-secondary); border:1px solid var(--border-neutral-l1); border-radius:6px; cursor:pointer; font-size:13px;">取消</button>' +
      '<button class="confirm-btn" style="padding:6px 16px; height:32px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; cursor:pointer; font-size:13px;">生成</button>' +
      '</div>';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    var textarea = dialog.querySelector('textarea');
    var cancelBtn = dialog.querySelector('.cancel-btn');
    var confirmBtn = dialog.querySelector('.confirm-btn');

    textarea.focus();

    function close() { overlay.remove(); }

    cancelBtn.addEventListener('click', close);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });

    confirmBtn.addEventListener('click', function() {
      var desc = textarea.value.trim();
      close();
      onConfirm(desc);
    });
  }

  function generateMaterial(description, category) {
    showNotification('AI 正在生成素材...', 'info');

    var messages = window.AIService.PROMPTS.generateMaterial('不限', description);

    window.AIService.chat(messages, {
      stream: true,
      temperature: 0.9,
      max_tokens: 1000,
      onDone: function(fullContent) {
        showMaterialResult('AI 生成的素材', fullContent, category);
      },
      onError: function(err) {
        showNotification('生成失败: ' + err.message, 'error');
      }
    });
  }

  function expandMaterial(title, content, btn) {
    var originalText = btn.textContent;
    btn.textContent = '生成中...';
    btn.style.pointerEvents = 'none';
    isGenerating = true;

    var messages = window.AIService.PROMPTS.expandMaterial(title, content);

    window.AIService.chat(messages, {
      stream: true,
      temperature: 0.8,
      max_tokens: 1000,
      onDone: function(fullContent) {
        showMaterialResult('展开: ' + title, fullContent, '其他');
        btn.textContent = originalText;
        btn.style.pointerEvents = '';
        isGenerating = false;
      },
      onError: function(err) {
        showNotification('展开失败: ' + err.message, 'error');
        btn.textContent = originalText;
        btn.style.pointerEvents = '';
        isGenerating = false;
      }
    });
  }

  function showMaterialResult(title, content, category) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:9999; display:flex; align-items:center; justify-content:center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'background:var(--bg-base-secondary); border:1px solid var(--border-neutral-l2); border-radius:12px; padding:24px; width:500px; max-width:90%; max-height:70vh; box-shadow:0 8px 32px rgba(0,0,0,0.4); display:flex; flex-direction:column;';

    dialog.innerHTML =
      '<h3 style="font-size:16px; color:var(--text-default); margin-bottom:16px;">' + escapeHtml(title) + '</h3>' +
      '<div class="result-content" style="flex:1; overflow-y:auto; padding:12px; background:var(--bg-base-tertiary); border-radius:8px; font-size:13px; line-height:1.7; color:var(--text-default); margin-bottom:16px; white-space:pre-wrap;">' + escapeHtml(content) + '</div>' +
      '<div style="display:flex; gap:8px; justify-content:flex-end;">' +
      '<button class="save-btn" style="padding:6px 16px; height:32px; background:transparent; color:var(--text-brand); border:1px solid var(--border-brand); border-radius:6px; cursor:pointer; font-size:13px;">保存到素材库</button>' +
      '<button class="copy-btn" style="padding:6px 16px; height:32px; background:transparent; color:var(--text-secondary); border:1px solid var(--border-neutral-l1); border-radius:6px; cursor:pointer; font-size:13px;">复制</button>' +
      '<button class="close-btn" style="padding:6px 16px; height:32px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; cursor:pointer; font-size:13px;">关闭</button>' +
      '</div>';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // 关闭按钮
    dialog.querySelector('.close-btn').addEventListener('click', function() { overlay.remove(); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

    // 复制按钮
    dialog.querySelector('.copy-btn').addEventListener('click', function() {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(content).then(function() {
          showNotification('已复制到剪贴板', 'info');
        });
      }
    });

    // 保存到素材库按钮
    dialog.querySelector('.save-btn').addEventListener('click', function() {
      if (window.MaterialsStore) {
        var material = window.MaterialsStore.createMaterial({
          title: title.replace('AI 生成的素材', '').replace('展开: ', '').trim() || 'AI生成的素材',
          content: content,
          category: category || '其他',
          tags: [],
          source: 'ai-generated'
        });
        showNotification('已保存到素材库', 'info');
      }
    });
  }

  // ========== 新建作品 AI 辅助 ==========
  function initNewWorkAI() {
    var aiAssistBtn = document.querySelector('[data-dom-id="btn-ai-assist"]');
    if (!aiAssistBtn) return;

    aiAssistBtn.addEventListener('click', function() {
      if (isGenerating) return;

      var titleInput = document.getElementById('work-title-input');
      var title = titleInput ? titleInput.value.trim() : '';

      var descTextarea = document.querySelector('textarea');
      var description = descTextarea ? descTextarea.value.trim() : '';

      var selectedGenre = document.querySelector('.genre-chip.selected');
      var type = selectedGenre ? selectedGenre.textContent.trim() : '不限';

      if (!title && !description) {
        showNotification('请至少填写作品名称或简介', 'warn');
        return;
      }

      showNotification('AI 正在生成创作建议...', 'info');
      var messages = window.AIService.PROMPTS.assistNewWork(title, type, description);

      window.AIService.chat(messages, {
        stream: true,
        temperature: 0.8,
        max_tokens: 4096,
        onDone: function(fullContent) {
          showMaterialResult('AI 创作建议: ' + (title || '未命名作品'), fullContent);
        },
        onError: function(err) {
          showNotification('生成失败: ' + err.message, 'error');
        }
      });
    });
  }

  // ========== 响应式 ==========
  function initResponsive() {
    function handleResize() {
      var navPanel = document.querySelector('.flex.flex-col.w-\\[220px\\]');
      var isMobile = window.innerWidth < 768;

      if (isMobile && navPanel) {
        navPanel.style.width = '60px';
        var textElements = navPanel.querySelectorAll('span');
        textElements.forEach(function(el) { el.style.display = 'none'; });
      } else if (navPanel) {
        navPanel.style.width = '220px';
        var textElements = navPanel.querySelectorAll('span');
        textElements.forEach(function(el) { el.style.display = ''; });
      }
    }

    window.addEventListener('resize', handleResize);
    handleResize();
  }

  // ========== 表格排序 ==========
  function initSortableTables() {
    var tables = document.querySelectorAll('.ds-table-wrap table');
    tables.forEach(function(table) {
      var headers = table.querySelectorAll('th');
      headers.forEach(function(header) {
        header.style.cursor = 'pointer';
        header.addEventListener('click', function() {
          headers.forEach(function(h) {
            h.style.background = 'var(--bg-overlay-l1)';
            h.style.color = 'var(--text-tertiary)';
          });
          header.style.background = 'var(--bg-overlay-l2)';
          header.style.color = 'var(--text-default)';
        });
      });
    });
  }

  // ========== 卡片悬停 ==========
  function initCardHover() {
    var cards = document.querySelectorAll('.ds-card');
    cards.forEach(function(card) {
      card.addEventListener('mouseenter', function() {
        card.style.borderColor = 'var(--border-neutral-l2)';
        card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      });
      card.addEventListener('mouseleave', function() {
        card.style.borderColor = 'var(--border-neutral-l1)';
        card.style.boxShadow = 'none';
      });
    });
  }

  // ========== 初始化 ==========
  document.addEventListener('DOMContentLoaded', function() {
    initNav();
    initTabs();
    initButtons();
    initDialogs();
    initFileTree();
    initEditorTabs();
    initSearch();
    initPagination();
    initModelSelector();
    initResponsive();
    initSortableTables();
    initCardHover();
    initWorksPage();
    initMaterialsPage();
    initNewWorkPage();
    initOutlineTree();
    initFormattingToolbar();
    initNotificationCenter();
    initSettings();
    initCreatorMenu();
    initEditorPage();

    if (window.AIService) {
      initComposer();
      initMemoryPanel();
      initQuickActions();
      initMaterialsAI();
      initNewWorkAI();
      initAutoSave();
      updateModelStatus();
    }
  });
})();