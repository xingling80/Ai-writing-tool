(function() {
  'use strict';

  function escapeHtml(text) {
    if (window.Utils && window.Utils.escapeHtml) {
      return window.Utils.escapeHtml(text);
    }
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function initMemoryPanel() {
    var rightPanel = document.getElementById('ai-assistant-panel') || document.querySelector('aside[style*="width: 360px"]') || document.querySelector('aside');
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
          window.showNotification(leftPanel.style.display === 'flex' ? '大纲面板已显示' : '大纲面板已隐藏', 'info');
        }
      });
    }

    var sidebarToggle = rightPanel.querySelector('.flex.items-center.justify-center.w-6.h-6.cursor-pointer');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', function() {
        rightPanel.style.display = rightPanel.style.display === 'none' ? 'flex' : 'none';
        if (rightPanel.style.display === 'none') {
          showRightPanelRestoreBtn();
        }
        window.showNotification(rightPanel.style.display === 'flex' ? '右侧面板已显示' : '右侧面板已隐藏', 'info');
      });
    }
  }

  var rightPanelRestoreBtn = null;

  function showRightPanelRestoreBtn() {
    if (rightPanelRestoreBtn) return;

    rightPanelRestoreBtn = document.createElement('button');
    rightPanelRestoreBtn.id = 'restore-right-panel-btn';
    rightPanelRestoreBtn.style.cssText = 'position:fixed; right:12px; top:50%; transform:translateY(-50%); width:32px; height:32px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:999; box-shadow:0 2px 8px rgba(0,0,0,0.2); transition:all 0.2s;';
    rightPanelRestoreBtn.innerHTML = '<img src="../assets/icons/dl-builtin-trae/sidebar-right.svg" width="16" height="16" alt="" style="filter:invert(1);">';
    rightPanelRestoreBtn.title = '显示右侧面板';

    rightPanelRestoreBtn.addEventListener('click', function() {
      var rightPanel = document.getElementById('ai-assistant-panel') || document.querySelector('aside[style*="width: 360px"]') || document.querySelectorAll('aside')[1];
      if (rightPanel) {
        rightPanel.style.display = 'flex';
      }
      if (rightPanelRestoreBtn) {
        rightPanelRestoreBtn.remove();
        rightPanelRestoreBtn = null;
      }
      window.showNotification('右侧面板已显示', 'info');
    });

    rightPanelRestoreBtn.addEventListener('mouseenter', function() {
      rightPanelRestoreBtn.style.transform = 'translateY(-50%) scale(1.1)';
    });
    rightPanelRestoreBtn.addEventListener('mouseleave', function() {
      rightPanelRestoreBtn.style.transform = 'translateY(-50%) scale(1)';
    });

    document.body.appendChild(rightPanelRestoreBtn);
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

    var tabs = ['角色设定簿', '世界观', '伏笔追踪', '全局摘要', '文风'];
    var tabBtnsHtml = '';
    tabs.forEach(function(tab, i) {
      tabBtnsHtml += '<button class="memory-tab-btn" data-tab="' + i + '" style="padding:8px 14px; background:' + (i === 0 ? 'var(--bg-overlay-l1)' : 'transparent') + '; color:' + (i === 0 ? 'var(--text-default)' : 'var(--text-tertiary)') + '; border:none; border-bottom:2px solid ' + (i === 0 ? 'var(--bg-brand)' : 'transparent') + '; font-size:13px; cursor:pointer; white-space:nowrap; transition:all 0.15s;">' + tab + '</button>';
    });

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
      '<div class="memory-tab-content" data-tab="0" style="padding:16px; overflow-y:auto; flex:1;">' +
        charactersHtml +
        '<div style="display:flex; gap:8px; margin-top:12px;">' +
        '<button id="add-character-btn" style="padding:6px 14px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; font-size:12px; cursor:pointer;">添加角色</button>' +
        '<button id="extract-characters-btn" style="padding:6px 14px; background:transparent; color:var(--text-brand); border:1px solid var(--border-neutral-l1); border-radius:6px; font-size:12px; cursor:pointer;">从文本提取</button>' +
        '</div>' +
      '</div>',

      '<div class="memory-tab-content" data-tab="1" style="padding:16px; overflow-y:auto; flex:1;">' +
        '<textarea id="memory-world-settings" style="width:100%; min-height:200px; padding:10px 12px; background:var(--bg-overlay-l1); border:1px solid var(--border-neutral-l1); border-radius:8px; color:var(--text-default); font-size:13px; line-height:1.6; resize:vertical; outline:none; box-sizing:border-box;">' + escapeHtml(memory.worldSettings || '') + '</textarea>' +
        '<div style="display:flex; justify-content:flex-end; margin-top:8px;">' +
        '<button id="save-world-settings-btn" style="padding:6px 14px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; font-size:12px; cursor:pointer;">保存</button>' +
        '</div>' +
      '</div>',

      '<div class="memory-tab-content" data-tab="2" style="padding:16px; overflow-y:auto; flex:1;">' +
        (function() {
          var html = '';
          var unresolved = memory.foreshadowing ? memory.foreshadowing.filter(function(f) { return !f.resolved; }) : [];
          var resolved = memory.foreshadowing ? memory.foreshadowing.filter(function(f) { return f.resolved; }) : [];

          if (unresolved.length > 0) {
            html += '<div style="font-size:12px; color:var(--text-tertiary); margin-bottom:8px; font-weight:500;">未解决 (' + unresolved.length + ')</div>';
            unresolved.forEach(function(f) {
              html +=
                '<div style="padding:12px; background:var(--bg-overlay-l1); border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">' +
                '<div style="flex:1; font-size:13px; color:var(--text-default); line-height:1.5;">' + escapeHtml(f.description || '未描述') +
                (f.hint ? '<div style="font-size:11px; color:var(--text-tertiary); margin-top:4px;">提示：' + escapeHtml(f.hint) + '</div>' : '') +
                '</div>' +
                '<div style="display:flex; flex-direction:column; gap:4px; flex-shrink:0;">' +
                '<button class="resolve-foreshadowing-btn" data-id="' + escapeHtml(String(f.id)) + '" style="padding:4px 10px; background:transparent; border:1px solid var(--border-neutral-l1); border-radius:4px; color:var(--icon-brand); font-size:11px; cursor:pointer;">已解决</button>' +
                '<button class="remove-foreshadowing-btn" data-id="' + escapeHtml(String(f.id)) + '" style="padding:4px 10px; background:transparent; border:1px solid var(--border-neutral-l1); border-radius:4px; color:var(--text-tertiary); font-size:11px; cursor:pointer;">删除</button>' +
                '</div>' +
                '</div>';
            });
          } else {
            html = '<div style="text-align:center; padding:24px 0; font-size:13px; color:var(--text-tertiary);">暂无未解决的伏笔</div>';
          }

          if (resolved.length > 0) {
            html += '<div style="font-size:12px; color:var(--text-tertiary); margin:16px 0 8px; font-weight:500;">已解决 (' + resolved.length + ')</div>';
            resolved.forEach(function(f) {
              html +=
                '<div style="padding:10px 12px; background:var(--bg-overlay-l1); border-radius:8px; margin-bottom:6px; opacity:0.6;">' +
                '<div style="font-size:12px; color:var(--text-secondary); text-decoration:line-through;">' + escapeHtml(f.description || '未描述') + '</div>' +
                '</div>';
            });
          }

          return html;
        })() +
        '<div style="display:flex; gap:8px; margin-top:12px;">' +
        '<button id="add-foreshadowing-btn" style="padding:6px 14px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; font-size:12px; cursor:pointer;">添加伏笔</button>' +
        '<button id="extract-foreshadowing-btn" style="padding:6px 14px; background:transparent; color:var(--text-brand); border:1px solid var(--border-neutral-l1); border-radius:6px; font-size:12px; cursor:pointer;">从文本提取</button>' +
        '</div>' +
      '</div>',

      '<div class="memory-tab-content" data-tab="3" style="padding:16px; overflow-y:auto; flex:1;">' +
        '<div id="memory-summary-display" style="padding:12px; background:var(--bg-overlay-l1); border-radius:8px; font-size:13px; line-height:1.7; color:var(--text-default); white-space:pre-wrap; min-height:120px;">' + escapeHtml(memory.globalSummary || '暂无摘要') + '</div>' +
        '<div style="display:flex; justify-content:flex-end; margin-top:8px;">' +
        '<button id="ai-update-summary-btn" style="padding:6px 14px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; font-size:12px; cursor:pointer; display:flex; align-items:center; gap:4px;">' +
        '<img src="../assets/icons/dl-builtin-trae/sparkles.32f08c.svg" width="12" height="12" alt="">AI更新摘要</button>' +
        '</div>' +
      '</div>',

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

    document.getElementById('close-memory-panel').addEventListener('click', function() { overlay.remove(); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

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

    var addCharBtn = document.getElementById('add-character-btn');
    if (addCharBtn) {
      addCharBtn.addEventListener('click', function() {
        showAddCharacterDialog(function(character) {
          window.AIService.updateMemory('character', character);
          window.showNotification('角色 "' + character.name + '" 已添加', 'info');
          overlay.remove();
          showMemoryPanel();
        });
      });
    }

    var extractBtn = document.getElementById('extract-characters-btn');
    if (extractBtn) {
      extractBtn.addEventListener('click', function() {
        if (window.Composer && window.Composer.isGenerating) return;
        var editorText = getEditorText();
        if (!editorText) {
          window.showNotification('编辑器中没有内容', 'warn');
          return;
        }
        extractBtn.textContent = '提取中...';
        extractBtn.style.pointerEvents = 'none';

        var chatMessagesContainer = document.getElementById('chat-messages-container');
        var aiMsg = null;
        var aiContent = null;
        if (chatMessagesContainer) {
          aiMsg = createMessageEl('AI', '正在从文本中提取角色信息...', 'ai');
          chatMessagesContainer.appendChild(aiMsg);
          aiContent = aiMsg.querySelector('.msg-content');
          chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }

        var messages = window.AIService.PROMPTS.extractCharacters(editorText);
        window.AIService.chat(messages, {
          stream: false,
          temperature: 0.3,
          max_tokens: 2000,
          onDone: function(fullContent) {
            try {
              var jsonStr = fullContent.trim();
              var match = jsonStr.match(/\[[\s\S]*\]/);
              if (match) jsonStr = match[0];
              var characters = JSON.parse(jsonStr);
              if (Array.isArray(characters)) {
                characters.forEach(function(c) {
                  if (c.name) window.AIService.updateMemory('character', c);
                });
                window.showNotification('已提取 ' + characters.length + ' 个角色', 'info');
                if (aiContent) {
                  var charList = characters.map(function(c) {
                    return '• ' + c.name + (c.role ? '（' + c.role + '）' : '') + (c.description ? '：' + c.description : '');
                  }).join('\n');
                  aiContent.textContent = '成功提取 ' + characters.length + ' 个角色：\n' + charList;
                }
              }
            } catch (e) {
              window.showNotification('角色提取结果解析失败，请手动添加', 'warn');
              if (aiContent) {
                aiContent.textContent = '提取结果解析失败，原始内容：' + fullContent.substring(0, 500);
              }
            }
            extractBtn.textContent = '从文本提取';
            extractBtn.style.pointerEvents = '';
            overlay.remove();
            showMemoryPanel();
          },
          onError: function(err) {
            window.showNotification('提取失败: ' + err.message, 'error');
            if (aiContent) {
              aiContent.textContent = '提取失败：' + err.message;
            }
            extractBtn.textContent = '从文本提取';
            extractBtn.style.pointerEvents = '';
          }
        });
      });
    }

    var removeBtns = dialog.querySelectorAll('.remove-character-btn');
    removeBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var name = btn.getAttribute('data-name');
        if (name) {
          window.AIService.updateMemory('removeCharacter', name);
          window.showNotification('角色 "' + name + '" 已删除', 'info');
          overlay.remove();
          showMemoryPanel();
        }
      });
    });

    var saveWorldBtn = document.getElementById('save-world-settings-btn');
    if (saveWorldBtn) {
      saveWorldBtn.addEventListener('click', function() {
        var textarea = document.getElementById('memory-world-settings');
        var val = textarea ? textarea.value : '';
        window.AIService.updateMemory('worldSettings', val);
        window.showNotification('世界观设定已保存', 'info');
      });
    }

    var resolveBtns = dialog.querySelectorAll('.resolve-foreshadowing-btn');
    resolveBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var fId = btn.getAttribute('data-id');
        if (fId) {
          window.AIService.updateMemory('resolveForeshadowing', fId);
          window.showNotification('伏笔已标记为已解决', 'info');
          overlay.remove();
          showMemoryPanel();
        }
      });
    });

    var removeFBtns = dialog.querySelectorAll('.remove-foreshadowing-btn');
    removeFBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var fId = btn.getAttribute('data-id');
        if (fId) {
          showConfirmDialog('确定彻底删除此伏笔吗？', function() {
            window.AIService.updateMemory('removeForeshadowing', fId);
            window.showNotification('伏笔已删除', 'info');
            overlay.remove();
            showMemoryPanel();
          });
        }
      });
    });

    var aiSummaryBtn = document.getElementById('ai-update-summary-btn');
    if (aiSummaryBtn) {
      aiSummaryBtn.addEventListener('click', function() {
        if (window.Composer && window.Composer.isGenerating) return;
        var editorText = getEditorText();
        if (!editorText) {
          window.showNotification('编辑器中没有内容', 'warn');
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
            window.showNotification('全局摘要已更新', 'info');
            aiSummaryBtn.innerHTML = '<img src="../assets/icons/dl-builtin-trae/sparkles.32f08c.svg" width="12" height="12" alt="">AI更新摘要';
            aiSummaryBtn.style.pointerEvents = '';
          },
          onError: function(err) {
            window.showNotification('摘要更新失败: ' + err.message, 'error');
            aiSummaryBtn.innerHTML = '<img src="../assets/icons/dl-builtin-trae/sparkles.32f08c.svg" width="12" height="12" alt="">AI更新摘要';
            aiSummaryBtn.style.pointerEvents = '';
          }
        });
      });
    }

    var saveStyleBtn = document.getElementById('save-style-notes-btn');
    if (saveStyleBtn) {
      saveStyleBtn.addEventListener('click', function() {
        var textarea = document.getElementById('memory-style-notes');
        var val = textarea ? textarea.value : '';
        window.AIService.updateMemory('styleNotes', val);
        window.showNotification('文风备注已保存', 'info');
      });
    }

    var addForeBtn = document.getElementById('add-foreshadowing-btn');
    if (addForeBtn) {
      addForeBtn.addEventListener('click', function() {
        showAddForeshadowingDialog(function(fore) {
          window.AIService.updateMemory('foreshadowing', fore);
          window.showNotification('伏笔已添加', 'info');
          overlay.remove();
          showMemoryPanel();
        });
      });
    }

    var extractForeBtn = document.getElementById('extract-foreshadowing-btn');
    if (extractForeBtn) {
      extractForeBtn.addEventListener('click', function() {
        if (window.Composer && window.Composer.isGenerating) return;
        var editorText = getEditorText();
        if (!editorText) {
          window.showNotification('编辑器中没有内容', 'warn');
          return;
        }
        extractForeBtn.textContent = '提取中...';
        extractForeBtn.style.pointerEvents = 'none';

        var messages = window.AIService.PROMPTS.extractForeshadowing ? window.AIService.PROMPTS.extractForeshadowing(editorText) : null;
        if (!messages) {
          window.showNotification('此功能需要更新AI服务', 'warn');
          extractForeBtn.textContent = '从文本提取';
          extractForeBtn.style.pointerEvents = '';
          return;
        }

        window.AIService.chat(messages, {
          stream: false,
          temperature: 0.3,
          max_tokens: 2000,
          onDone: function(fullContent) {
            try {
              var jsonStr = fullContent.trim();
              var match = jsonStr.match(/\[[\s\S]*\]/);
              if (match) jsonStr = match[0];
              var fores = JSON.parse(jsonStr);
              if (Array.isArray(fores)) {
                fores.forEach(function(f) {
                  if (f.description) {
                    window.AIService.updateMemory('foreshadowing', {
                      id: Date.now() + Math.random(),
                      description: f.description,
                      hint: f.hint || '',
                      resolved: false,
                      createdAt: Date.now()
                    });
                  }
                });
                window.showNotification('已提取 ' + fores.length + ' 个伏笔', 'info');
              }
            } catch (e) {
              window.showNotification('伏笔提取结果解析失败，请手动添加', 'warn');
            }
            extractForeBtn.textContent = '从文本提取';
            extractForeBtn.style.pointerEvents = '';
            overlay.remove();
            showMemoryPanel();
          },
          onError: function(err) {
            window.showNotification('提取失败: ' + err.message, 'error');
            extractForeBtn.textContent = '从文本提取';
            extractForeBtn.style.pointerEvents = '';
          }
        });
      });
    }
  }

  function showConfirmDialog(message, onConfirm) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:1001; display:flex; align-items:center; justify-content:center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'width:360px; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:12px; padding:20px; box-shadow:0 8px 32px rgba(0,0,0,0.4); animation:fadeIn 0.2s ease-out;';

    dialog.innerHTML =
      '<h3 style="font-size:14px; color:var(--text-default); margin-bottom:12px; font-weight:600;">确认</h3>' +
      '<p style="font-size:13px; color:var(--text-secondary); line-height:1.6; margin-bottom:20px;">' + escapeHtml(message) + '</p>' +
      '<div style="display:flex; gap:8px; justify-content:flex-end;">' +
      '<button class="confirm-cancel" style="padding:6px 14px; background:transparent; color:var(--text-secondary); border:1px solid var(--border-neutral-l1); border-radius:6px; font-size:12px; cursor:pointer;">取消</button>' +
      '<button class="confirm-ok" style="padding:6px 14px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; font-size:12px; cursor:pointer;">确认</button>' +
      '</div>';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    function close() { overlay.remove(); }

    overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
    dialog.querySelector('.confirm-cancel').addEventListener('click', close);
    dialog.querySelector('.confirm-ok').addEventListener('click', function() {
      close();
      if (onConfirm) onConfirm();
    });
  }

  function showAddForeshadowingDialog(onConfirm) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:1001; display:flex; align-items:center; justify-content:center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'width:420px; background:var(--bg-base-tertiary); border:1px solid var(--border-neutral-l2); border-radius:12px; padding:24px; box-shadow:0 8px 32px rgba(0,0,0,0.4); animation:fadeIn 0.2s ease-out;';

    dialog.innerHTML =
      '<h3 style="font-size:16px; color:var(--text-default); margin-bottom:16px;">添加伏笔</h3>' +
      '<div style="display:flex; flex-direction:column; gap:10px;">' +
      '<div><label style="font-size:12px; color:var(--text-tertiary); display:block; margin-bottom:4px;">伏笔描述 *</label><textarea id="fore-desc" rows="3" style="width:100%; padding:8px 10px; background:var(--bg-overlay-l1); border:1px solid var(--border-neutral-l1); border-radius:6px; color:var(--text-default); font-size:13px; outline:none; box-sizing:border-box; resize:vertical;"></textarea></div>' +
      '<div><label style="font-size:12px; color:var(--text-tertiary); display:block; margin-bottom:4px;">提示/回收方式</label><input id="fore-hint" type="text" style="width:100%; height:32px; padding:0 10px; background:var(--bg-overlay-l1); border:1px solid var(--border-neutral-l1); border-radius:6px; color:var(--text-default); font-size:13px; outline:none; box-sizing:border-box;"></div>' +
      '</div>' +
      '<div style="display:flex; gap:8px; justify-content:flex-end; margin-top:20px;">' +
      '<button id="cancel-add-fore" style="padding:8px 16px; background:transparent; color:var(--text-secondary); border:1px solid var(--border-neutral-l1); border-radius:6px; font-size:13px; cursor:pointer;">取消</button>' +
      '<button id="confirm-add-fore" style="padding:8px 16px; background:var(--bg-brand); color:var(--text-onbrand); border:none; border-radius:6px; font-size:13px; cursor:pointer;">添加</button>' +
      '</div>';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    var descInput = document.getElementById('fore-desc');
    if (descInput) descInput.focus();

    function close() { overlay.remove(); }

    overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
    document.getElementById('cancel-add-fore').addEventListener('click', close);

    document.getElementById('confirm-add-fore').addEventListener('click', function() {
      var desc = document.getElementById('fore-desc').value.trim();
      if (!desc) {
        window.showNotification('请填写伏笔描述', 'warn');
        return;
      }
      var foreshadowing = {
        id: Date.now(),
        description: desc,
        hint: document.getElementById('fore-hint').value.trim(),
        resolved: false,
        createdAt: Date.now()
      };
      close();
      if (onConfirm) onConfirm(foreshadowing);
    });
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
        window.showNotification('请填写角色姓名', 'warn');
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

  window.MemoryPanel = {
    init: initMemoryPanel,
    show: showMemoryPanel
  };

})();