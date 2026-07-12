/**
 * 作品数据持久化层
 * 使用 localStorage 存储用户作品数据
 */
(function (window) {
  'use strict';

  var STORAGE_KEY = 'ai_writing_works';
  var CURRENT_WORK_KEY = 'ai_writing_current_work';

  // 生成唯一 ID
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  // 加载所有作品
  function loadWorks() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        var works = JSON.parse(saved);
        return Array.isArray(works) ? works : [];
      }
    } catch (e) {
      console.warn('加载作品数据失败:', e);
    }
    return [];
  }

  // 保存所有作品
  function saveWorks(works) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(works));
    } catch (e) {
      console.warn('保存作品数据失败:', e);
    }
  }

  // 获取所有作品
  function getAllWorks() {
    return loadWorks();
  }

  // 获取单个作品
  function getWorkById(id) {
    var works = loadWorks();
    for (var i = 0; i < works.length; i++) {
      if (works[i].id === id) return works[i];
    }
    return null;
  }

  // 创建新作品
  function createWork(data) {
    var works = loadWorks();
    var now = new Date();
    var work = {
      id: generateId(),
      title: data.title || '未命名作品',
      genre: data.genre || '未分类',
      description: data.description || '',
      style: data.style || '',
      targetWordCount: data.targetWordCount || 0,
      chapters: [],
      totalWordCount: 0,
      progress: 0,
      status: '连载中',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      lastEdit: '刚刚'
    };
    works.unshift(work);
    saveWorks(works);
    return work;
  }

  // 更新作品
  function updateWork(id, data) {
    var works = loadWorks();
    for (var i = 0; i < works.length; i++) {
      if (works[i].id === id) {
        for (var key in data) {
          if (data.hasOwnProperty(key)) {
            works[i][key] = data[key];
          }
        }
        works[i].updatedAt = new Date().toISOString();
        works[i].lastEdit = '刚刚';
        saveWorks(works);
        return works[i];
      }
    }
    return null;
  }

  // 删除作品
  function deleteWork(id) {
    var works = loadWorks();
    var newWorks = works.filter(function(w) { return w.id !== id; });
    saveWorks(newWorks);
    return newWorks;
  }

  // 添加章节到作品
  function addChapter(workId, chapterData) {
    var work = getWorkById(workId);
    if (!work) return null;
    
    var chapter = {
      id: generateId(),
      title: chapterData.title || '未命名章节',
      content: chapterData.content || '',
      wordCount: chapterData.content ? chapterData.content.length : 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    work.chapters.push(chapter);
    work.totalWordCount = work.chapters.reduce(function(sum, ch) {
      return sum + (ch.wordCount || 0);
    }, 0);
    work.progress = work.targetWordCount > 0 
      ? Math.min(100, Math.round((work.totalWordCount / work.targetWordCount) * 100))
      : 0;
    
    updateWork(workId, {
      chapters: work.chapters,
      totalWordCount: work.totalWordCount,
      progress: work.progress
    });
    
    return chapter;
  }

  // 更新章节内容
  function updateChapter(workId, chapterId, content) {
    var work = getWorkById(workId);
    if (!work) return null;
    
    for (var i = 0; i < work.chapters.length; i++) {
      if (work.chapters[i].id === chapterId) {
        work.chapters[i].content = content;
        work.chapters[i].wordCount = content ? content.length : 0;
        work.chapters[i].updatedAt = new Date().toISOString();
        break;
      }
    }
    
    work.totalWordCount = work.chapters.reduce(function(sum, ch) {
      return sum + (ch.wordCount || 0);
    }, 0);
    work.progress = work.targetWordCount > 0 
      ? Math.min(100, Math.round((work.totalWordCount / work.targetWordCount) * 100))
      : 0;
    
    updateWork(workId, {
      chapters: work.chapters,
      totalWordCount: work.totalWordCount,
      progress: work.progress
    });
    
    return work;
  }

  // 获取当前作品
  function getCurrentWork() {
    var currentId = localStorage.getItem(CURRENT_WORK_KEY);
    if (currentId) {
      return getWorkById(currentId);
    }
    var works = loadWorks();
    return works.length > 0 ? works[0] : null;
  }

  // 设置当前作品
  function setCurrentWork(id) {
    localStorage.setItem(CURRENT_WORK_KEY, id);
  }

  // 清除当前作品
  function clearCurrentWork() {
    localStorage.removeItem(CURRENT_WORK_KEY);
  }

  // 格式化最后编辑时间
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

  // 导出 API
  window.WorksStore = {
    getAllWorks: getAllWorks,
    getWorkById: getWorkById,
    createWork: createWork,
    updateWork: updateWork,
    deleteWork: deleteWork,
    addChapter: addChapter,
    updateChapter: updateChapter,
    getCurrentWork: getCurrentWork,
    setCurrentWork: setCurrentWork,
    clearCurrentWork: clearCurrentWork,
    formatLastEdit: formatLastEdit
  };

})(window);