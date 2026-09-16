/* ============================================================
 * 国际站运营工作台 · app.js
 * 渲染引擎：数据驱动（data-sop.js / data-keyword.js）
 * 功能：双页面 Tab 切换 / 章节导航 / 全局搜索 / 清单记忆 / 打印
 * ============================================================ */
(function () {
  'use strict';

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  var state = { page: 'sop', query: '' };

  /* 当前页面类型：sop.html / keyword.html / index.html */
  var PAGE = (function () {
    var f = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    return f === 'keyword.html' ? 'keyword' : 'sop';
  })();

  /* ---------------- 工具 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function mark(text, q) {
    if (!q) return esc(text);
    var i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }
  function splitNum(title) {
    var m = String(title).match(/^([\dA-Za-z]+)\s*[\.·]\s*(.*)$/);
    return m ? [m[1], m[2]] : ['', title];
  }
  function chapterBadge(title) {
    var m = String(title).match(/^([\dA-Za-z]+)/);
    return m ? m[1] : '附';
  }

  /* ---------------- checklist 渲染 ---------------- */
  function renderChecklist(b) {
    var items = b.items.map(function (it) {
      var key = 'wb-check-' + it.id;
      var done = localStorage.getItem(key) === '1';
      return '<label class="cl-item' + (done ? ' done' : '') + '">' +
        '<input type="checkbox" data-id="' + esc(it.id) + '"' + (done ? ' checked' : '') + '>' +
        '<span class="cl-text">' + esc(it.text) + '</span></label>';
    }).join('');
    return '<div class="blk">' +
      '<div class="blk-title">' + esc(b.title) + '</div>' +
      '<div class="checklist"><div class="cl-head">' +
      '<span class="cl-title">' + esc(b.title) + '</span>' +
      '<span class="cl-actions"><button type="button" class="cl-checkall">全部勾选</button>' +
      '<button type="button" class="cl-clear">清除</button></span></div>' +
      items + '</div></div>';
  }

  /* ---------------- block 渲染器 ---------------- */
  function renderBlocks(blocks) {
    return blocks.map(renderBlock).join('');
  }
  function renderBlock(b) {
    switch (b.type) {
      case 'p':
        return '<div class="blk blk-p">' + (b.title ? '<div class="blk-title">' + esc(b.title) + '</div>' : '') +
          '<p>' + esc(b.text) + '</p></div>';
      case 'list':
        return '<div class="blk"><div class="blk-title">' + esc(b.title) + '</div><ul class="blk-list">' +
          b.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul></div>';
      case 'table':
        return '<div class="blk"><div class="blk-title">' + esc(b.title) + '</div>' +
          '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
          b.head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          b.rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') +
          '</tbody></table></div>' + (b.note ? '<div class="blk-note">' + esc(b.note) + '</div>' : '') + '</div>';
      case 'steps':
        return '<div class="blk"><div class="blk-title">' + esc(b.title) + '</div><div class="steps">' +
          b.items.map(function (it, i) {
            return '<div class="step"><span class="step-num">' + (i + 1) + '</span><span class="step-text">' + esc(it) + '</span></div>' +
              (i < b.items.length - 1 ? '<span class="steps-arrow">→</span>' : '');
          }).join('') + '</div></div>';
      case 'checklist':
        return renderChecklist(b);
      case 'warn':
        return '<div class="warn' + (b.danger ? ' danger' : '') + '">' +
          (b.title ? '<div class="warn-title">' + esc(b.title) + '</div>' : '') +
          '<div class="warn-text">' + esc(b.text) + '</div></div>';
      case 'cards':
        return '<div class="blk"><div class="blk-title">' + esc(b.title) + '</div><div class="cards">' +
          b.items.map(function (c) {
            return '<div class="card"><span class="card-tag">' + esc(c.tag || '') + '</span>' +
              '<div class="card-title">' + esc(c.title) + '</div><div class="card-text">' + esc(c.text) + '</div></div>';
          }).join('') + '</div></div>';
      case 'flow':
        return '<div class="blk"><div class="blk-title">' + esc(b.title) + '</div><div class="flow">' +
          b.items.map(function (it, i) {
            return '<span class="flow-item">' + esc(it) + '</span>' + (i < b.items.length - 1 ? '<span class="flow-arrow">→</span>' : '');
          }).join('') + '</div></div>';
      case 'example':
        return '<div class="blk"><div class="blk-title">' + esc(b.title) + '</div>' +
          '<div class="example"><div class="ex-en">' + esc(b.en) + '</div><div class="ex-zh">' + esc(b.zh) + '</div></div></div>';
      case 'timeline':
        return '<div class="blk"><div class="blk-title">' + esc(b.title || '时间线') + '</div><div class="timeline">' +
          b.items.map(function (it) {
            return '<div class="tl-item"><span class="tl-date">' + esc(it.date) + '</span> <span class="tl-text">' + esc(it.text) + '</span></div>';
          }).join('') + '</div></div>';
      case 'glossary':
        return '<div class="blk"><div class="blk-title">' + esc(b.title || '术语表') + '</div><div class="glossary">' +
          b.items.map(function (g) {
            return '<div class="gl-item"><div class="gl-term">' + esc(g.term) + '</div><div class="gl-def">' + esc(g.def) + '</div></div>';
          }).join('') + '</div></div>';
      default:
        return '';
    }
  }

  /* ---------------- 页面一：SOP 渲染 ---------------- */
  var SOP_GROUPS = [
    { name: '总纲', ids: ['s0'] },
    { name: '基础与店铺', ids: ['s1', 's2'] },
    { name: '核心商品运营', ids: ['s3'] },
    { name: '流量推广', ids: ['s4'] },
    { name: '商机与交易', ids: ['s5', 's6'] },
    { name: '星等级', ids: ['s7'] },
    { name: '数据与执行', ids: ['s8', 's9'] },
    { name: '合规', ids: ['s10'] },
    { name: '附录', ids: ['appendix-a', 'appendix-b', 'appendix-c'] }
  ];

  function renderSOP() {
    var sb = $('#sopSidebar');
    if (!sb || !$('#sopContent')) return;
    sb.innerHTML = SOP_GROUPS.map(function (g) {
      var items = g.ids.map(function (id) {
        var sec = SOP_DATA.sections.find(function (s) { return s.id === id; });
        if (!sec) return '';
        var n = splitNum(sec.title);
        return '<a class="sb-item" href="#' + sec.id + '" data-id="' + sec.id + '">' +
          '<span class="sb-num">' + esc(n[0]) + '</span><span>' + esc(n[1] || sec.title) + '</span></a>';
      }).join('');
      return '<div class="sb-group">' + esc(g.name) + '</div>' + items;
    }).join('');

    $('#sopContent').innerHTML = SOP_DATA.sections.map(function (sec) {
      return '<article class="chapter" id="ch-' + sec.id + '">' +
        '<div class="chapter-head"><span class="chapter-badge">' + esc(chapterBadge(sec.title)) + '</span>' +
        '<h2 class="chapter-title">' + esc(sec.title) + '</h2></div>' +
        renderBlocks(sec.blocks) + '</article>';
    }).join('');
  }

  /* ---------------- 页面二：关键词路径渲染 ---------------- */
  function renderKwStep(s) {
    var conds = (s.conditions || []).map(function (c) {
      return '<div class="cond ' + (c.type === 'keep' ? 'keep' : 'action') + '">' +
        '<span class="cond-if">如果：' + esc(c.if) + '</span>' +
        '<span class="cond-then">' + esc(c.then) + '</span></div>';
    }).join('');
    var groups = (s.groups || []).map(function (g) {
      return '<div class="kw-group"><div class="kw-group-name">' + esc(g.name) + '</div><ul class="blk-list">' +
        g.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul></div>';
    }).join('');
    var settings = s.settings ? '<div class="settings-table">' + s.settings.map(function (st) {
      return '<div class="st-row"><div class="st-name">' + esc(st.name) +
        (st.warn ? '<span class="st-warn-tag">重要</span>' : '') + '</div>' +
        '<div class="st-body">' + esc(st.action) +
        (st.note ? '<span class="st-note">' + esc(st.note) + '</span>' : '') + '</div></div>';
    }).join('') + '</div>' : '';
    var shots = s.images ? '<div class="kw-shots">' + s.images.map(function (im) {
      return '<figure class="kw-shot"><img src="' + esc(im.src) + '" alt="' + esc(im.caption) + '" loading="lazy">' +
        '<figcaption>' + esc(im.caption) + '</figcaption></figure>';
    }).join('') + '</div>' : '';

    return '<div class="kw-step" id="kw-step-' + s.n + '">' +
      '<div class="kw-step-head"><span class="kw-step-num">' + s.n + '</span>' +
      '<h2 class="kw-step-title">' + esc(s.title) + '</h2></div>' +
      '<div class="kw-step-desc">' + esc(s.desc) + '</div>' +
      groups + settings +
      (conds ? '<div class="conditions">' + conds + '</div>' : '') + shots + '</div>';
  }

  function renderKeyword() {
    if (!$('#kwSidebar') || !$('#keywordContent')) return;
    var d = KEYWORD_DATA;
    var navItems = [
      { id: 'kw-hero', label: '开计划前必读' },
      { id: 'kw-core', label: '核心 4 点' }
    ].concat(d.steps.map(function (s) {
      return { id: 'kw-step-' + s.n, label: '步骤 ' + s.n + ' · ' + s.title, step: s.n };
    }), [{ id: 'kw-daily', label: '每日检查' }]);

    $('#kwSidebar').innerHTML = navItems.map(function (it) {
      return '<a class="sb-item" href="#' + it.id + '" data-id="' + it.id + '">' +
        (it.step ? '<span class="sb-step-num">' + it.step + '</span>' : '<span class="sb-num">·</span>') +
        '<span>' + esc(it.label) + '</span></a>';
    }).join('');

    $('#keywordContent').innerHTML =
      '<div class="kw-hero" id="kw-hero">' +
      '<div class="kw-hero-tag">' + esc(d.meta.title) + ' · ' + esc(d.meta.updated) + '</div>' +
      '<h1>' + esc(d.warning.title) + '</h1><p>' + esc(d.warning.text) + '</p></div>' +
      '<div class="blk" id="kw-core"><div class="blk-title">' + esc(d.core.title) + ' · ' + esc(d.core.subtitle) + '</div>' +
      '<div class="core4">' + d.core.items.map(function (c) {
        return '<div class="card"><span class="card-tag">' + esc(c.key) + '</span><div class="card-text">' + esc(c.text) + '</div></div>';
      }).join('') + '</div></div>' +
      d.steps.map(renderKwStep).join('') +
      '<div class="kw-step" id="kw-daily"><div class="kw-step-head"><span class="kw-step-num">✓</span>' +
      '<h2 class="kw-step-title">' + esc(d.daily.title) + '</h2></div>' +
      renderChecklist({ title: '每日检查', items: d.daily.items }) + '</div>';
  }

  /* ---------------- 页面激活（单页模式：只显示当前页视图） ---------------- */
  function activatePage() {
    state.page = PAGE;
    $$('#pageTabs .tab').forEach(function (t) { t.classList.toggle('active', t.dataset.page === PAGE); });
    var v = document.getElementById(PAGE === 'keyword' ? 'view-keyword' : 'view-sop');
    if (v) v.classList.add('active');
    document.title = PAGE === 'keyword'
      ? '关键词调整路径 · 国际站运营工作台'
      : '运营 SOP 2026 · 国际站运营工作台';
  }

  function goToEl(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }

  /* ---------------- 侧边栏交互 ---------------- */
  function bindSidebar(sb, prefix) {
    if (!sb) return;
    sb.addEventListener('click', function (e) {
      var a = e.target.closest('.sb-item');
      if (!a) return;
      e.preventDefault();
      goToEl((prefix || '') + a.dataset.id);
    });
  }

  function setActiveSidebar(sb, id) {
    $$('.sb-item', sb).forEach(function (a) { a.classList.toggle('active', a.dataset.id === id); });
  }

  var sopObs, kwObs;
  function initObservers() {
    sopObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) setActiveSidebar($('#sopSidebar'), en.target.id.slice(3));
      });
    }, { rootMargin: '-25% 0px -65% 0px' });
    $$('#sopContent .chapter').forEach(function (ch) { sopObs.observe(ch); });

    kwObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) setActiveSidebar($('#kwSidebar'), en.target.id);
      });
    }, { rootMargin: '-25% 0px -65% 0px' });
    ['kw-hero', 'kw-core', 'kw-step-1', 'kw-step-2', 'kw-step-3', 'kw-step-4', 'kw-step-5', 'kw-daily']
      .forEach(function (id) {
        var el = document.getElementById(id);
        if (el) kwObs.observe(el);
      });
  }

  /* ---------------- 全局搜索 ---------------- */
  function blockText(b) {
    switch (b.type) {
      case 'table': return b.title + ' ' + (b.note || '') + ' ' + b.head.join(' ') + ' ' + b.rows.flat().join(' ');
      case 'checklist': return b.title + ' ' + b.items.map(function (i) { return i.text; }).join(' ');
      case 'list': case 'steps':
        return b.title + ' ' + b.items.map(function (i) { return typeof i === 'string' ? i : i.date + ' ' + i.text; }).join(' ');
      case 'cards': return b.title + ' ' + b.items.map(function (c) { return c.title + ' ' + c.text; }).join(' ');
      case 'flow': return b.title + ' ' + b.items.join(' ');
      case 'glossary': return b.title + ' ' + b.items.map(function (g) { return g.term + g.def; }).join(' ');
      case 'warn': return (b.title || '') + ' ' + b.text;
      case 'example': return b.title + ' ' + b.en + ' ' + b.zh;
      case 'p': return (b.title || '') + ' ' + b.text;
      default: return '';
    }
  }

  function buildIndex() {
    var idx = [];
    SOP_DATA.sections.forEach(function (sec) {
      idx.push({ page: 'sop', pageLabel: '运营SOP', id: sec.id, title: sec.title, text: sec.title });
      sec.blocks.forEach(function (b) {
        var t = blockText(b);
        if (t) idx.push({ page: 'sop', pageLabel: '运营SOP', id: sec.id, title: sec.title, text: t });
      });
    });
    var kw = KEYWORD_DATA;
    idx.push({ page: 'keyword', pageLabel: '关键词路径', id: 'kw-hero', title: '开计划前必读', text: kw.warning.title + ' ' + kw.warning.text });
    idx.push({
      page: 'keyword', pageLabel: '关键词路径', id: 'kw-core', title: '核心 4 点',
      text: kw.core.title + ' ' + kw.core.subtitle + ' ' + kw.core.items.map(function (c) { return c.key + c.text; }).join(' ')
    });
    kw.steps.forEach(function (s) {
      idx.push({ page: 'keyword', pageLabel: '关键词路径', id: 'kw-step-' + s.n, title: '步骤 ' + s.n + ' ' + s.title, text: s.title + ' ' + s.desc });
      (s.conditions || []).forEach(function (c) {
        idx.push({ page: 'keyword', pageLabel: '关键词路径', id: 'kw-step-' + s.n, title: '步骤 ' + s.n + ' ' + s.title, text: c.if + ' ' + c.then });
      });
      (s.groups || []).forEach(function (g) {
        idx.push({ page: 'keyword', pageLabel: '关键词路径', id: 'kw-step-' + s.n, title: '步骤 ' + s.n + ' ' + s.title, text: g.items.join(' ') });
      });
      (s.settings || []).forEach(function (st) {
        idx.push({ page: 'keyword', pageLabel: '关键词路径', id: 'kw-step-' + s.n, title: '步骤 ' + s.n + ' ' + s.title, text: st.name + ' ' + st.action + ' ' + (st.note || '') });
      });
    });
    idx.push({ page: 'keyword', pageLabel: '关键词路径', id: 'kw-daily', title: '每日检查', text: kw.daily.title + ' ' + kw.daily.items.map(function (i) { return i.text; }).join(' ') });
    return idx;
  }

  var INDEX = buildIndex();
  var searchTimer;

  function doSearch(q) {
    var box = $('#searchResults');
    state.query = q;
    if (!q) { box.classList.add('hidden'); return; }
    var ql = q.toLowerCase();
    var hits = INDEX.filter(function (x) { return x.text.toLowerCase().indexOf(ql) !== -1; }).slice(0, 14);
    if (!hits.length) {
      box.innerHTML = '<div class="sr-empty">未找到「' + esc(q) + '」相关结果</div>';
      box.classList.remove('hidden');
      return;
    }
    box.innerHTML = hits.map(function (h) {
      var i = h.text.toLowerCase().indexOf(ql);
      var s = Math.max(0, i - 18);
      var snip = (s > 0 ? '…' : '') + mark(h.text.slice(s, s + 64), q) + (s + 64 < h.text.length ? '…' : '');
      return '<div class="sr-item" data-page="' + h.page + '" data-id="' + h.id + '">' +
        '<div class="sr-page">' + h.pageLabel + '</div>' +
        '<div class="sr-title">' + mark(h.title, q) + '</div>' +
        '<div class="sr-snippet">' + snip + '</div></div>';
    }).join('');
    box.classList.remove('hidden');
  }

  /* ---------------- 事件绑定 ---------------- */
  function bindEvents() {
    bindSidebar($('#sopSidebar'), 'ch-');
    bindSidebar($('#kwSidebar'), '');

    $('#searchInput').addEventListener('input', function (e) {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { doSearch(e.target.value.trim()); }, 120);
    });
    $('#searchResults').addEventListener('click', function (e) {
      var it = e.target.closest('.sr-item');
      if (!it) return;
      var targetId = (it.dataset.page === 'sop' ? 'ch-' : '') + it.dataset.id;
      if (PAGE === it.dataset.page) {
        $('#searchResults').classList.add('hidden');
        $('#searchInput').blur();
        goToEl(targetId);
      } else {
        /* 跨页结果：跳转到另一页并定位到锚点 */
        location.href = (it.dataset.page === 'sop' ? 'sop.html' : 'keyword.html') + '#' + targetId;
      }
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.searchbox')) $('#searchResults').classList.add('hidden');
    });
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        $('#searchInput').focus();
      }
      if (e.key === 'Escape') $('#searchResults').classList.add('hidden');
    });

    /* checklist 勾选记忆 */
    document.addEventListener('change', function (e) {
      var cb = e.target.closest('.cl-item input');
      if (!cb) return;
      localStorage.setItem('wb-check-' + cb.dataset.id, cb.checked ? '1' : '0');
      cb.closest('.cl-item').classList.toggle('done', cb.checked);
    });
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.cl-checkall, .cl-clear');
      if (!btn) return;
      var cl = btn.closest('.checklist');
      var on = btn.classList.contains('cl-checkall');
      $$('input[type=checkbox]', cl).forEach(function (cb) {
        cb.checked = on;
        localStorage.setItem('wb-check-' + cb.dataset.id, on ? '1' : '0');
        cb.closest('.cl-item').classList.toggle('done', on);
      });
    });

    $('#printBtn').addEventListener('click', function () { window.print(); });
  }

  /* 顶栏高度动态测量：供 .sidebar 吸顶与锚点滚动偏移使用（避免固定值失配） */
  function syncTopbarHeight() {
    var navEl = $('.topbar');
    if (!navEl) return;
    var sync = function () {
      document.documentElement.style.setProperty('--topbar-h', navEl.offsetHeight + 'px');
    };
    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('load', sync);
    if (window.ResizeObserver) { new ResizeObserver(sync).observe(navEl); }
  }

  /* ---------------- 启动 ---------------- */
  function init() {
    syncTopbarHeight();
    renderSOP();
    renderKeyword();
    activatePage();
    initObservers();
    bindEvents();
    $('#verInfo').textContent = 'SOP ' + SOP_DATA.meta.version + ' · ' + SOP_DATA.meta.updated + ' · 清单状态自动保存';
    /* 深链接定位（从另一页搜索跳转而来 / 直接访问带锚点 URL） */
    var h = location.hash;
    if (h) {
      var el = document.getElementById(h.slice(1));
      if (el) setTimeout(function () {
        el.scrollIntoView({ block: 'start' });
        el.classList.remove('flash');
        void el.offsetWidth;
        el.classList.add('flash');
      }, 100);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
