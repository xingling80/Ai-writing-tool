(function() {
  'use strict';

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

    var article = document.getElementById('editor-article');
    if (article) {
      article.addEventListener('input', function() {
        updateWordCount();
      });
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
    volumeDiv.className = 'outline-volume';

    var volumeRow = document.createElement('div');
    volumeRow.className = 'outline-volume-row flex items-center gap-2 px-2 rounded cursor-pointer';
    volumeRow.style.cssText = 'height: 32px; color: var(--text-default); font-size: 13px; font-weight: 500;';

    var chevron = document.createElement('img');
    chevron.src = '../assets/icons/dl-builtin-trae/chevron-down.svg';
    chevron.width = 12;
    chevron.height = 12;
    chevron.className = 'flex-shrink-0';
    chevron.style.color = 'var(--icon-tertiary)';

    var folderIcon = document.createElement('img');
    folderIcon.src = '../assets/icons/dl-builtin-trae/folder.svg';
    folderIcon.width = 14;
    folderIcon.height = 14;
    folderIcon.className = 'flex-shrink-0';
    folderIcon.style.color = 'var(--icon-brand)';

    var volumeTitle = document.createElement('span');
    volumeTitle.className = 'truncate';
    volumeTitle.textContent = window.Utils.escapeHtml(work.title || defaultVolumeTitle);

    volumeRow.appendChild(chevron);
    volumeRow.appendChild(folderIcon);
    volumeRow.appendChild(volumeTitle);
    volumeDiv.appendChild(volumeRow);

    var chaptersContainer = document.createElement('div');
    chaptersContainer.className = 'outline-chapters-container';

    work.chapters.forEach(function(chapter) {
      var isActive = currentChapterId === chapter.id;
      var chapterRow = document.createElement('div');
      chapterRow.className = 'outline-chapter-row';
      chapterRow.dataset.chapterId = chapter.id;
      chapterRow.style.cssText =
        'display: flex; align-items: center; gap: 4px; border-radius: 4px; cursor: pointer; height: 32px; padding: 0 8px 0 28px; margin: 2px 6px; border-left: 2px solid ' +
        (isActive ? 'var(--bg-brand)' : 'transparent') + '; background: ' +
        (isActive ? 'var(--bg-overlay-l1)' : 'transparent') + '; color: ' +
        (isActive ? 'var(--icon-brand)' : 'var(--text-secondary)') + '; font-size: 13px; transition: all 0.15s ease;';

      var fileIcon = document.createElement('img');
      fileIcon.src = '../assets/icons/dl-builtin-trae/file-text.svg';
      fileIcon.width = 14;
      fileIcon.height = 14;
      fileIcon.className = 'flex-shrink-0';
      fileIcon.style.opacity = isActive ? '1' : '0.6';

      var chapterTitle = document.createElement('span');
      chapterTitle.className = 'truncate flex-1';
      chapterTitle.textContent = window.Utils.escapeHtml(chapter.title || '未命名章节');

      var delBtn = document.createElement('button');
      delBtn.className = 'chapter-delete-btn flex-shrink-0';
      delBtn.style.cssText = 'width:20px; height:20px; border:none; background:transparent; color:var(--text-tertiary); font-size:12px; cursor:pointer; padding:0; display:none; align-items:center; justify-content:center; border-radius:3px;';
      delBtn.innerHTML = '✕';

      chapterRow.appendChild(fileIcon);
      chapterRow.appendChild(chapterTitle);
      chapterRow.appendChild(delBtn);

      chapterRow.addEventListener('click', function(e) {
        if (!delBtn.contains(e.target)) {
          selectChapter(chapter.id);
        }
      });

      chapterRow.addEventListener('mouseenter', function() {
        if (!isActive) {
          chapterRow.style.background = 'var(--bg-overlay-l2)';
        }
        delBtn.style.display = 'flex';
      });

      chapterRow.addEventListener('mouseleave', function() {
        if (!isActive) {
          chapterRow.style.background = 'transparent';
        }
        delBtn.style.display = 'none';
      });

      delBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        showConfirmDialog('确定删除章节 "' + (chapter.title || '未命名章节') + '" 吗？', function() {
          closeChapterTab(chapter.id);
        });
      });

      chaptersContainer.appendChild(chapterRow);
    });

    volumeDiv.appendChild(chaptersContainer);
    container.appendChild(volumeDiv);

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
    addChapterBtn.style.cssText = 'height: 32px; background: transparent; border: 1px dashed var(--border-neutral-l2); color: var(--text-tertiary); font-size: 12px; transition: all 0.15s;';
    addChapterBtn.innerHTML =
      '<img src="../assets/icons/dl-builtin-trae/plus.svg" width="14" height="14" alt="" style="opacity: 0.6;">' +
      '<span>新建章节</span>';
    addChapterBtn.addEventListener('click', function() {
      showAddChapterDialog(work);
    });
    addChapterBtn.addEventListener('mouseenter', function() {
      addChapterBtn.style.borderColor = 'var(--border-neutral-l1)';
      addChapterBtn.style.color = 'var(--text-secondary)';
    });
    addChapterBtn.addEventListener('mouseleave', function() {
      addChapterBtn.style.borderColor = 'var(--border-neutral-l2)';
      addChapterBtn.style.color = 'var(--text-tertiary)';
    });
    container.appendChild(addChapterBtn);
  }

  function renderEditorTabs(work) {
    var container = document.getElementById('editor-tabs-container');
    if (!container) return;

    container.innerHTML = '';

    var scrollLeftBtn = document.createElement('button');
    scrollLeftBtn.className = 'ds-editortabs__scroll-btn';
    scrollLeftBtn.innerHTML = '<img src="../assets/icons/dl-builtin-trae/chevron-left.svg" width="14" height="14" alt="scroll left">';
    scrollLeftBtn.addEventListener('click', function() {
      scrollContainer.scrollBy({ left: -150, behavior: 'smooth' });
    });

    var scrollWrapper = document.createElement('div');
    scrollWrapper.className = 'ds-editortabs__scroll-wrapper';

    var scrollContainer = document.createElement('div');
    scrollContainer.className = 'ds-editortabs__scroll-container';
    scrollWrapper.appendChild(scrollContainer);

    var scrollRightBtn = document.createElement('button');
    scrollRightBtn.className = 'ds-editortabs__scroll-btn ds-editortabs__scroll-btn--right';
    scrollRightBtn.innerHTML = '<img src="../assets/icons/dl-builtin-trae/chevron-right.svg" width="14" height="14" alt="scroll right">';
    scrollRightBtn.addEventListener('click', function() {
      scrollContainer.scrollBy({ left: 150, behavior: 'smooth' });
    });

    var dropdownBtn = document.createElement('button');
    dropdownBtn.className = 'ds-editortabs__dropdown-btn';
    dropdownBtn.innerHTML = '<img src="../assets/icons/dl-builtin-trae/chevron-down.svg" width="12" height="12" alt="more">';

    var dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'ds-editortabs__dropdown-menu';

    dropdownBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      dropdownMenu.classList.toggle('is-visible');
    });

    document.addEventListener('click', function() {
      dropdownMenu.classList.remove('is-visible');
    });

    dropdownMenu.addEventListener('click', function(e) {
      e.stopPropagation();
    });

    function updateScrollButtons() {
      var canScrollLeft = scrollContainer.scrollLeft > 0;
      var canScrollRight = scrollContainer.scrollLeft < scrollContainer.scrollWidth - scrollContainer.clientWidth - 5;

      scrollLeftBtn.disabled = !canScrollLeft;
      scrollRightBtn.disabled = !canScrollRight;

      if (canScrollLeft) {
        scrollLeftBtn.classList.add('ds-editortabs__scroll-btn--show');
      } else {
        scrollLeftBtn.classList.remove('ds-editortabs__scroll-btn--show');
      }

      if (canScrollRight) {
        scrollRightBtn.classList.add('ds-editortabs__scroll-btn--show');
      } else {
        scrollRightBtn.classList.remove('ds-editortabs__scroll-btn--show');
      }
    }

    scrollContainer.addEventListener('scroll', updateScrollButtons);

    if (!work.chapters || work.chapters.length === 0) {
      container.appendChild(scrollLeftBtn);
      container.appendChild(scrollWrapper);
      container.appendChild(scrollRightBtn);
      container.appendChild(dropdownBtn);
      container.appendChild(dropdownMenu);
      return;
    }

    work.chapters.forEach(function(chapter, index) {
      var isActive = currentChapterId === chapter.id;
      var tab = document.createElement('span');
      tab.className = 'ds-editortab' + (isActive ? ' is-active' : '');
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      tab.dataset.chapterId = chapter.id;

      tab.innerHTML =
        '<span class="ic"><img src="../assets/icons/dl-builtin-trae/file-text.svg" width="14" height="14" alt="" class="icon" style="opacity: ' + (isActive ? '1' : '0.6') + ';"></span>' +
        '<span>' + window.Utils.escapeHtml(chapter.title || '未命名章节') + '</span>' +
        '<span class="close"><img src="../assets/icons/dl-builtin-trae/x.svg" width="12" height="12" alt="close" class="icon"></span>';

      tab.addEventListener('click', function(e) {
        var closeBtn = tab.querySelector('.close');
        if (closeBtn && closeBtn.contains(e.target)) {
          closeChapterTab(chapter.id);
          return;
        }
        selectChapter(chapter.id);
      });

      scrollContainer.appendChild(tab);

      var dropdownItem = document.createElement('div');
      dropdownItem.className = 'ds-editortabs__dropdown-item' + (isActive ? ' is-active' : '');
      dropdownItem.dataset.chapterId = chapter.id;
      dropdownItem.innerHTML =
        '<img src="../assets/icons/dl-builtin-trae/file-text.svg" width="14" height="14" alt="" style="opacity: ' + (isActive ? '1' : '0.6') + ';">' +
        '<span class="flex-1 truncate">' + window.Utils.escapeHtml(chapter.title || '未命名章节') + '</span>' +
        '<span class="chapter-num">Ch' + (index + 1) + '</span>';

      dropdownItem.addEventListener('click', function() {
        selectChapter(chapter.id);
        dropdownMenu.classList.remove('is-visible');
      });

      dropdownMenu.appendChild(dropdownItem);
    });

    container.appendChild(scrollLeftBtn);
    container.appendChild(scrollWrapper);
    container.appendChild(scrollRightBtn);
    container.appendChild(dropdownBtn);
    container.appendChild(dropdownMenu);

    setTimeout(function() {
      updateScrollButtons();
      var activeTab = scrollContainer.querySelector('.ds-editortab.is-active');
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      }
    }, 100);
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

    var dropdownItems = document.querySelectorAll('.ds-editortabs__dropdown-item');
    dropdownItems.forEach(function(item) {
      var isActive = item.dataset.chapterId === chapterId;
      if (isActive) {
        item.classList.add('is-active');
        var icon = item.querySelector('img');
        if (icon) icon.style.opacity = '1';
      } else {
        item.classList.remove('is-active');
        var icon = item.querySelector('img');
        if (icon) icon.style.opacity = '0.6';
      }
    });
  }

  var lastMilestone = 0;
  var milestones = [500, 1000, 2000, 3000, 5000, 8000, 10000, 15000, 20000, 30000, 50000, 100000];

  function checkWordMilestone(wordCount) {
    if (!window.showNotification) return;
    if (wordCount <= lastMilestone) return;

    for (var i = milestones.length - 1; i >= 0; i--) {
      if (wordCount >= milestones[i] && lastMilestone < milestones[i]) {
        lastMilestone = milestones[i];
        window.showNotification('🎉 字数里程碑', 'achievement', {
          detail: '恭喜！本章已达到 ' + milestones[i].toLocaleString() + ' 字'
        });
        break;
      }
    }
  }

  function updateWordCount() {
    var article = document.querySelector('article');
    if (!article) return;

    var text = article.innerText || article.textContent || '';
    var cleanText = text.replace(/\s/g, '');
    var wordCount = cleanText.length;

    checkWordMilestone(wordCount);

    var outlineStats = document.querySelector('#outline-tree-container + div span, .flex-shrink-0.px-4.py-2 span');
    if (outlineStats) {
      outlineStats.textContent = '本章 ' + wordCount.toLocaleString() + ' 字';
    }

    var statusBar = document.querySelector('section .flex.items-center.gap-4');
    if (statusBar) {
      var firstSpan = statusBar.querySelector('span');
      if (firstSpan) {
        firstSpan.textContent = '本章 ' + wordCount.toLocaleString() + ' 字';
      }
    }

    var currentWork = window.WorksStore ? window.WorksStore.getCurrentWork() : null;
    if (currentWork) {
      var progress = currentWork.targetWordCount > 0
        ? Math.min(100, Math.round((wordCount / currentWork.targetWordCount) * 100))
        : 0;
      var progressSpans = statusBar ? statusBar.querySelectorAll('span') : [];
      if (progressSpans.length >= 2) {
        progressSpans[1].textContent = '总进度 ' + progress + '%';
      }
      var readingMin = Math.max(1, Math.round(wordCount / 500));
      if (progressSpans.length >= 4) {
        progressSpans[3].textContent = '阅读时长 约 ' + readingMin + ' 分钟';
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
        '<h2 style="font-size: var(--heading-sm-font-size); font-weight: 600; color: var(--text-default); line-height: 1.4; margin-bottom: 32px; text-wrap: balance;">' + window.Utils.escapeHtml(chapter.title || '未命名章节') + '</h2>' +
        '<p><br></p>';
      article.focus();
      var range = document.createRange();
      var sel = window.getSelection();
      var firstP = article.querySelector('p');
      if (firstP) {
        range.setStart(firstP, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }

    if (typeof updateWordCount === 'function') {
      var text = article.innerText || article.textContent || '';
      var cleanText = text.replace(/\s/g, '');
      var wc = cleanText.length;
      lastMilestone = 0;
      for (var i = milestones.length - 1; i >= 0; i--) {
        if (wc >= milestones[i]) {
          lastMilestone = milestones[i];
          break;
        }
      }
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

  function showConfirmDialog(title, message, onConfirm, onCancel) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:9999; display:flex; align-items:center; justify-content:center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'background:var(--bg-base-secondary); border:1px solid var(--border-neutral-l2); border-radius:12px; padding:24px; width:360px; max-width:90%; box-shadow:0 8px 32px rgba(0,0,0,0.4); animation:fadeIn 0.2s ease-out;';

    dialog.innerHTML =
      '<h3 style="font-size:16px; font-weight:600; color:var(--text-default); margin:0 0 12px 0;">' + (window.Utils ? window.Utils.escapeHtml(title) : title) + '</h3>' +
      '<p style="font-size:13px; color:var(--text-secondary); line-height:1.6; margin:0 0 24px 0;">' + (window.Utils ? window.Utils.escapeHtml(message) : message) + '</p>' +
      '<div style="display:flex; justify-content:flex-end; gap:8px;">' +
      '<button class="cancel-btn" style="padding:6px 16px; height:32px; background:transparent; color:var(--text-secondary); border:1px solid var(--border-neutral-l1); border-radius:6px; cursor:pointer; font-size:13px;">取消</button>' +
      '<button class="confirm-btn" style="padding:6px 16px; height:32px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; cursor:pointer; font-size:13px;">确认</button>' +
      '</div>';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    dialog.querySelector('.cancel-btn').addEventListener('click', function() {
      overlay.remove();
      if (onCancel) onCancel();
    });

    dialog.querySelector('.confirm-btn').addEventListener('click', function() {
      overlay.remove();
      if (onConfirm) onConfirm();
    });

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        overlay.remove();
        if (onCancel) onCancel();
      }
    });
  }

  function closeChapterTab(chapterId) {
    if (!chapterId || !currentChapterId) return;

    var work = window.WorksStore ? window.WorksStore.getCurrentWork() : null;
    if (!work || !work.chapters) return;

    if (work.chapters.length === 1) {
      showNotification('至少保留一个章节', 'warn');
      return;
    }

    var chapter = work.chapters.find(function(c) { return c.id === chapterId; });
    var chapterTitle = chapter ? chapter.title : '未命名章节';

    showConfirmDialog(
      '删除章节',
      '确定要删除章节 "' + chapterTitle + '" 吗？此操作不可恢复。',
      function() {
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

        var updatedWork = window.WorksStore ? window.WorksStore.getCurrentWork() : work;
        renderOutlineTree(updatedWork);
        renderEditorTabs(updatedWork);
        showNotification('章节已删除', 'info');
      }
    );
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

  function initOutlineTree() {}

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

  function showInputDialog(title, placeholder, onConfirm) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:9999; display:flex; align-items:center; justify-content:center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'background:var(--bg-base-secondary); border:1px solid var(--border-neutral-l2); border-radius:12px; padding:24px; width:420px; max-width:90%; box-shadow:0 8px 32px rgba(0,0,0,0.4); animation:fadeIn 0.2s ease-out;';

    dialog.innerHTML =
      '<h3 style="font-size:16px; color:var(--text-default); margin-bottom:16px;">' + window.Utils.escapeHtml(title) + '</h3>' +
      '<input type="text" placeholder="' + window.Utils.escapeHtml(placeholder) + '" style="width:100%; height:36px; padding:8px 12px; background:var(--bg-base-tertiary); color:var(--text-default); border:1px solid var(--border-neutral-l2); border-radius:8px; font-size:13px; outline:none; box-sizing:border-box;">' +
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

    document.execCommand('styleWithCSS', false, true);

    if (type === 'bold') {
      document.execCommand('bold', false);
    } else if (type === 'italic') {
      document.execCommand('italic', false);
    } else if (type === 'underline') {
      document.execCommand('underline', false);
    } else if (type === 'strikethrough') {
      document.execCommand('strikeThrough', false);
    } else if (type === 'heading') {
      document.execCommand('formatBlock', false, 'h3');
    } else if (type === 'list') {
      document.execCommand('insertUnorderedList', false);
    } else if (type === 'link') {
      var url = prompt('请输入链接地址：');
      if (url) {
        document.execCommand('createLink', false, url);
      }
    }

    updateWordCount();
  }

  window.Editor = {
    init: initEditorPage,
    selectChapter: selectChapter,
    saveCurrentChapter: saveCurrentChapter,
    updateWordCount: updateWordCount,
    initFormattingToolbar: initFormattingToolbar,
    scrollToChapter: scrollToChapter,
    get currentChapterId() { return currentChapterId; }
  };

})();