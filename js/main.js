(function() {
  'use strict';

  var chatHistory = [];
  var isGenerating = false;

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

  function cleanMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/~~(.+?)~~/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1');
  }

  function smartSplitParagraphs(text) {
    if (!text) return [];
    var rawParagraphs = text.split(/\n\s*\n/).filter(function(p) { return p.trim(); });
    if (rawParagraphs.length > 1) {
      return rawParagraphs.map(function(p) {
        return p.replace(/\n/g, '').trim();
      }).filter(function(p) { return p; });
    }

    var content = text.replace(/\n/g, ' ').trim();
    if (!content) return [];

    var paragraphs = [];
    var minLength = 80;
    var maxLength = 200;

    var sentences = content.split(/([。！？!?])/);
    var buffer = '';

    for (var i = 0; i < sentences.length; i++) {
      var part = sentences[i];
      if (/[。！？!?]/.test(part)) {
        buffer += part;
        if (buffer.length >= minLength && paragraphs.length > 0) {
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

    if (paragraphs.length <= 1 && content.length > maxLength * 2) {
      paragraphs = [];
      var remaining = content;
      while (remaining.length > 0) {
        if (remaining.length <= maxLength) {
          paragraphs.push(remaining.trim());
          break;
        }
        var splitPos = maxLength;
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

  function optimizeDialogueFormat(paragraphs) {
    if (!paragraphs || paragraphs.length === 0) return [];

    var result = [];
    for (var i = 0; i < paragraphs.length; i++) {
      var para = paragraphs[i];
      var dialoguePattern = /[“"][^”"]+[”"][，。！？,?!]?/g;
      var dialogues = para.match(dialoguePattern);

      if (dialogues && dialogues.length > 0 && para.length > 150) {
        var parts = para.split(/([“"][^”"]+[”"][，。！？,?!]?)/);
        var currentNarrative = '';

        for (var j = 0; j < parts.length; j++) {
          var part = parts[j].trim();
          if (!part) continue;

          if (/^[“"]/.test(part)) {
            if (currentNarrative.trim()) {
              result.push(currentNarrative.trim());
              currentNarrative = '';
            }
            result.push(part);
          } else {
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

  function processNovelText(text, options) {
    options = options || {};
    var result = text;

    if (options.filterHeadings !== false) {
      result = filterHeadings(result);
    }

    if (options.cleanMarkdown !== false) {
      result = cleanMarkdown(result);
    }

    var paragraphs = smartSplitParagraphs(result);

    if (options.optimizeDialogue !== false) {
      paragraphs = optimizeDialogueFormat(paragraphs);
    }

    return paragraphs;
  }

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
      var safeHtml = window.Utils ? window.Utils.escapeHtml(p) : p;
      if (window.Utils && window.Utils.sanitizeHtml) {
        safeHtml = window.Utils.sanitizeHtml(safeHtml);
      }
      return '<p ' + style + '>' + safeHtml + '</p>';
    }).join('');
  }

  function getEditorText() {
    var article = document.querySelector('article');
    if (!article) return '';
    return article.innerText.trim();
  }

  function getWorkContext() {
    var activeTab = document.querySelector('.ds-editortab.is-active, [role="tab"][aria-selected="true"]');
    var chapter = activeTab ? activeTab.textContent.trim() : '未命名章节';

    var workNameEl = document.querySelector('h1');
    var workName = workNameEl ? workNameEl.textContent.trim() : '未命名作品';

    var currentWork = window.WorksStore ? window.WorksStore.getCurrentWork() : null;
    var outline = [];
    var description = '';
    var genre = '';
    var style = '';
    var targetWordCount = 0;

    if (currentWork) {
      description = currentWork.description || '';
      genre = currentWork.genre || '';
      style = currentWork.style || '';
      targetWordCount = currentWork.targetWordCount || 0;
    }

    var outlineItems = document.querySelectorAll('.outline-chapter-row');
    outlineItems.forEach(function(item) {
      var text = item.querySelector('span');
      if (text) outline.push(text.textContent.trim());
    });

    return {
      workName: workName,
      chapter: chapter,
      outline: outline,
      description: description,
      genre: genre,
      style: style,
      targetWordCount: targetWordCount
    };
  }

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

  function getWorksGrid() {
    var grids = document.querySelectorAll('.grid');
    for (var i = 0; i < grids.length; i++) {
      if (grids[i].classList.contains('grid-cols-1')) return grids[i];
    }
    return null;
  }

  function getMaterialsGrid() {
    var grids = document.querySelectorAll('.grid');
    for (var i = 0; i < grids.length; i++) {
      if (grids[i].classList.contains('grid-cols-1')) return grids[i];
    }
    return null;
  }

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
  }

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

  function initFileTree() {
    var rows = document.querySelectorAll('.ds-filetree__row');
    rows.forEach(function(row) {
      row.addEventListener('click', function() {
        rows.forEach(function(r) { r.classList.remove('is-active'); });
        row.classList.add('is-active');
      });
    });
  }

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
  }

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

  var worksCurrentPage = 1;
  var worksItemsPerPage = 6;

  function initWorksPage() {
    if (!document.querySelector('input[placeholder="搜索作品..."]') && getWorkFilterButtons().length === 0) {
      return;
    }

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
      searchInput.addEventListener('input', window.Utils ? window.Utils.debounce(renderWorksList, 300) : renderWorksList);
    }

    var newWorkBtns = findButtonsByText('新建作品');
    newWorkBtns.forEach(function(btn) {
      if (btn.getAttribute('data-dom-id') === 'nav-new-work') return;
      btn.addEventListener('click', function() {
        window.location.href = 'new-work.html';
      });
    });
  }

  function renderWorksList() {
    var grid = getWorksGrid();
    if (!grid) return;

    var searchInput = document.querySelector('input[placeholder="搜索作品..."]');
    var query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    var activeFilter = '全部';
    var filterBtns = getWorkFilterButtons();
    filterBtns.forEach(function(btn) {
      var isActive = btn.style.background === 'var(--bg-brand-popup)' || 
                     btn.style.background === 'rgb(47, 133, 90)' ||
                     btn.classList.contains('is-active');
      if (isActive) activeFilter = btn.textContent.trim();
    });

    var allWorks = window.WorksStore ? window.WorksStore.getAllWorks() : [];

    var filteredWorks = allWorks.filter(function(work) {
      var matchStatus = activeFilter === '全部' || work.status === activeFilter;
      var matchQuery = !query || 
        (work.title && work.title.toLowerCase().indexOf(query) !== -1) ||
        (work.genre && work.genre.toLowerCase().indexOf(query) !== -1);
      return matchStatus && matchQuery;
    });

    grid.innerHTML = '';

    if (filteredWorks.length === 0) {
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

    filteredWorks.forEach(function(work) {
      var card = createWorkCardFromData(work);
      grid.appendChild(card);
    });

    updateWorksStats(allWorks);
  }

  function createWorkCardFromData(work) {
    var card = document.createElement('div');
    card.className = 'rounded-md overflow-hidden cursor-pointer';
    card.dataset.workId = work.id;
    card.style.cssText = 'background: var(--bg-base-secondary); border: 1px solid var(--border-neutral-l1); border-radius: var(--radius-4); transition: transform 120ms cubic-bezier(.2,.8,.2,1), background-color 120ms cubic-bezier(.2,.8,.2,1);';

    var progressWidth = Math.min(100, work.progress || 0);
    var formatWordCount = window.Utils ? window.Utils.formatWordCount : function(c) { return c.toLocaleString(); };

    card.innerHTML =
      '<div class="relative" style="height: 120px; overflow: hidden; background: var(--bg-base-secondary);">' +
      '<div class="absolute inset-0" style="background: repeating-linear-gradient(0deg, transparent, transparent 10px, var(--bg-overlay-l1) 10px, var(--bg-overlay-l1) 12px), var(--bg-base-secondary);"></div>' +
      '<div class="absolute" style="bottom: 0; left: 0; right: 0; height: 3px; background: var(--bg-brand);"></div>' +
      '<div class="absolute top-2 left-2 inline-flex items-center justify-center whitespace-nowrap rounded-md px-2" style="height: 20px; font-size: 11px; background: var(--bg-overlay-l3); color: var(--text-default);">' + (window.Utils ? window.Utils.escapeHtml(work.genre || '未分类') : (work.genre || '未分类')) + '</div>' +
      '<button class="work-delete-btn" style="position:absolute; top:8px; right:8px; width:24px; height:24px; border-radius:4px; background:var(--bg-overlay-l3); border:none; color:var(--text-default); font-size:14px; cursor:pointer; display:none; align-items:center; justify-content:center;">✕</button>' +
      '</div>' +
      '<div class="p-3">' +
      '<div class="truncate" style="font-size: var(--heading-xs-font-size); font-weight: 600; color: var(--text-default); line-height: var(--heading-xs-line-height); margin-bottom: var(--spacer-4);">' + (window.Utils ? window.Utils.escapeHtml(work.title || '未命名') : (work.title || '未命名')) + '</div>' +
      '<div class="truncate" style="font-size: var(--body-xs-font-size); color: var(--text-secondary); line-height: 1.4; margin-bottom: var(--spacer-8);">' + (window.Utils ? window.Utils.escapeHtml(work.genre || '未分类') : (work.genre || '未分类')) + ' · ' + (work.chapters ? work.chapters.length : 0) + ' 章</div>' +
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

  function updateWorksStats(works) {
    var totalCount = works.length;
    var serializingCount = works.filter(function(w) { return w.status === '连载中'; }).length;
    var completedCount = works.filter(function(w) { return w.status === '已完结'; }).length;
    var totalWords = works.reduce(function(sum, w) { return sum + (w.totalWordCount || 0); }, 0);
    var formatWordCount = window.Utils ? window.Utils.formatWordCount : function(c) { return c.toLocaleString(); };

    var statNumbers = document.querySelectorAll('.stat-number');
    if (statNumbers.length >= 4) {
      statNumbers[0].textContent = totalCount;
      statNumbers[1].textContent = serializingCount;
      statNumbers[2].textContent = completedCount;
      statNumbers[3].textContent = formatWordCount(totalWords);
    }
  }

  function initMaterialsPage() {
    if (!document.querySelector('.materials-tabs') && document.querySelectorAll('.material-card').length === 0) {
      return;
    }

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
      searchInput.addEventListener('input', window.Utils ? window.Utils.debounce(renderMaterialsList, 300) : renderMaterialsList);
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

  function renderMaterialsList() {
    var grid = getMaterialsGrid();
    if (!grid) return;

    var searchInput = document.querySelector('.materials-tabs + .flex input');
    var query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    var activeCategory = '全部';
    var materialTabs = document.querySelectorAll('.materials-tabs .ds-tab');
    materialTabs.forEach(function(tab) {
      if (tab.classList.contains('is-active')) {
        activeCategory = tab.textContent.trim();
      }
    });

    var allMaterials = window.MaterialsStore ? window.MaterialsStore.getAllMaterials() : [];

    var filteredMaterials = allMaterials.filter(function(material) {
      var matchCategory = activeCategory === '全部' || material.category === activeCategory;
      var matchQuery = !query ||
        (material.title && material.title.toLowerCase().indexOf(query) !== -1) ||
        (material.content && material.content.toLowerCase().indexOf(query) !== -1) ||
        (material.tags && material.tags.some(function(t) { return t.toLowerCase().indexOf(query) !== -1; }));
      return matchCategory && matchQuery;
    });

    grid.innerHTML = '';

    if (filteredMaterials.length === 0) {
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

    filteredMaterials.forEach(function(material) {
      var card = createMaterialCardFromData(material);
      grid.appendChild(card);
    });
  }

  function createMaterialCardFromData(material) {
    var card = document.createElement('div');
    card.className = 'material-card';
    card.dataset.materialId = material.id;
    card.style.cssText = 'background: var(--bg-base-secondary); border: 1px solid var(--border-neutral-l1); border-radius: var(--radius-lg); padding: var(--spacer-12); transition: all 120ms cubic-bezier(.2,.8,.2,1); cursor: pointer;';

    var tagsHtml = '';
    if (material.tags && material.tags.length > 0) {
      material.tags.forEach(function(tag) {
        tagsHtml += '<span class="inline-flex items-center justify-center whitespace-nowrap rounded-md px-2" style="height: 20px; font-size: 11px; background: var(--bg-overlay-l2); color: var(--text-tertiary);">' + (window.Utils ? window.Utils.escapeHtml(tag) : tag) + '</span>';
      });
    }

    card.innerHTML =
      '<div class="flex items-start justify-between mb-2">' +
      '<span style="font-size: 11px; color: var(--text-tertiary);">' + (window.Utils ? window.Utils.escapeHtml(material.category || '其他') : (material.category || '其他')) + '</span>' +
      '<img src="../assets/icons/dl-builtin-trae/chevron-right.svg" width="14" height="14" alt="" class="opacity-30">' +
      '</div>' +
      '<h3 style="font-size: var(--body-sm-font-size); font-weight: 500; color: var(--text-default); margin-bottom: 6px;">' + (window.Utils ? window.Utils.escapeHtml(material.title || '未命名素材') : (material.title || '未命名素材')) + '</h3>' +
      '<p style="font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 8px;">' + (window.Utils ? window.Utils.escapeHtml(material.content || '') : (material.content || '')) + '</p>' +
      '<div class="flex items-center gap-1.5 flex-wrap">' + tagsHtml + '</div>' +
      '<div class="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-l1" style="border-color: var(--border-neutral-l1);">' +
      '<button class="copy-btn" style="padding: 4px 8px; background: transparent; border: none; color: var(--text-tertiary); font-size: 11px;">复制</button>' +
      '<button class="expand-btn" style="padding: 4px 8px; background: transparent; border: none; color: var(--text-brand); font-size: 11px;">AI 展开</button>' +
      '<button class="delete-btn" style="padding: 4px 8px; background: transparent; border: none; color: var(--text-tertiary); font-size: 11px; margin-left: auto;">删除</button>' +
      '</div>';

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

    var expandBtn = card.querySelector('.expand-btn');
    if (expandBtn) {
      expandBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        expandMaterial(material.title, material.content, expandBtn);
      });
    }

    card.addEventListener('click', function() {
      showMaterialDetail(material);
    });

    return card;
  }

  function showMaterialDetail(material) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:10000; display:flex; align-items:center; justify-content:center; padding:24px;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'background:var(--bg-base-secondary); border:1px solid var(--border-neutral-l2); border-radius:12px; width:100%; max-width:640px; max-height:80vh; display:flex; flex-direction:column; box-shadow:0 8px 32px rgba(0,0,0,0.4); animation:fadeIn 0.2s ease-out;';

    var tagsHtml = '';
    if (material.tags && material.tags.length > 0) {
      material.tags.forEach(function(tag) {
        tagsHtml += '<span class="inline-flex items-center justify-center whitespace-nowrap rounded-md px-2" style="height: 20px; font-size: 11px; background: var(--bg-overlay-l2); color: var(--text-tertiary); margin-right:6px;">' + (window.Utils ? window.Utils.escapeHtml(tag) : tag) + '</span>';
      });
    }

    dialog.innerHTML =
      '<div style="display:flex; items-center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--border-neutral-l1);">' +
      '<div>' +
      '<span style="font-size:11px; color:var(--text-tertiary); display:block; margin-bottom:4px;">' + (window.Utils ? window.Utils.escapeHtml(material.category || '其他') : (material.category || '其他')) + '</span>' +
      '<h3 style="font-size:18px; font-weight:600; color:var(--text-default); margin:0;">' + (window.Utils ? window.Utils.escapeHtml(material.title || '未命名素材') : (material.title || '未命名素材')) + '</h3>' +
      '</div>' +
      '<img src="../assets/icons/dl-builtin-trae/x.svg" width="20" height="20" alt="关闭" class="cursor-pointer opacity-50" id="close-material-detail" style="cursor:pointer;">' +
      '</div>' +
      '<div style="padding:16px 20px; overflow-y:auto; flex:1;">' +
      '<div style="margin-bottom:12px;">' + tagsHtml + '</div>' +
      '<div style="font-size:14px; color:var(--text-default); line-height:1.8; white-space:pre-wrap;">' + (window.Utils ? window.Utils.escapeHtml(material.content || '') : (material.content || '')) + '</div>' +
      '</div>' +
      '<div style="display:flex; justify-content:flex-end; gap:8px; padding:16px 20px; border-top:1px solid var(--border-neutral-l1);">' +
      '<button class="copy-detail-btn" style="padding:8px 16px; height:32px; background:transparent; color:var(--text-secondary); border:1px solid var(--border-neutral-l1); border-radius:6px; cursor:pointer; font-size:13px;">复制内容</button>' +
      '<button class="quote-detail-btn" style="padding:8px 16px; height:32px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; cursor:pointer; font-size:13px;">引用到编辑器</button>' +
      '</div>';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    document.getElementById('close-material-detail').addEventListener('click', function() {
      overlay.remove();
    });

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    var copyBtn = dialog.querySelector('.copy-detail-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function() {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(material.content || '').then(function() {
            showNotification('已复制到剪贴板', 'info');
          });
        }
      });
    }

    var quoteBtn = dialog.querySelector('.quote-detail-btn');
    if (quoteBtn) {
      quoteBtn.addEventListener('click', function() {
        showNotification('已引用 "' + (material.title || '素材') + '" 到编辑器', 'info');
        overlay.remove();
      });
    }
  }

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

        var descTextarea = document.querySelector('textarea');
        var description = descTextarea ? descTextarea.value.trim() : '';

        var selectedGenre = document.querySelector('.genre-chip.selected');
        var genre = selectedGenre ? selectedGenre.textContent.trim() : '科幻';

        var selectedStyle = document.querySelector('.style-chip.selected');
        var style = selectedStyle ? selectedStyle.textContent.trim() : '沉浸叙事';

        var selectedWordcount = document.querySelector('.wordcount-chip.selected');
        var wordcountText = selectedWordcount ? selectedWordcount.textContent.trim() : '3,000字';
        var targetWordCount = parseInt(wordcountText.replace(/[^0-9]/g, '')) || 3000;

        if (window.WorksStore) {
          var work = window.WorksStore.createWork({
            title: title,
            genre: genre,
            description: description,
            style: style,
            targetWordCount: targetWordCount
          });

          if (work && work.id) {
            window.WorksStore.setCurrentWork(work.id);
            
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

  var NOTIFICATIONS_KEY = 'ai_writing_notifications';
  var notifications = [];

  function loadNotifications() {
    try {
      var saved = localStorage.getItem(NOTIFICATIONS_KEY);
      if (saved) {
        notifications = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('加载通知失败:', e);
      notifications = [];
    }
    if (notifications.length === 0) {
      notifications = [
        { id: Date.now() - 86400000, type: 'system', icon: 'info.svg', title: '欢迎使用 AI 写作助手', message: '开始你的创作之旅吧！', time: Date.now() - 86400000, read: false },
        { id: Date.now() - 3600000, type: 'tip', icon: 'sparkles.32f08c.svg', title: '使用技巧', message: '选中文字后点击 AI 按钮可以对选中内容进行操作', time: Date.now() - 3600000, read: false }
      ];
      saveNotifications();
    }
  }

  function saveNotifications() {
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    } catch (e) {
      console.warn('保存通知失败:', e);
    }
  }

  function addNotification(type, title, message, icon) {
    var notification = {
      id: Date.now(),
      type: type || 'info',
      icon: icon || getNotificationIcon(type),
      title: title || '通知',
      message: message || '',
      time: Date.now(),
      read: false
    };
    notifications.unshift(notification);
    if (notifications.length > 50) {
      notifications = notifications.slice(0, 50);
    }
    saveNotifications();
    updateNotificationBadge();
    return notification;
  }

  function getNotificationIcon(type) {
    var iconMap = {
      'info': 'info.svg',
      'success': 'check-circle.33c192.svg',
      'warn': 'alert-triangle.svg',
      'error': 'alert-circle.svg',
      'auto_save': 'check-circle.33c192.svg',
      'ai': 'sparkles.32f08c.svg',
      'system': 'zap.svg',
      'tip': 'message-square.svg',
      'achievement': 'star.svg'
    };
    return iconMap[type] || 'info.svg';
  }

  function getUnreadCount() {
    return notifications.filter(function(n) { return !n.read; }).length;
  }

  function markAllAsRead() {
    notifications.forEach(function(n) { n.read = true; });
    saveNotifications();
    updateNotificationBadge();
  }

  function formatNotificationTime(timestamp) {
    var now = Date.now();
    var diff = now - timestamp;
    var minutes = Math.floor(diff / 60000);
    var hours = Math.floor(diff / 3600000);
    var days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return minutes + '分钟前';
    if (hours < 24) return hours + '小时前';
    if (days < 7) return days + '天前';

    var date = new Date(timestamp);
    return (date.getMonth() + 1) + '/' + date.getDate();
  }

  function updateNotificationBadge() {
    var bellContainer = document.querySelector('[style*="bell.svg"]')?.parentElement;
    if (!bellContainer) {
      var bellIcons = document.querySelectorAll('img[src*="bell.svg"]');
      bellIcons.forEach(function(bell) {
        var container = bell.parentElement;
        if (container) {
          updateBadgeOnContainer(container);
        }
      });
    } else {
      updateBadgeOnContainer(bellContainer);
    }
  }

  function updateBadgeOnContainer(container) {
    var unread = getUnreadCount();
    var badge = container.querySelector('.notification-badge');

    if (unread > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'notification-badge';
        badge.style.cssText = 'position:absolute; top:-4px; right:-4px; min-width:16px; height:16px; background:var(--bg-brand); color:var(--text-onbrand); font-size:10px; border-radius:8px; display:flex; align-items:center; justify-content:center; padding:0 4px; font-weight:600;';
        container.style.position = 'relative';
        container.appendChild(badge);
      }
      badge.textContent = unread > 99 ? '99+' : unread;
      badge.style.display = 'flex';
    } else {
      if (badge) {
        badge.style.display = 'none';
      }
    }
  }

  function initNotificationCenter() {
    loadNotifications();
    updateNotificationBadge();

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

    var notificationsData = notifications;

    var panel = document.createElement('div');
    panel.id = 'notification-panel';
    panel.style.cssText = 'position:fixed; top:72px; right:24px; width:360px; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.4); z-index:1000; padding:16px; animation: slideDown 0.2s ease-out;';

    var notificationsHtml = '';
    if (notificationsData.length === 0) {
      notificationsHtml = '<div style="text-align:center; padding:40px 20px; color:var(--text-tertiary); font-size:13px;">暂无通知</div>';
    } else {
      notificationsData.forEach(function(notification) {
        var unreadClass = notification.read ? 'opacity-70' : '';
        var unreadBadge = notification.read ? '' : '<span style="display:inline-block; width:8px; height:8px; background:var(--bg-brand); border-radius:50%; margin-right:6px; vertical-align:middle;"></span>';
        notificationsHtml +=
          '<div class="notification-item ' + unreadClass + '" data-id="' + notification.id + '" style="padding:12px; background:var(--bg-overlay-l1); border-radius:8px; margin-bottom:8px; cursor:pointer; transition: background 0.15s;">' +
          '<div style="display:flex; align-items:flex-start; gap:8px;">' +
          '<img src="../assets/icons/dl-builtin-trae/' + notification.icon + '" width="16" height="16" alt="" style="margin-top:1px; flex-shrink:0;">' +
          '<div class="flex-1 min-w-0">' +
          '<div style="font-size:13px; color:var(--text-default); margin-bottom:4px;">' + unreadBadge + notification.title + '</div>' +
          (notification.message ? '<div style="font-size:12px; color:var(--text-secondary); line-height:1.4; margin-bottom:4px;">' + notification.message + '</div>' : '') +
          '<div style="font-size:11px; color:var(--text-tertiary);">' + formatNotificationTime(notification.time) + '</div>' +
          '</div>' +
          '</div>' +
          '</div>';
      });
    }

    panel.innerHTML =
      '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">' +
      '<h3 style="font-size:14px; font-weight:600; color:var(--text-default);">通知中心</h3>' +
      '<div style="display:flex; align-items:center; gap:8px;">' +
      '<span id="mark-all-read" style="font-size:12px; color:var(--text-brand); cursor:pointer;">全部已读</span>' +
      '<span style="font-size:11px; color:var(--text-tertiary);">' + notificationsData.length + ' 条</span>' +
      '<img src="../assets/icons/dl-builtin-trae/x.svg" width="16" height="16" alt="关闭" class="cursor-pointer opacity-50" id="close-notification" style="margin-left:8px;">' +
      '</div>' +
      '</div>' +
      '<div style="max-height:360px; overflow-y:auto; padding-right:4px;">' +
      notificationsHtml +
      '</div>' +
      '<div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--border-neutral-l2); text-align:center;">' +
      '<span id="clear-all-notifications" style="font-size:12px; color:var(--text-tertiary); cursor:pointer;">清空所有通知</span>' +
      '</div>';

    document.body.appendChild(panel);

    var styleSheet = document.createElement('style');
    styleSheet.textContent = '.notification-item:hover { background: var(--bg-overlay-l2) !important; }';
    document.head.appendChild(styleSheet);

    document.getElementById('close-notification').addEventListener('click', function() { panel.remove(); });

    var markAllReadBtn = document.getElementById('mark-all-read');
    if (markAllReadBtn) {
      markAllReadBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        markAllAsRead();
        var items = panel.querySelectorAll('.notification-item');
        items.forEach(function(item) {
          item.classList.add('opacity-70');
          var badge = item.querySelector('span[style*="border-radius:50%"]');
          if (badge) badge.style.display = 'none';
        });
        showNotification('已全部标记为已读', 'info');
      });
    }

    var clearAllBtn = document.getElementById('clear-all-notifications');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (notifications.length === 0) return;
        confirmDialog('确认清空', '确定要清空所有通知吗？', function() {
          notifications = [];
          saveNotifications();
          updateNotificationBadge();
          panel.remove();
          showNotification('已清空所有通知', 'info');
        });
      });
    }

    var notificationItems = panel.querySelectorAll('.notification-item');
    notificationItems.forEach(function(item) {
      item.addEventListener('click', function() {
        var id = parseInt(item.getAttribute('data-id'));
        var notification = notifications.find(function(n) { return n.id === id; });
        if (notification && !notification.read) {
          notification.read = true;
          saveNotifications();
          updateNotificationBadge();
          item.classList.add('opacity-70');
          var badge = item.querySelector('span[style*="border-radius:50%"]');
          if (badge) badge.style.display = 'none';
        }
      });
    });

    document.addEventListener('click', function(e) {
      if (!panel.contains(e.target) && !e.target.src) {
        panel.remove();
      }
    });
  }

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
    styleSheet.textContent = '.toggle-switch input:checked + div { left: 22px; }';
    document.head.appendChild(styleSheet);

    var themeBtns = panel.querySelectorAll('.theme-btn');
    var currentTheme = localStorage.getItem('ai_writing_theme') || 'dark';
    themeBtns.forEach(function(btn) {
      var theme = btn.getAttribute('data-theme');
      if (theme === currentTheme) {
        btn.style.background = 'var(--bg-brand)';
        btn.style.color = 'var(--text-onbrand)';
        btn.style.border = 'none';
        btn.classList.add('selected');
      }
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
        applyTheme(btn.getAttribute('data-theme'));
      });
    });

    var currentFontSize = localStorage.getItem('ai_writing_font_size') || 'medium';
    var fontSizeBtns = panel.querySelectorAll('.font-size-btn');
    fontSizeBtns.forEach(function(btn) {
      var size = btn.getAttribute('data-size');
      if (size === currentFontSize) {
        btn.style.background = 'var(--bg-brand)';
        btn.style.color = 'var(--text-onbrand)';
        btn.style.border = 'none';
        btn.classList.add('selected');
      }
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
        applyFontSize(btn.getAttribute('data-size'));
      });
    });

    var currentMode = localStorage.getItem('ai_writing_mode') || 'normal';
    var modeBtns = panel.querySelectorAll('.mode-btn');
    modeBtns.forEach(function(btn) {
      var mode = btn.getAttribute('data-mode');
      if (mode === currentMode) {
        btn.style.background = 'var(--bg-brand)';
        btn.style.color = 'var(--text-onbrand)';
        btn.style.border = 'none';
        btn.classList.add('selected');
      }
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
        applyWritingMode(btn.getAttribute('data-mode'));
      });
    });

    var toggleSwitch = panel.querySelector('.toggle-switch');
    var autoSaveInput = toggleSwitch ? toggleSwitch.querySelector('input') : null;
    var savedAutoSave = localStorage.getItem('ai_writing_auto_save') !== 'false';
    if (autoSaveInput) {
      autoSaveInput.checked = savedAutoSave;
    }

    if (toggleSwitch) {
      toggleSwitch.addEventListener('click', function() {
        var input = toggleSwitch.querySelector('input');
        if (input) input.checked = !input.checked;
      });
    }

    document.getElementById('close-settings').addEventListener('click', function() { panel.remove(); });
    document.getElementById('cancel-settings').addEventListener('click', function() { panel.remove(); });
    document.getElementById('save-settings').addEventListener('click', function() {
      var selectedThemeBtn = panel.querySelector('.theme-btn.selected');
      if (selectedThemeBtn) {
        localStorage.setItem('ai_writing_theme', selectedThemeBtn.getAttribute('data-theme'));
      }
      var selectedFontSizeBtn = panel.querySelector('.font-size-btn.selected');
      if (selectedFontSizeBtn) {
        localStorage.setItem('ai_writing_font_size', selectedFontSizeBtn.getAttribute('data-size'));
      }
      var selectedModeBtn = panel.querySelector('.mode-btn.selected');
      if (selectedModeBtn) {
        localStorage.setItem('ai_writing_mode', selectedModeBtn.getAttribute('data-mode'));
      }
      if (autoSaveInput) {
        localStorage.setItem('ai_writing_auto_save', autoSaveInput.checked ? 'true' : 'false');
      }
      showNotification('设置已保存', 'info');
      panel.remove();
    });
  }

  function applyFontSize(size, silent) {
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
    if (!silent) showNotification('字体大小已调整', 'info');
  }

  function applyWritingMode(mode, silent) {
    var mainContent = document.querySelector('#main-content');
    var leftPanel = document.querySelector('aside:first-of-type');
    var rightPanel = document.querySelector('aside:last-of-type');

    if (mode === 'focus') {
      if (leftPanel) leftPanel.style.display = 'none';
      if (rightPanel) rightPanel.style.display = 'none';
      if (!silent) showNotification('已切换到专注模式', 'info');
    } else {
      if (leftPanel) leftPanel.style.display = '';
      if (rightPanel) rightPanel.style.display = '';
      if (!silent) showNotification('已切换到普通模式', 'info');
    }
  }

  function applyTheme(theme, silent) {
    var html = document.documentElement;
    if (!html) return;

    if (theme === 'light') {
      html.classList.add('light');
      html.classList.remove('dark');
    } else {
      html.classList.add('dark');
      html.classList.remove('light');
    }
    localStorage.setItem('ai_writing_theme', theme);
    if (!silent) showNotification('主题已切换为' + (theme === 'light' ? '浅色' : '深色'), 'info');
  }

  function initTheme() {
    var savedTheme = localStorage.getItem('ai_writing_theme') || 'dark';
    applyTheme(savedTheme, true);

    var savedFontSize = localStorage.getItem('ai_writing_font_size') || 'medium';
    applyFontSize(savedFontSize, true);

    var savedMode = localStorage.getItem('ai_writing_mode') || 'normal';
    if (savedMode && savedMode !== 'normal') {
      applyWritingMode(savedMode, true);
    }
  }

  function initAIConfig() {
    var trigger = document.getElementById('ai-model-trigger');
    var popup = document.getElementById('ai-model-popup');
    var addTrigger = document.getElementById('add-api-trigger');
    var addPanel = document.getElementById('add-api-panel');
    var closeBtn = document.getElementById('close-api-panel');
    var presetSelect = document.getElementById('preset-model-select');
    var customNameField = document.getElementById('custom-model-name-field');
    var customNameInput = document.getElementById('custom-model-name-input');
    var apiUrlInput = document.getElementById('api-url-input');
    var apiKeyInput = document.getElementById('api-key-input');
    var confirmBtn = document.getElementById('confirm-add-api-btn');

    if (trigger && popup) {
      trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        popup.classList.toggle('hidden');
        if (addPanel) addPanel.classList.add('hidden');
        updateModelList();
      });

      document.addEventListener('click', function(e) {
        if (!popup.contains(e.target) && e.target !== trigger && !trigger.contains(e.target)) {
          popup.classList.add('hidden');
          if (addPanel) addPanel.classList.add('hidden');
        }
      });
    }

    if (addTrigger && addPanel) {
      addTrigger.addEventListener('click', function(e) {
        e.stopPropagation();
        addPanel.classList.remove('hidden');
        if (presetSelect) {
          presetSelect.value = 'DeepSeek';
          updatePresetModelFields();
        }
      });
    }

    if (closeBtn && addPanel) {
      closeBtn.addEventListener('click', function() {
        addPanel.classList.add('hidden');
      });
    }

    function updatePresetModelFields() {
      if (!presetSelect || !window.AIService) return;
      var selected = presetSelect.value;
      var builtinModels = window.AIService.BUILTIN_MODELS;

      if (selected === 'custom') {
        if (customNameField) customNameField.style.display = '';
        if (apiUrlInput) {
          apiUrlInput.value = '';
          apiUrlInput.readOnly = false;
        }
      } else {
        if (customNameField) customNameField.style.display = 'none';
        if (builtinModels && builtinModels[selected]) {
          if (apiUrlInput) {
            apiUrlInput.value = builtinModels[selected].apiUrl;
            apiUrlInput.readOnly = true;
            apiUrlInput.style.opacity = '0.7';
          }
        }
      }
    }

    if (presetSelect) {
      presetSelect.addEventListener('change', updatePresetModelFields);
    }

    if (confirmBtn && addPanel) {
      confirmBtn.addEventListener('click', function() {
        var selectedModel = presetSelect ? presetSelect.value : 'custom';
        var modelName = '';
        var apiUrl = apiUrlInput ? apiUrlInput.value.trim() : '';
        var apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';

        if (selectedModel === 'custom') {
          modelName = customNameInput ? customNameInput.value.trim() : '';
          if (!modelName || !apiUrl || !apiKey) {
            showNotification('请填写完整的模型信息', 'warn');
            return;
          }
        } else {
          modelName = selectedModel;
          if (!apiKey) {
            showNotification('请输入 API Key', 'warn');
            return;
          }
          if (window.AIService && window.AIService.BUILTIN_MODELS && window.AIService.BUILTIN_MODELS[selectedModel]) {
            apiUrl = window.AIService.BUILTIN_MODELS[selectedModel].apiUrl;
          }
        }

        if (window.AIService) {
          var modelConfig = {
            provider: 'openai',
            model: modelName,
            apiUrl: apiUrl
          };
          if (window.AIService.BUILTIN_MODELS && window.AIService.BUILTIN_MODELS[selectedModel]) {
            modelConfig.provider = window.AIService.BUILTIN_MODELS[selectedModel].provider || 'openai';
            modelConfig.model = window.AIService.BUILTIN_MODELS[selectedModel].model || modelName;
          }
          window.AIService.setModelConfig(modelName, modelConfig);
          window.AIService.saveApiKeyEncrypted(modelName, apiKey).then(function(result) {
            if (result.success) {
              window.AIService.setCurrentModel(modelName);
              showNotification('API 配置成功', 'info');
              addPanel.classList.add('hidden');
              popup.classList.add('hidden');
              updateModelDisplay();
              if (apiKeyInput) apiKeyInput.value = '';
            } else {
              showNotification('配置保存失败: ' + (result.error || '未知错误'), 'error');
            }
          });
        }
      });
    }

    updateModelDisplay();
  }

  function updateModelList() {
    var popup = document.getElementById('ai-model-popup');
    if (!popup) return;

    var optionsContainer = popup.querySelector('.flex.flex-col');
    if (!optionsContainer) return;

    optionsContainer.innerHTML = '';

    if (window.AIService && window.AIService.BUILTIN_MODELS) {
      var builtinModels = window.AIService.BUILTIN_MODELS;
      var currentModel = window.AIService.getCurrentModel();

      Object.keys(builtinModels).forEach(function(modelName) {
        var isConfigured = window.AIService.isModelConfigured(modelName);
        var isCurrent = modelName === currentModel;

        var modelDiv = document.createElement('div');
        modelDiv.className = 'flex items-center justify-between px-3 py-1.5';
        modelDiv.style.cssText = 'height: 40px;';

        var leftDiv = document.createElement('div');
        leftDiv.className = 'flex items-center gap-2';

        if (isCurrent) {
          leftDiv.innerHTML = '<img src="../assets/icons/dl-builtin-trae/check.svg" width="14" height="14" alt="" style="color: var(--icon-brand);">';
        } else {
          leftDiv.innerHTML = '<span style="width:14px;"></span>';
        }

        var nameSpan = document.createElement('span');
        nameSpan.className = 'truncate';
        nameSpan.style.cssText = 'font-size: 13px; color: ' + (isCurrent ? 'var(--text-default)' : 'var(--text-secondary)') + ';';
        nameSpan.textContent = modelName;
        leftDiv.appendChild(nameSpan);

        var rightDiv = document.createElement('div');
        rightDiv.className = 'flex items-center gap-2';

        if (isConfigured) {
          var statusSpan = document.createElement('span');
          statusSpan.style.cssText = 'font-size: 11px; color: var(--text-tertiary);';
          statusSpan.textContent = '已配置';
          rightDiv.appendChild(statusSpan);
        } else {
          var statusSpan = document.createElement('span');
          statusSpan.style.cssText = 'font-size: 11px; color: var(--text-tertiary);';
          statusSpan.textContent = '未配置';
          rightDiv.appendChild(statusSpan);

          var configBtn = document.createElement('button');
          configBtn.className = 'px-2.5 py-1 rounded-md cursor-pointer';
          configBtn.style.cssText = 'height: 24px; background: var(--bg-brand); color: var(--text-onbrand); border: none; font-size: 11px;';
          configBtn.textContent = '配置';
          configBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            openModelConfig(modelName, builtinModels[modelName]);
          });
          rightDiv.appendChild(configBtn);
        }

        var deleteBtn = document.createElement('button');
        deleteBtn.className = 'flex items-center justify-center w-6 h-6 rounded cursor-pointer';
        deleteBtn.style.cssText = 'color: var(--icon-tertiary); border: none; background: transparent;';
        deleteBtn.innerHTML = '<img src="../assets/icons/dl-builtin-trae/x.svg" width="12" height="12" alt="" class="opacity-40">';
        deleteBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          if (isConfigured) {
            confirmDialog('删除配置', '确定要删除 ' + modelName + ' 的配置吗？', function() {
              window.AIService.deleteModelConfig(modelName);
              updateModelList();
              showNotification(modelName + ' 配置已删除', 'info');
            });
          }
        });
        rightDiv.appendChild(deleteBtn);

        modelDiv.appendChild(leftDiv);
        modelDiv.appendChild(rightDiv);

        if (isConfigured) {
          modelDiv.style.cursor = 'pointer';
          modelDiv.addEventListener('click', function(e) {
            e.stopPropagation();
            window.AIService.setCurrentModel(modelName);
            updateModelDisplay();
            popup.classList.add('hidden');
            showNotification('已切换到 ' + modelName, 'info');
          });

          if (isCurrent) {
            modelDiv.style.background = 'var(--bg-brand-popup)';
          } else {
            modelDiv.addEventListener('mouseenter', function() { modelDiv.style.background = 'var(--bg-overlay-l1)'; });
            modelDiv.addEventListener('mouseleave', function() { modelDiv.style.background = ''; });
          }
        }

        optionsContainer.appendChild(modelDiv);
      });
    }
  }

  function openModelConfig(modelName, modelConfig) {
    var popup = document.getElementById('ai-model-popup');
    var addPanel = document.getElementById('add-api-panel');
    var presetSelect = document.getElementById('preset-model-select');
    var apiUrlInput = document.getElementById('api-url-input');
    var apiKeyInput = document.getElementById('api-key-input');
    var customNameField = document.getElementById('custom-model-name-field');

    if (!addPanel || !presetSelect || !apiUrlInput || !apiKeyInput) return;

    addPanel.classList.remove('hidden');
    presetSelect.value = modelName;
    apiUrlInput.value = modelConfig.apiUrl;
    apiUrlInput.readOnly = true;
    apiUrlInput.style.opacity = '0.7';
    if (customNameField) customNameField.style.display = 'none';
    apiKeyInput.value = '';
    apiKeyInput.focus();
  }

  function updateModelDisplay() {
    var modelNameEl = document.getElementById('ai-model-name');
    if (!modelNameEl) return;

    if (window.AIService) {
      var currentModel = window.AIService.getCurrentModel();
      if (currentModel) {
        modelNameEl.textContent = currentModel;
      } else {
        modelNameEl.textContent = '未配置';
      }
    }
  }

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
      '<div style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-default);">' +
      '<img src="../assets/icons/dl-builtin-trae/check-circle.svg" width="16" height="16" alt="" style="color:var(--icon-brand);">' +
      '<span>无限 AI 生成次数</span>' +
      '</div>' +
      '<div style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-default);">' +
      '<img src="../assets/icons/dl-builtin-trae/check-circle.svg" width="16" height="16" alt="" style="color:var(--icon-brand);">' +
      '<span>高级写作模式</span>' +
      '</div>' +
      '<div style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-default);">' +
      '<img src="../assets/icons/dl-builtin-trae/check-circle.svg" width="16" height="16" alt="" style="color:var(--icon-brand);">' +
      '<span>自定义 AI 角色设定</span>' +
      '</div>' +
      '<div style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-default);">' +
      '<img src="../assets/icons/dl-builtin-trae/check-circle.svg" width="16" height="16" alt="" style="color:var(--icon-brand);">' +
      '<span>优先技术支持</span>' +
      '</div>' +
      '</div>' +
      '<div style="display:flex; gap:8px;">' +
      '<button id="buy-pro-monthly" style="flex:1; padding:12px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:8px; font-size:14px; font-weight:500;">月付 29 元</button>' +
      '<button id="buy-pro-yearly" style="flex:1; padding:12px; background:var(--bg-overlay-l1); color:var(--text-secondary); border:1px solid var(--border-neutral-l1); border-radius:8px; font-size:14px;">年付 244 元</button>' +
      '</div>';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });
    document.getElementById('close-pro').addEventListener('click', function() { overlay.remove(); });

    var buyBtns = dialog.querySelectorAll('button[id^="buy-pro"]');
    buyBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        showNotification('支付功能开发中', 'info');
        overlay.remove();
      });
    });
  }

  function showHelpDialog() {
    var existing = document.getElementById('help-dialog-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'help-dialog-overlay';
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:1000; display:flex; align-items:center; justify-content:center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'width:520px; max-height:80vh; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.4); padding:24px; animation:fadeIn 0.2s ease-out; overflow-y:auto;';

    dialog.innerHTML =
      '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">' +
      '<h3 style="font-size:16px; font-weight:600; color:var(--text-default);">帮助与反馈</h3>' +
      '<img src="../assets/icons/dl-builtin-trae/x.svg" width="16" height="16" alt="关闭" class="cursor-pointer opacity-50" id="close-help">' +
      '</div>' +
      '<div style="display:flex; flex-direction:column; gap:16px;">' +
      '<div>' +
      '<h4 style="font-size:14px; font-weight:500; color:var(--text-default); margin-bottom:8px;">常见问题</h4>' +
      '<div style="display:flex; flex-direction:column; gap:8px;">' +
      '<div class="help-item" style="padding:12px; background:var(--bg-overlay-l1); border-radius:8px; cursor:pointer;">' +
      '<div style="font-size:13px; color:var(--text-default); font-weight:500;">如何使用 AI 辅助写作？</div>' +
      '<div class="help-answer" style="font-size:12px; color:var(--text-secondary); margin-top:6px; display:none;">在编辑器中输入内容后，点击右侧 AI 工具栏的快捷按钮，如"续写"、"润色"等，AI 将根据当前内容生成辅助文本。</div>' +
      '</div>' +
      '<div class="help-item" style="padding:12px; background:var(--bg-overlay-l1); border-radius:8px; cursor:pointer;">' +
      '<div style="font-size:13px; color:var(--text-default); font-weight:500;">如何创建新作品？</div>' +
      '<div class="help-answer" style="font-size:12px; color:var(--text-secondary); margin-top:6px; display:none;">点击左侧导航栏的"新建作品"按钮，填写作品名称、分类、风格等信息，即可创建新作品。</div>' +
      '</div>' +
      '<div class="help-item" style="padding:12px; background:var(--bg-overlay-l1); border-radius:8px; cursor:pointer;">' +
      '<div style="font-size:13px; color:var(--text-default); font-weight:500;">如何导入外部素材？</div>' +
      '<div class="help-answer" style="font-size:12px; color:var(--text-secondary); margin-top:6px; display:none;">在素材页面点击"AI 生成素材"按钮，或手动添加素材。支持文本导入和 AI 生成两种方式。</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div>' +
      '<h4 style="font-size:14px; font-weight:500; color:var(--text-default); margin-bottom:8px;">联系我们</h4>' +
      '<div style="font-size:12px; color:var(--text-secondary); line-height:1.6;">' +
      '<div>邮箱：support@aiwriter.com</div>' +
      '<div>工作时间：周一至周五 9:00-18:00</div>' +
      '</div>' +
      '</div>' +
      '</div>';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });
    document.getElementById('close-help').addEventListener('click', function() { overlay.remove(); });

    var helpItems = dialog.querySelectorAll('.help-item');
    helpItems.forEach(function(item) {
      item.addEventListener('click', function() {
        var answer = item.querySelector('.help-answer');
        if (answer) answer.style.display = answer.style.display === 'none' ? 'block' : 'none';
      });
    });
  }

  function createMessageEl(sender, content, type) {
    var msg = document.createElement('div');
    msg.className = 'msg-bubble ' + type;
    msg.style.cssText = 'padding:10px 14px; border-radius:8px; margin-bottom:10px; max-width:85%; font-size:13px; line-height:1.6;';

    if (type === 'user') {
      msg.style.background = 'var(--bg-brand)';
      msg.style.color = 'var(--text-onbrand)';
      msg.style.marginLeft = 'auto';
    } else {
      msg.style.background = 'var(--bg-overlay-l2)';
      msg.style.color = 'var(--text-default)';
      msg.style.marginRight = 'auto';
    }

    msg.innerHTML = '<div style="font-size:11px; opacity:0.7; margin-bottom:4px;">' + sender + '</div><div class="msg-content">' + content + '</div>';
    return msg;
  }

  function updateAIStatus(status) {
    var statusEl = document.querySelector('#ai-status');
    if (statusEl) statusEl.textContent = status;
  }

  var DEFAULT_QUICK_BUTTONS = [
    { label: '续写', action: 'continueWriting', icon: 'arrow-right', modes: [
      { label: '自然续写', mode: 'natural', desc: '保持当前节奏自然推进' },
      { label: '情节推进', mode: 'plot', desc: '加快节奏，推动主线发展' },
      { label: '情感递进', mode: 'emotion', desc: '侧重人物情感和心理描写' },
      { label: '悬念转折', mode: 'suspense', desc: '制造悬念或剧情反转' }
    ]},
    { label: '润色', action: 'polish', icon: 'sparkles', modes: [
      { label: '轻度润色', mode: 'light', desc: '优化表达，不改变原意' },
      { label: '深度润色', mode: 'deep', desc: '全面提升文学性和表现力' },
      { label: '古风化', mode: 'classical', desc: '转为古风水墨风格' },
      { label: '口语化', mode: 'colloquial', desc: '更贴近日常对话风格' }
    ]},
    { label: '扩写', action: 'expandText', icon: 'arrow-expand', modes: [
      { label: '细节丰富', mode: 'detail', desc: '增加场景和动作细节' },
      { label: '心理描写', mode: 'psychological', desc: '补充人物内心活动' },
      { label: '环境渲染', mode: 'environment', desc: '强化环境氛围描写' },
      { label: '对话扩展', mode: 'dialogue', desc: '增加对话和互动' }
    ]},
    { label: '总结', action: 'generateSummary', icon: 'file-text', modes: [
      { label: '情节梗概', mode: 'plot', desc: '提炼主要情节线' },
      { label: '人物分析', mode: 'character', desc: '分析人物关系和性格' },
      { label: '核心主题', mode: 'theme', desc: '提炼主题思想' },
      { label: '章节大纲', mode: 'outline', desc: '生成章节结构大纲' }
    ]},
    { label: '对话', action: 'generateDialogue', icon: 'message-square', modes: [
      { label: '日常对话', mode: 'daily', desc: '自然生活化的对话' },
      { label: '冲突对话', mode: 'conflict', desc: '充满张力的对抗性对话' },
      { label: '情感对话', mode: 'emotional', desc: '表达情感的深度对话' },
      { label: '信息交代', mode: 'info', desc: '通过对话传递信息' }
    ]},
    { label: '精简', action: 'condenseText', icon: 'list', modes: [
      { label: '轻度压缩', mode: 'light', desc: '保留主要内容，精简冗余' },
      { label: '重度压缩', mode: 'heavy', desc: '大幅压缩，保留核心' },
      { label: '提炼要点', mode: 'points', desc: '以要点形式呈现' },
      { label: '一句话概括', mode: 'one', desc: '用一句话总结全文' }
    ]},
    { label: '场景', action: 'enhanceScene', icon: 'image', modes: [
      { label: '视觉强化', mode: 'visual', desc: '强化画面感和视觉细节' },
      { label: '氛围营造', mode: 'atmosphere', desc: '渲染场景氛围和情绪' },
      { label: '五感描写', mode: 'senses', desc: '调动五感增强沉浸感' },
      { label: '动态场景', mode: 'dynamic', desc: '增强动作和动态感' }
    ]},
    { label: '心理', action: 'enhanceInnerThought', icon: 'user', modes: [
      { label: '内心独白', mode: 'monologue', desc: '直接的内心想法表达' },
      { label: '潜意识流', mode: 'stream', desc: '意识流式心理描写' },
      { label: '情绪递进', mode: 'emotion', desc: '刻画情绪变化过程' },
      { label: '心理挣扎', mode: 'struggle', desc: '展现内心矛盾和挣扎' }
    ]}
  ];

  var EXPANDED_BUTTONS = [
    { label: '续写', action: 'continueWriting', icon: 'arrow-right', shortcut: 'Ctrl+Enter', modes: DEFAULT_QUICK_BUTTONS[0].modes },
    { label: '润色', action: 'polish', icon: 'sparkles', shortcut: 'Ctrl+P', modes: DEFAULT_QUICK_BUTTONS[1].modes },
    { label: '扩写', action: 'expandText', icon: 'arrow-expand', shortcut: 'Ctrl+E', modes: DEFAULT_QUICK_BUTTONS[2].modes },
    { label: '总结', action: 'generateSummary', icon: 'file-text', shortcut: 'Ctrl+S', modes: DEFAULT_QUICK_BUTTONS[3].modes },
    { label: '对话', action: 'generateDialogue', icon: 'message-square', shortcut: 'Ctrl+D', modes: DEFAULT_QUICK_BUTTONS[4].modes },
    { label: '精简', action: 'condenseText', icon: 'list', shortcut: 'Ctrl+O', modes: DEFAULT_QUICK_BUTTONS[5].modes },
    { label: '场景', action: 'enhanceScene', icon: 'image', shortcut: 'Ctrl+N', modes: DEFAULT_QUICK_BUTTONS[6].modes },
    { label: '心理', action: 'enhanceInnerThought', icon: 'user', shortcut: 'Ctrl+C', modes: DEFAULT_QUICK_BUTTONS[7].modes },
    { label: '大纲', action: 'generateChapterOutline', icon: 'list', shortcut: 'Ctrl+L', modes: [
      { label: '起承转合', mode: 'four', desc: '经典四段式结构' },
      { label: '三幕式', mode: 'three', desc: '三幕剧结构' },
      { label: '英雄之旅', mode: 'hero', desc: '英雄之旅十二阶段' },
      { label: '章节细分', mode: 'detailed', desc: '详细的段落级大纲' }
    ]},
    { label: '剧情', action: 'plotSuggestions', icon: 'zap', shortcut: 'Ctrl+K', modes: [
      { label: '三个方向', mode: 'three', desc: '提供三种剧情发展方向' },
      { label: '危机升级', mode: 'crisis', desc: '制造危机和冲突升级' },
      { label: '伏笔回收', mode: 'foreshadow', desc: '回收之前的伏笔' },
      { label: '人物成长', mode: 'growth', desc: '推动人物成长弧线' }
    ]},
    { label: '标题', action: 'generateChapterTitles', icon: 'type', shortcut: 'Ctrl+T', modes: [
      { label: '文艺风', mode: 'literary', desc: '文艺有诗意的标题' },
      { label: '悬念风', mode: 'suspense', desc: '制造悬念吸引读者' },
      { label: '直白风', mode: 'direct', desc: '简洁明了点题' },
      { label: '古风韵', mode: 'classical', desc: '古典韵味标题' }
    ]},
    { label: '关系', action: 'analyzeRelationships', icon: 'users', shortcut: 'Ctrl+R', modes: [
      { label: '关系图谱', mode: 'map', desc: '梳理人物关系网络' },
      { label: '冲突分析', mode: 'conflict', desc: '分析人物间矛盾' },
      { label: '情感线', mode: 'emotion', desc: '梳理情感发展线' },
      { label: '势力分布', mode: 'power', desc: '分析各方势力格局' }
    ]},
    { label: '检查', action: 'checkConsistency', icon: 'shield', shortcut: 'Ctrl+I', modes: [
      { label: '设定检查', mode: 'setting', desc: '检查设定一致性' },
      { label: '人物OOC', mode: 'ooc', desc: '检查人物行为是否OOC' },
      { label: '时间线', mode: 'timeline', desc: '检查时间线是否合理' },
      { label: '逻辑漏洞', mode: 'logic', desc: '查找逻辑漏洞' }
    ]},
    { label: '自动', action: 'autoWriteDirect', icon: 'refresh', shortcut: 'Ctrl+U', modes: [
      { label: '直接续写', mode: 'direct', desc: 'AI直接续写400-600字' },
      { label: '先定大纲', mode: 'outline', desc: '先生成大纲再按大纲写' },
      { label: '按设定写', mode: 'settings', desc: '根据自定义设定写作' },
      { label: '按段生成', mode: 'byParagraph', desc: '逐段生成逐步推进' }
    ]},
    { label: '素材', action: 'generateMaterial', icon: 'heart', shortcut: 'Ctrl+H', modes: [
      { label: '人物素材', mode: 'character', desc: '生成人物设定素材' },
      { label: '场景素材', mode: 'scene', desc: '生成场景描写素材' },
      { label: '道具素材', mode: 'item', desc: '生成道具设定素材' },
      { label: '世界观素材', mode: 'world', desc: '生成世界观设定素材' }
    ]},
    { label: '展开', action: 'expandMaterial', icon: 'layers', shortcut: 'Ctrl+G', modes: [
      { label: '细节扩展', mode: 'detail', desc: '增加细节丰富度' },
      { label: '背景故事', mode: 'backstory', desc: '补充背景故事' },
      { label: '关联扩展', mode: 'related', desc: '扩展相关联内容' },
      { label: '系统设定', mode: 'system', desc: '完善系统性设定' }
    ]}
  ];

  var AIButtons = [];

  var currentModeDropdown = null;
  var selectedModes = {};

  function closeModeDropdown() {
    if (currentModeDropdown) {
      currentModeDropdown.remove();
      currentModeDropdown = null;
    }
  }

  function showModeDropdown(btnConfig, targetEl, onSelect) {
    closeModeDropdown();

    if (!btnConfig.modes || btnConfig.modes.length === 0) {
      onSelect(null);
      return;
    }

    var dropdown = document.createElement('div');
    dropdown.className = 'mode-dropdown';
    dropdown.style.cssText = 'position:absolute; z-index:1000; min-width:180px; background:var(--bg-menu); border:1px solid var(--border-neutral-l2); border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.15); padding:4px;';

    var currentMode = selectedModes[btnConfig.action] || btnConfig.modes[0].mode;

    btnConfig.modes.forEach(function(modeConfig) {
      var item = document.createElement('div');
      item.style.cssText = 'display:flex; flex-direction:column; padding:6px 10px; border-radius:6px; cursor:pointer; transition:all 0.15s; margin-bottom:2px;';
      var isSelected = modeConfig.mode === currentMode;

      item.innerHTML =
        '<div style="display:flex; align-items:center; justify-content:space-between;">' +
        '<span style="font-size:12px; color:' + (isSelected ? 'var(--text-brand)' : 'var(--text-default)') + '; font-weight:' + (isSelected ? '500' : '400') + ';">' + modeConfig.label + '</span>' +
        (isSelected ? '<img src="../assets/icons/dl-builtin-trae/check.svg" width="14" height="14" alt="" style="opacity:0.8;">' : '') +
        '</div>' +
        '<span style="font-size:10px; color:var(--text-tertiary); margin-top:2px;">' + modeConfig.desc + '</span>';

      item.addEventListener('mouseenter', function() {
        item.style.background = 'var(--bg-overlay-l1)';
      });
      item.addEventListener('mouseleave', function() {
        item.style.background = 'transparent';
      });
      item.addEventListener('click', function(e) {
        e.stopPropagation();
        selectedModes[btnConfig.action] = modeConfig.mode;
        onSelect(modeConfig);
        closeModeDropdown();
      });

      dropdown.appendChild(item);
    });

    var rect = targetEl.getBoundingClientRect();
    dropdown.style.top = (rect.bottom + 4) + 'px';
    dropdown.style.left = rect.left + 'px';

    document.body.appendChild(dropdown);
    currentModeDropdown = dropdown;

    setTimeout(function() {
      document.addEventListener('click', function onClickOutside(e) {
        if (!dropdown.contains(e.target) && e.target !== targetEl) {
          closeModeDropdown();
          document.removeEventListener('click', onClickOutside);
        }
      });
    }, 10);
  }

  function initQuickButtons() {
    var container = document.getElementById('quick-buttons-wrapper');
    if (!container) return;

    container.innerHTML = '';
    AIButtons = [];

    DEFAULT_QUICK_BUTTONS.forEach(function(btnConfig) {
      var btnWrapper = document.createElement('div');
      btnWrapper.style.cssText = 'position:relative; display:flex;';

      var btn = document.createElement('button');
      btn.className = 'ai-quick-btn';
      btn.dataset.action = btnConfig.action;
      btn.style.cssText = 'display:flex; align-items:center; gap:4px; padding:4px 6px 4px 8px; background:var(--bg-overlay-l1); border:none; border-radius:4px 0 0 4px; color:var(--text-secondary); font-size:11px; cursor:pointer; transition:all 0.15s;';

      btn.innerHTML =
        '<img src="../assets/icons/dl-builtin-trae/' + btnConfig.icon + '.svg" width="14" height="14" alt="' + btnConfig.label + '" style="opacity:0.6;">' +
        '<span>' + btnConfig.label + '</span>';

      var dropdownBtn = document.createElement('button');
      dropdownBtn.style.cssText = 'display:flex; align-items:center; justify-content:center; width:16px; padding:4px 2px; background:var(--bg-overlay-l1); border:none; border-left:1px solid var(--border-neutral-l2); border-radius:0 4px 4px 0; color:var(--text-secondary); cursor:pointer; transition:all 0.15s;';
      dropdownBtn.innerHTML = '<img src="../assets/icons/dl-builtin-trae/chevron-down.svg" width="10" height="10" alt="" style="opacity:0.5;">';

      function updateHoverState(isHover) {
        var color = isHover ? 'var(--text-default)' : 'var(--text-secondary)';
        var bg = isHover ? 'var(--bg-overlay-l2)' : 'var(--bg-overlay-l1)';
        btn.style.color = color;
        btn.style.background = bg;
        dropdownBtn.style.background = bg;
        var btnImg = btn.querySelector('img');
        if (btnImg) btnImg.style.opacity = isHover ? '1' : '0.6';
        var ddImg = dropdownBtn.querySelector('img');
        if (ddImg) ddImg.style.opacity = isHover ? '0.7' : '0.5';
      }

      btn.addEventListener('mouseenter', function() { updateHoverState(true); });
      btn.addEventListener('mouseleave', function() { updateHoverState(false); });
      dropdownBtn.addEventListener('mouseenter', function() { updateHoverState(true); });
      dropdownBtn.addEventListener('mouseleave', function() { updateHoverState(false); });

      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var mode = selectedModes[btnConfig.action] || (btnConfig.modes && btnConfig.modes[0] ? btnConfig.modes[0].mode : null);
        executeAIAction(btnConfig, '', 'append', mode);
      });

      dropdownBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        showModeDropdown(btnConfig, btnWrapper, function(modeConfig) {
          if (modeConfig) {
            executeAIAction(btnConfig, '', 'append', modeConfig.mode);
          }
        });
      });

      btnWrapper.appendChild(btn);
      btnWrapper.appendChild(dropdownBtn);
      container.appendChild(btnWrapper);
      AIButtons.push(btn);
    });

    var expandBtn = document.getElementById('expand-actions-btn');
    if (expandBtn) {
      expandBtn.addEventListener('click', function() {
        var expandedContainer = document.getElementById('expanded-actions-container');
        if (expandedContainer) {
          expandedContainer.classList.toggle('hidden');
          var isExpanded = !expandedContainer.classList.contains('hidden');
          expandBtn.innerHTML = '<img src="../assets/icons/dl-builtin-trae/chevron-' + (isExpanded ? 'up' : 'down') + '.svg" width="12" height="12" alt="" style="opacity:0.5; margin-right:4px;">' + (isExpanded ? '收起' : '更多功能');
          expandBtn.style.display = 'flex';
          expandBtn.style.alignItems = 'center';
          expandBtn.style.justifyContent = 'center';
          if (isExpanded) {
            renderExpandedButtons();
          }
        }
      });
    }
  }

  function renderExpandedButtons() {
    var container = document.getElementById('expanded-buttons-wrapper');
    if (!container) return;

    container.innerHTML = '';

    EXPANDED_BUTTONS.forEach(function(btnConfig) {
      var btnWrapper = document.createElement('div');
      btnWrapper.style.cssText = 'position:relative; width:100%;';

      var btn = document.createElement('button');
      btn.className = 'expanded-btn';
      btn.dataset.action = btnConfig.action;
      btn.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:6px 8px; background:transparent; border:none; border-radius:4px 0 0 4px; color:var(--text-secondary); font-size:12px; cursor:pointer; transition:all 0.15s; width:calc(100% - 20px);';

      btn.innerHTML =
        '<span style="display:flex; align-items:center; gap:4px;">' +
        '<img src="../assets/icons/dl-builtin-trae/' + btnConfig.icon + '.svg" width="14" height="14" alt="' + btnConfig.label + '" style="opacity:0.6;">' +
        '<span>' + btnConfig.label + '</span>' +
        '</span>' +
        '<span style="font-size:10px; opacity:0.5;">' + (btnConfig.shortcut || '') + '</span>';

      var dropdownBtn = document.createElement('button');
      dropdownBtn.style.cssText = 'position:absolute; right:0; top:0; height:100%; width:20px; display:flex; align-items:center; justify-content:center; background:transparent; border:none; border-radius:0 4px 4px 0; cursor:pointer; transition:all 0.15s;';
      dropdownBtn.innerHTML = '<img src="../assets/icons/dl-builtin-trae/chevron-right.svg" width="10" height="10" alt="" style="opacity:0.4;">';

      function updateHoverState(isHover) {
        var color = isHover ? 'var(--text-default)' : 'var(--text-secondary)';
        var bg = isHover ? 'var(--bg-overlay-l1)' : 'transparent';
        btn.style.color = color;
        btn.style.background = bg;
        dropdownBtn.style.background = bg;
        var btnImg = btn.querySelector('img');
        if (btnImg) btnImg.style.opacity = isHover ? '1' : '0.6';
        var ddImg = dropdownBtn.querySelector('img');
        if (ddImg) ddImg.style.opacity = isHover ? '0.6' : '0.4';
      }

      btn.addEventListener('mouseenter', function() { updateHoverState(true); });
      btn.addEventListener('mouseleave', function() { updateHoverState(false); });
      dropdownBtn.addEventListener('mouseenter', function() { updateHoverState(true); });
      dropdownBtn.addEventListener('mouseleave', function() { updateHoverState(false); });

      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var mode = selectedModes[btnConfig.action] || (btnConfig.modes && btnConfig.modes[0] ? btnConfig.modes[0].mode : null);
        executeAIAction(btnConfig, '', 'append', mode);
        var expandedContainer = document.getElementById('expanded-actions-container');
        var expandBtn = document.getElementById('expand-actions-btn');
        if (expandedContainer && !expandedContainer.classList.contains('hidden')) {
          expandedContainer.classList.add('hidden');
          if (expandBtn) {
            expandBtn.innerHTML = '<img src="../assets/icons/dl-builtin-trae/chevron-down.svg" width="12" height="12" alt="" style="opacity:0.5; margin-right:4px;">更多功能';
            expandBtn.style.display = 'flex';
            expandBtn.style.alignItems = 'center';
            expandBtn.style.justifyContent = 'center';
          }
        }
      });

      dropdownBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        showModeDropdown(btnConfig, btnWrapper, function(modeConfig) {
          if (modeConfig) {
            executeAIAction(btnConfig, '', 'append', modeConfig.mode);
            var expandedContainer = document.getElementById('expanded-actions-container');
            var expandBtn = document.getElementById('expand-actions-btn');
            if (expandedContainer && !expandedContainer.classList.contains('hidden')) {
              expandedContainer.classList.add('hidden');
              if (expandBtn) {
                expandBtn.innerHTML = '<img src="../assets/icons/dl-builtin-trae/chevron-down.svg" width="12" height="12" alt="" style="opacity:0.5; margin-right:4px;">更多功能';
                expandBtn.style.display = 'flex';
                expandBtn.style.alignItems = 'center';
                expandBtn.style.justifyContent = 'center';
              }
            }
          }
        });
      });

      btnWrapper.appendChild(btn);
      btnWrapper.appendChild(dropdownBtn);
      container.appendChild(btnWrapper);
    });
  }

  function showExpandedButtons() {
    var existingPanel = document.getElementById('ai-expanded-panel');
    if (existingPanel) {
      existingPanel.remove();
      return;
    }

    var panel = document.createElement('div');
    panel.id = 'ai-expanded-panel';
    panel.style.cssText = 'position:fixed; top:120px; right:24px; width:200px; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.4); z-index:1000; padding:12px; animation: fadeIn 0.2s ease-out;';

    var html = '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid var(--border-neutral-l1);">' +
      '<span style="font-size:13px; font-weight:500; color:var(--text-default);">AI 工具</span>' +
      '<img src="../assets/icons/dl-builtin-trae/x.svg" width="14" height="14" alt="关闭" class="cursor-pointer opacity-50" id="close-expanded">' +
      '</div>' +
      '<div style="display:flex; flex-direction:column; gap:4px;">';

    EXPANDED_BUTTONS.forEach(function(btnConfig) {
      html += '<button class="expanded-btn" data-action="' + btnConfig.action + '" style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; background:transparent; border:none; border-radius:8px; color:var(--text-secondary); font-size:13px; cursor:pointer; transition:background 0.15s;">' +
        '<span>' + btnConfig.label + '</span>' +
        '<span style="font-size:11px; opacity:0.6;">' + (btnConfig.shortcut || '') + '</span>' +
        '</button>';
    });

    html += '</div>';
    panel.innerHTML = html;
    document.body.appendChild(panel);

    document.getElementById('close-expanded').addEventListener('click', function() { panel.remove(); });

    var btns = panel.querySelectorAll('.expanded-btn');
    btns.forEach(function(btn) {
      btn.addEventListener('mouseenter', function() { btn.style.background = 'var(--bg-overlay-l1)'; btn.style.color = 'var(--text-default)'; });
      btn.addEventListener('mouseleave', function() { btn.style.background = 'transparent'; btn.style.color = 'var(--text-secondary)'; });
      btn.addEventListener('click', function() {
        var action = btn.getAttribute('data-action');
        var config = EXPANDED_BUTTONS.find(function(b) { return b.action === action; });
        if (config) {
          executeAIAction(config, '', 'append');
        }
        panel.remove();
      });
    });

    document.addEventListener('click', function(e) {
      if (!panel.contains(e.target)) panel.remove();
    });
  }

  function executeAIAction(config, text, processType, mode) {
    var messagesContainer = document.getElementById('chat-messages-container');
    if (!messagesContainer) return;

    var modeLabel = '';
    if (mode && config.modes) {
      var modeConfig = config.modes.find(function(m) { return m.mode === mode; });
      if (modeConfig) modeLabel = ' - ' + modeConfig.label;
    }

    var userMsg = createMessageEl('用户', config.label + modeLabel + (processType === 'replaceSelection' ? '（选中文本）' : ''), 'user');
    messagesContainer.appendChild(userMsg);

    var aiMsg = createMessageEl('AI', '', 'ai');
    var aiContent = aiMsg.querySelector('.msg-content');
    aiContent.innerHTML = '<span style="color: var(--text-tertiary);">正在生成...</span>';
    messagesContainer.appendChild(aiMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    updateAIStatus('正在生成...');

    isGenerating = true;
    var context = window.Utils && window.Utils.getWorkContext ? window.Utils.getWorkContext() : {};
    var editorText = window.Utils && window.Utils.getEditorText ? window.Utils.getEditorText() : '';
    if (editorText) {
      context.currentContent = editorText.substring(0, 4000);
    }
    context.mode = mode || 'default';
    var messages = window.AIService.PROMPTS[config.action](context, text, mode);

    window.AIService.chat(messages, {
      stream: true,
      temperature: 0.8,
      max_tokens: 4096,
      onChunk: function(chunk, fullText) {
        if (!aiContent) return;
        var safeChunk = window.Utils ? window.Utils.sanitizeHtml(fullText) : fullText;
        aiContent.innerHTML = safeChunk;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      },
      onDone: function(fullText) {
        isGenerating = false;
        updateAIStatus('');
        processAIResult(fullText, config.action, processType);
        chatHistory.push({
          role: 'user',
          content: config.label + (processType === 'replaceSelection' ? '（选中文本）' : '')
        });
        chatHistory.push({
          role: 'assistant',
          content: fullText
        });
      },
      onError: function(err) {
        isGenerating = false;
        updateAIStatus('');
        if (aiContent) {
          aiContent.innerHTML = '<span style="color: var(--text-error);">生成失败：' + (err.message || '未知错误') + '</span>';
        }
        console.warn('AI 生成失败:', err);
      }
    });
  }

  function processAIResult(text, action, processType) {
    if (!text) return;

    var paragraphs = processNovelText(text);
    var html = paragraphsToHtml(paragraphs);

    if (processType === 'replaceSelection') {
      var article = document.querySelector('article');
      if (article) {
        var selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          var range = selection.getRangeAt(0);
          range.deleteContents();
          var tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;
          while (tempDiv.firstChild) {
            range.insertNode(tempDiv.firstChild);
          }
        } else {
          article.innerHTML = html;
        }
      }
    } else {
      var article = document.querySelector('article');
      if (article) {
        article.innerHTML += html;
      }
    }

    if (window.Editor && window.Editor.updateWordCount) {
      window.Editor.updateWordCount();
    }

    if (window.WorksStore && window.WorksStore.getCurrentWork()) {
      saveCurrentChapter();
    }

    showNotification('AI 生成完成', 'ai', { detail: actionText ? actionText + ' 操作已完成' : 'AI 助手已完成本次生成' });
  }

  function saveCurrentChapter() {
    var currentWork = window.WorksStore ? window.WorksStore.getCurrentWork() : null;
    if (!currentWork) return;

    var activeTab = document.querySelector('.ds-editortab.is-active');
    if (!activeTab) return;

    var chapterTitle = activeTab.textContent.trim();
    var chapter = currentWork.chapters.find(function(c) { return c.title === chapterTitle; });

    if (!chapter) return;

    var article = document.querySelector('article');
    if (!article) return;

    chapter.content = article.innerHTML;
    chapter.lastEdit = new Date().toLocaleString('zh-CN');

    window.WorksStore.updateWork(currentWork.id, {
      chapters: currentWork.chapters
    });
  }

  function initAutoSave() {
    var article = document.querySelector('article');
    if (!article) return;

    var autoSaveEnabled = localStorage.getItem('ai_writing_auto_save') !== 'false';

    var saveHandler = window.Utils && window.Utils.debounce ? window.Utils.debounce(function() {
      try {
        autoSaveEnabled = localStorage.getItem('ai_writing_auto_save') !== 'false';
        if (!autoSaveEnabled) return;
        updateSaveIndicator('saving');
        if (window.Editor && window.Editor.saveCurrentChapter) {
          window.Editor.saveCurrentChapter();
        } else {
          saveCurrentChapter();
        }
        updateSaveIndicator('saved');
        addNotification('auto_save', '内容已自动保存', 'info');
      } catch (e) {
        console.warn('自动保存失败:', e);
        updateSaveIndicator('unsaved');
      }
    }, 2000) : function() {
      autoSaveEnabled = localStorage.getItem('ai_writing_auto_save') !== 'false';
      if (!autoSaveEnabled) return;
      updateSaveIndicator('saving');
      if (window.Editor && window.Editor.saveCurrentChapter) {
        window.Editor.saveCurrentChapter();
      } else {
        saveCurrentChapter();
      }
      updateSaveIndicator('saved');
    };

    article.addEventListener('input', function() {
      updateSaveIndicator('unsaved');
      saveHandler();
    });
  }

  function updateSaveIndicator(status) {
    status = status || 'saved';
    var statusBar = document.querySelector('section .flex.items-center.gap-4');
    if (!statusBar) return;

    var spans = statusBar.querySelectorAll('span');
    if (spans.length < 3) return;

    var saveSpan = spans[2];
    if (!saveSpan) return;

    if (status === 'saving') {
      saveSpan.innerHTML = '<img src="../assets/icons/dl-builtin-trae/clock.svg" width="12" height="12" alt="" class="opacity-50" style="vertical-align: middle; margin-right: 4px;"><span>保存中...</span>';
    } else if (status === 'saved') {
      saveSpan.innerHTML = '<img src="../assets/icons/dl-builtin-trae/check-circle.33c192.svg" width="12" height="12" alt="" style="color: var(--icon-brand); vertical-align: middle; margin-right: 4px;"><span>已保存</span>';
    } else if (status === 'unsaved') {
      saveSpan.innerHTML = '<img src="../assets/icons/dl-builtin-trae/alert-circle.svg" width="12" height="12" alt="" class="opacity-50" style="vertical-align: middle; margin-right: 4px;"><span>未保存</span>';
    }
  }

  function initPasteHandler() {
    var article = document.querySelector('article');
    if (!article) return;

    article.addEventListener('paste', function(e) {
      e.preventDefault();
      var text = e.clipboardData ? e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain') : '';

      if (!text) return;

      var cleanText = text.replace(/<[^>]*>/g, '').replace(/\r\n/g, '\n');
      var paragraphs = processNovelText(cleanText);
      var html = paragraphsToHtml(paragraphs);

      var selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        var range = selection.getRangeAt(0);
        range.deleteContents();
        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        while (tempDiv.firstChild) {
          range.insertNode(tempDiv.firstChild);
        }
      } else {
        article.innerHTML += html;
      }

      if (window.Editor && window.Editor.updateWordCount) {
        window.Editor.updateWordCount();
      }

      showNotification('粘贴已格式化', 'info');
    });
  }

  function expandMaterial(title, content, btn) {
    var messagesContainer = document.getElementById('chat-messages-container');
    if (!messagesContainer) return;

    btn.disabled = true;
    btn.textContent = '展开中...';

    var userMsg = createMessageEl('用户', 'AI 展开：' + title, 'user');
    messagesContainer.appendChild(userMsg);

    var aiMsg = createMessageEl('AI', '', 'ai');
    var aiContent = aiMsg.querySelector('.msg-content');
    aiContent.innerHTML = '<span style="color: var(--text-tertiary);">正在展开...</span>';
    messagesContainer.appendChild(aiMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    var context = window.Utils && window.Utils.getWorkContext ? window.Utils.getWorkContext() : {};
    context.materialTitle = title;
    context.materialContent = content;

    var messages = window.AIService.PROMPTS.expandMaterial(context, title, content);

    window.AIService.chat(messages, {
      stream: true,
      temperature: 0.8,
      max_tokens: 4096,
      onChunk: function(chunk, fullText) {
        if (!aiContent) return;
        var safeChunk = window.Utils ? window.Utils.sanitizeHtml(fullText) : fullText;
        aiContent.innerHTML = safeChunk;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      },
      onDone: function(fullText) {
        btn.disabled = false;
        btn.textContent = 'AI 展开';
        showNotification('素材展开完成', 'info');
      },
      onError: function(err) {
        btn.disabled = false;
        btn.textContent = 'AI 展开';
        if (aiContent) {
          aiContent.innerHTML = '<span style="color: var(--text-error);">展开失败：' + (err.message || '未知错误') + '</span>';
        }
        console.warn('素材展开失败:', err);
      }
    });
  }

  function showConfirmDialog(message, onConfirm) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:1000; display:flex; align-items:center; justify-content:center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'width:360px; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.4); padding:24px; animation:fadeIn 0.2s ease-out;';

    dialog.innerHTML =
      '<div style="font-size:15px; color:var(--text-default); margin-bottom:20px;">' + message + '</div>' +
      '<div style="display:flex; justify-content:flex-end; gap:8px;">' +
      '<button id="confirm-cancel" style="padding:8px 16px; background:transparent; color:var(--text-secondary); border:1px solid var(--border-neutral-l1); border-radius:6px; font-size:13px;">取消</button>' +
      '<button id="confirm-ok" style="padding:8px 16px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; font-size:13px;">确定</button>' +
      '</div>';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    document.getElementById('confirm-cancel').addEventListener('click', function() { overlay.remove(); });
    document.getElementById('confirm-ok').addEventListener('click', function() {
      onConfirm();
      overlay.remove();
    });
  }

  function showNotification(message, type, options) {
    type = type || 'info';
    options = options || {};

    if (options.addToCenter !== false) {
      var centerTypes = ['success', 'info', 'ai', 'auto_save', 'achievement', 'system'];
      if (centerTypes.indexOf(type) !== -1 || options.forceCenter) {
        try {
          addNotification(type, message, options.detail || '', options.icon);
        } catch (e) {}
      }
    }

    var existing = document.getElementById('notification-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'notification-toast';

    var bgColor = 'var(--bg-overlay-l3)';
    var textColor = 'var(--text-default)';
    if (type === 'error') {
      bgColor = 'var(--bg-error)';
      textColor = 'var(--text-onbrand)';
    } else if (type === 'warn') {
      bgColor = 'var(--bg-warning)';
      textColor = 'var(--text-default)';
    } else if (type === 'info' || type === 'success' || type === 'ai' || type === 'auto_save' || type === 'achievement') {
      bgColor = 'var(--bg-brand)';
      textColor = 'var(--text-onbrand)';
    }

    toast.style.cssText = 'position:fixed; top:24px; right:24px; padding:12px 16px; background:' + bgColor + '; color:' + textColor + '; border-radius:8px; font-size:13px; z-index:2000; animation: slideIn 0.3s ease-out; box-shadow:0 4px 12px rgba(0,0,0,0.2); max-width:320px;';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(function() {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, options.duration || 3000);
  }

  function initWritingReminders() {
    var article = document.querySelector('article');
    if (!article) return;

    var today = new Date().toDateString();
    var dailyStatsKey = 'ai_writing_daily_stats_' + today;
    var stats = JSON.parse(localStorage.getItem(dailyStatsKey) || '{}');
    if (!stats.words) stats.words = 0;
    if (!stats.startTime) stats.startTime = Date.now();

    var lastReminderTime = 0;
    var reminderInterval = 30 * 60 * 1000;

    setInterval(function() {
      var now = Date.now();
      if (now - lastReminderTime < reminderInterval) return;

      var text = article.innerText || article.textContent || '';
      var cleanText = text.replace(/\s/g, '');
      var wordCount = cleanText.length;

      if (wordCount > 0) {
        var readingMin = Math.max(1, Math.round(wordCount / 500));
        lastReminderTime = now;

        var randomTips = [
          '写作累了吗？站起来活动一下吧',
          '记得喝水，保持身体水分',
          '远眺一下，保护眼睛',
          '好的作品需要时间，慢慢来',
          '保持专注，你写得很棒！',
          '试试深呼吸，放松一下'
        ];
        var tip = randomTips[Math.floor(Math.random() * randomTips.length)];
        addNotification('tip', '写作提醒', tip + '（已写 ' + wordCount.toLocaleString() + ' 字，约 ' + readingMin + ' 分钟阅读量）');
      }
    }, 5 * 60 * 1000);

    var savedDate = localStorage.getItem('ai_writing_last_daily_date');
    if (savedDate !== today) {
      localStorage.setItem('ai_writing_last_daily_date', today);
      var dailyGoal = localStorage.getItem('ai_writing_daily_goal') || 2000;
      setTimeout(function() {
        addNotification('system', '今日写作目标', '今天的目标是写 ' + parseInt(dailyGoal).toLocaleString() + ' 字，开始创作吧！');
      }, 2000);
    }
  }

  function init() {
    try { initNav(); } catch (e) { console.warn('导航初始化失败:', e); }
    try { initTabs(); } catch (e) { console.warn('标签页初始化失败:', e); }
    try { initButtons(); } catch (e) { console.warn('按钮初始化失败:', e); }
    try { initDialogs(); } catch (e) { console.warn('对话框初始化失败:', e); }
    try { initFileTree(); } catch (e) { console.warn('文件树初始化失败:', e); }
    try { initEditorTabs(); } catch (e) { console.warn('编辑器标签初始化失败:', e); }
    try { initSearch(); } catch (e) { console.warn('搜索初始化失败:', e); }
    try { initPagination(); } catch (e) { console.warn('分页初始化失败:', e); }
    try { initWorksPage(); } catch (e) { console.warn('作品页面初始化失败:', e); }
    try { initMaterialsPage(); } catch (e) { console.warn('素材页面初始化失败:', e); }
    try { initNewWorkPage(); } catch (e) { console.warn('新建作品页面初始化失败:', e); }
    try { initNotificationCenter(); } catch (e) { console.warn('通知中心初始化失败:', e); }
    try { initTheme(); } catch (e) { console.warn('主题初始化失败:', e); }
    try { initSettings(); } catch (e) { console.warn('设置初始化失败:', e); }
    try { initCreatorMenu(); } catch (e) { console.warn('创作者菜单初始化失败:', e); }
    try { initQuickButtons(); } catch (e) { console.warn('快捷按钮初始化失败:', e); }
    try { initAutoSave(); } catch (e) { console.warn('自动保存初始化失败:', e); }
    try { initPasteHandler(); } catch (e) { console.warn('粘贴处理初始化失败:', e); }
    try { initWritingReminders(); } catch (e) { console.warn('写作提醒初始化失败:', e); }
    try { initAIConfig(); } catch (e) { console.warn('AI配置初始化失败:', e); }

    if (window.Editor && window.Editor.init) {
      try { window.Editor.init(); } catch (e) { console.warn('编辑器初始化失败:', e); }
    }
    if (window.Composer && window.Composer.init) {
      try { window.Composer.init(); } catch (e) { console.warn('AI对话初始化失败:', e); }
    }
    if (window.MemoryPanel && window.MemoryPanel.init) {
      try { window.MemoryPanel.init(); } catch (e) { console.warn('设定面板初始化失败:', e); }
    }

    window.addEventListener('beforeunload', function() {
      if (window.Composer && window.Composer.cleanup) {
        window.Composer.cleanup();
      }
      if (window.Editor && window.Editor.cleanup) {
        window.Editor.cleanup();
      }
      if (window.MemoryPanel && window.MemoryPanel.cleanup) {
        window.MemoryPanel.cleanup();
      }
      if (window.Utils && window.Utils.EventManager) {
        window.Utils.EventManager.clear();
      }
    });

    var styleSheet = document.createElement('style');
    styleSheet.textContent = '\n      @keyframes slideDown {\n        from { opacity: 0; transform: translateY(-10px); }\n        to { opacity: 1; transform: translateY(0); }\n      }\n      @keyframes fadeInCenter {\n        from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }\n        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }\n      }\n      @keyframes fadeIn {\n        from { opacity: 0; }\n        to { opacity: 1; }\n      }\n      @keyframes slideIn {\n        from { opacity: 0; transform: translateX(100%); }\n        to { opacity: 1; transform: translateX(0); }\n      }\n      @keyframes slideOut {\n        from { opacity: 1; transform: translateX(0); }\n        to { opacity: 0; transform: translateX(100%); }\n      }\n    ';
    document.head.appendChild(styleSheet);
  }

  window.getWorkContext = getWorkContext;
  window.getEditorText = getEditorText;
  window.showNotification = showNotification;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();