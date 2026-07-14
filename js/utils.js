(function(window) {
  'use strict';

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function sanitizeHtml(html) {
    if (!html) return '';
    var allowedTags = ['p', 'br', 'em', 'strong', 'i', 'b'];
    var tagPattern = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/gi;
    
    return html.replace(tagPattern, function(match, closing, tagName, attrs) {
      if (allowedTags.indexOf(tagName.toLowerCase()) === -1) {
        return '';
      }
      
      var cleanAttrs = '';
      if (attrs) {
        var attrMatches = attrs.match(/([a-zA-Z][a-zA-Z0-9]*)\s*=\s*(['"])([^'"]*)\2/gi);
        if (attrMatches) {
          attrMatches.forEach(function(attr) {
            var attrName = attr.split('=')[0].trim().toLowerCase();
            if (attrName === 'style') {
              var styleValue = attr.match(/=['"]([^'"]+)['"]/)[1];
              var allowedStyles = ['margin', 'text-indent', 'line-height'];
              var cleanStyle = '';
              styleValue.split(';').forEach(function(style) {
                var parts = style.trim().split(':');
                if (parts.length === 2 && allowedStyles.indexOf(parts[0].trim()) !== -1) {
                  cleanStyle += style + ';';
                }
              });
              if (cleanStyle) {
                cleanAttrs += ' style="' + cleanStyle + '"';
              }
            }
          });
        }
      }
      
      return '<' + closing + tagName + cleanAttrs + '>';
    });
  }

  function debounce(func, wait) {
    var timeout = null;
    return function() {
      var context = this;
      var args = arguments;
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(function() {
        func.apply(context, args);
      }, wait);
    };
  }

  function throttle(func, limit) {
    var inThrottle = false;
    return function() {
      var context = this;
      var args = arguments;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(function() { inThrottle = false; }, limit);
      }
    };
  }

  function formatWordCount(count) {
    if (count >= 10000) {
      return (count / 10000).toFixed(1) + '万';
    }
    return count.toLocaleString();
  }

  function formatLastEdit(dateStr) {
    if (!dateStr) return '未知';
    var date = new Date(dateStr);
    var now = new Date();
    var diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
    return date.toLocaleDateString('zh-CN');
  }

  function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  function maskSecret(value) {
    if (!value) return '';
    if (value.length <= 4) return '****';
    return value.substring(0, 2) + '****' + value.substring(value.length - 2);
  }

  function isValidApiKey(key) {
    if (!key || typeof key !== 'string') return false;
    key = key.trim();
    return key.length >= 10 && key.length <= 256;
  }

  function getTokenEstimate(text) {
    if (!text) return 0;
    var chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    var otherChars = text.length - chineseChars;
    return Math.ceil(chineseChars * 2 + otherChars * 1.3);
  }

  function getModelMaxTokens(modelName) {
    var tokenLimits = {
      'gpt-4o': 128000,
      'gpt-4': 8192,
      'claude-3-5-sonnet-20240620': 200000,
      'claude-3-sonnet': 200000,
      'deepseek-chat': 8192,
      'qwen-plus': 128000,
      'gemini-1.5-flash': 1048576,
      'moonshot-v1-8k': 8192,
      'yi-34b-chat': 2048,
      'glm-4': 128000
    };
    return tokenLimits[modelName] || 8192;
  }

  var Cache = (function() {
    var CACHE_PREFIX = 'aiwriter_cache_';
    var MAX_CACHE_SIZE = 50;
    var DEFAULT_TTL = 3600000;

    function getCacheKey(key) {
      return CACHE_PREFIX + key;
    }

    function set(key, value, ttl) {
      try {
        var item = {
          data: value,
          timestamp: Date.now(),
          ttl: ttl || DEFAULT_TTL
        };
        localStorage.setItem(getCacheKey(key), JSON.stringify(item));
        cleanup();
        return true;
      } catch (e) {
        console.warn('缓存写入失败:', e);
        return false;
      }
    }

    function get(key) {
      try {
        var itemStr = localStorage.getItem(getCacheKey(key));
        if (!itemStr) return null;
        
        var item = JSON.parse(itemStr);
        if (Date.now() > item.timestamp + item.ttl) {
          remove(key);
          return null;
        }
        return item.data;
      } catch (e) {
        console.warn('缓存读取失败:', e);
        return null;
      }
    }

    function remove(key) {
      try {
        localStorage.removeItem(getCacheKey(key));
        return true;
      } catch (e) {
        return false;
      }
    }

    function cleanup() {
      try {
        var keys = Object.keys(localStorage);
        var cacheKeys = keys.filter(function(k) { return k.startsWith(CACHE_PREFIX); });
        
        if (cacheKeys.length <= MAX_CACHE_SIZE) return;
        
        var items = cacheKeys.map(function(k) {
          try {
            var item = JSON.parse(localStorage.getItem(k));
            return { key: k, timestamp: item ? item.timestamp : 0 };
          } catch (e) {
            return { key: k, timestamp: 0 };
          }
        }).sort(function(a, b) { return a.timestamp - b.timestamp; });
        
        var toRemove = items.slice(0, items.length - MAX_CACHE_SIZE);
        toRemove.forEach(function(item) {
          localStorage.removeItem(item.key);
        });
      } catch (e) {
        console.warn('缓存清理失败:', e);
      }
    }

    function clear() {
      try {
        var keys = Object.keys(localStorage);
        keys.forEach(function(k) {
          if (k.startsWith(CACHE_PREFIX)) {
            localStorage.removeItem(k);
          }
        });
      } catch (e) {
        console.warn('缓存清空失败:', e);
      }
    }

    function getStats() {
      try {
        var keys = Object.keys(localStorage);
        var cacheKeys = keys.filter(function(k) { return k.startsWith(CACHE_PREFIX); });
        var size = cacheKeys.reduce(function(total, k) {
          var item = localStorage.getItem(k);
          return total + (item ? item.length : 0);
        }, 0);
        return { count: cacheKeys.length, size: size };
      } catch (e) {
        return { count: 0, size: 0 };
      }
    }

    return {
      set: set,
      get: get,
      remove: remove,
      clear: clear,
      cleanup: cleanup,
      getStats: getStats
    };
  })();

  var EventManager = (function() {
    var listeners = {};

    function on(eventName, callback) {
      if (!listeners[eventName]) {
        listeners[eventName] = [];
      }
      listeners[eventName].push(callback);
    }

    function off(eventName, callback) {
      if (!listeners[eventName]) return;
      var index = listeners[eventName].indexOf(callback);
      if (index !== -1) {
        listeners[eventName].splice(index, 1);
      }
    }

    function emit(eventName, data) {
      if (!listeners[eventName]) return;
      listeners[eventName].forEach(function(callback) {
        try {
          callback(data);
        } catch (e) {
          console.warn('事件处理失败:', e);
        }
      });
    }

    function clear(eventName) {
      if (eventName) {
        delete listeners[eventName];
      } else {
        listeners = {};
      }
    }

    function addListener(el, event, callback, options) {
      el.addEventListener(event, callback, options);
      return function() {
        el.removeEventListener(event, callback, options);
      };
    }

    return {
      on: on,
      off: off,
      emit: emit,
      clear: clear,
      addListener: addListener
    };
  })();

  var ContextManager = (function() {
    var MAX_CONTEXT_TOKENS = 8000;

    function buildContext(messages, modelName) {
      var maxTokens = getModelMaxTokens(modelName);
      var availableTokens = maxTokens - MAX_CONTEXT_TOKENS;
      var totalTokens = 0;
      var selectedMessages = [];

      for (var i = messages.length - 1; i >= 0; i--) {
        var msg = messages[i];
        var tokenCount = getTokenEstimate(msg.content);
        
        if (totalTokens + tokenCount <= availableTokens) {
          selectedMessages.unshift(msg);
          totalTokens += tokenCount;
        } else if (msg.role === 'system') {
          selectedMessages.unshift(msg);
          break;
        } else {
          var remaining = availableTokens - totalTokens;
          if (remaining > 0 && msg.role !== 'system') {
            var truncated = truncateText(msg.content, Math.floor(remaining * 0.7));
            selectedMessages.unshift({
              role: msg.role,
              content: truncated + '...(内容已截断)'
            });
            break;
          }
        }
      }

      return selectedMessages;
    }

    function summarizeHistory(messages) {
      if (!messages || messages.length <= 3) return messages;
      
      var recent = messages.slice(-3);
      var earlier = messages.slice(0, -3);
      
      if (earlier.length === 0) return recent;
      
      var summaryText = '之前的对话涉及：';
      var topics = [];
      
      earlier.forEach(function(msg) {
        var content = msg.content.substring(0, 50);
        topics.push(content);
      });
      
      summaryText += topics.join('；');
      
      var summaryMsg = {
        role: 'system',
        content: '以下是对话摘要：' + summaryText + '\n\n基于以上内容继续对话。'
      };
      
      return [summaryMsg].concat(recent);
    }

    function compressContext(messages, maxLength) {
      maxLength = maxLength || 8000;
      
      var result = [];
      var totalLength = 0;
      
      for (var i = messages.length - 1; i >= 0; i--) {
        var msg = messages[i];
        var length = msg.content.length;
        
        if (msg.role === 'system') {
          result.unshift(msg);
          totalLength += length;
          continue;
        }
        
        if (totalLength + length <= maxLength) {
          result.unshift(msg);
          totalLength += length;
        } else {
          var remaining = maxLength - totalLength;
          if (remaining > 100) {
            var truncatedContent = msg.content.substring(0, remaining);
            var lastPeriod = truncatedContent.lastIndexOf('。');
            if (lastPeriod > truncatedContent.length - 20) {
              truncatedContent = truncatedContent.substring(0, lastPeriod + 1);
            }
            result.unshift({
              role: msg.role,
              content: truncatedContent + '...'
            });
          }
          break;
        }
      }
      
      return result;
    }

    return {
      buildContext: buildContext,
      summarizeHistory: summarizeHistory,
      compressContext: compressContext
    };
  })();

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

  function getEditorText() {
    var article = document.getElementById('editor-article');
    if (!article) return '';
    return article.innerText || article.textContent || '';
  }

  window.Utils = {
    generateId: generateId,
    escapeHtml: escapeHtml,
    sanitizeHtml: sanitizeHtml,
    debounce: debounce,
    throttle: throttle,
    formatWordCount: formatWordCount,
    formatLastEdit: formatLastEdit,
    truncateText: truncateText,
    maskSecret: maskSecret,
    isValidApiKey: isValidApiKey,
    getTokenEstimate: getTokenEstimate,
    getModelMaxTokens: getModelMaxTokens,
    getWorkContext: getWorkContext,
    getEditorText: getEditorText,
    Cache: Cache,
    EventManager: EventManager,
    ContextManager: ContextManager
  };
})(window);