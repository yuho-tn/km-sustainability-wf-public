/* WF Overlay — 用語ツールチップ ＋ 画像拡大モーダル（共通スクリプト）
   対象: .term-trigger（ホバー/クリック）, .img-zoom-btn（クリック）
   ページ側で <script src="assets/wf-overlay.js"></script> を </body> 前に読み込む。
*/
(function () {
  'use strict';

  // ===== 共通スタイル注入 =====
  const style = document.createElement('style');
  style.textContent = `
    .term-trigger { cursor: help !important; }
    .img-zoom-btn { cursor: zoom-in !important; }

    /* 用語ツールチップ（フローティング） */
    .wf-popover {
      position: absolute;
      z-index: 9000;
      background: #fff;
      border: 1px solid #d0d0d0;
      box-shadow: 0 6px 18px rgba(0,0,0,0.15);
      width: 320px; max-width: 90vw;
      opacity: 0; transform: translateY(-4px);
      transition: opacity .12s ease, transform .12s ease;
      pointer-events: none;
    }
    .wf-popover.is-open { opacity: 1; transform: translateY(0); pointer-events: auto; }
    .wf-popover-head {
      background: #1a1a1a; color: #fff;
      padding: 10px 14px;
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
    }
    .wf-popover-title { font-size: 12px; font-weight: 700; line-height: 1.4; }
    .wf-popover-close {
      width: 20px; height: 20px;
      background: #fff; color: #1a1a1a;
      font-size: 12px; font-weight: 700;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      border: none; padding: 0; cursor: pointer; flex-shrink: 0;
    }
    .wf-popover-body { padding: 12px 14px; font-size: 11px; color: #333; line-height: 1.85; }
    .wf-popover-body p { margin: 0 0 6px; }
    .wf-popover-body p:last-child { margin-bottom: 0; }

    /* 画像拡大ライトボックス（中央オーバーレイ） */
    .wf-lightbox {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 10000;
      display: none;
      align-items: center; justify-content: center;
      padding: 40px;
    }
    .wf-lightbox.is-open { display: flex; }
    .wf-lightbox-modal {
      background: #fff;
      width: 880px; max-width: 100%; max-height: 90vh;
      border: 1px solid #d0d0d0;
      box-shadow: 0 8px 28px rgba(0,0,0,0.3);
      display: flex; flex-direction: column;
    }
    .wf-lightbox-head {
      background: #1a1a1a; color: #fff;
      padding: 12px 18px;
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
    }
    .wf-lightbox-title { font-size: 13px; font-weight: 700; }
    .wf-lightbox-close {
      width: 24px; height: 24px;
      background: #fff; color: #1a1a1a;
      font-size: 14px; font-weight: 700;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      border: none; padding: 0; cursor: pointer;
    }
    .wf-lightbox-body { padding: 20px; overflow: auto; }
    .wf-lightbox-figure {
      background: #f0f0f0;
      border: 1px dashed #c0c0c0;
      aspect-ratio: 16 / 9;
      display: flex; align-items: center; justify-content: center;
      position: relative; overflow: hidden;
    }
    .wf-lightbox-figure::before {
      content: ''; position: absolute; inset: 0;
      background: repeating-linear-gradient(45deg, transparent 0 12px, rgba(0,0,0,0.04) 12px 13px);
    }
    .wf-lightbox-figure-label {
      position: relative; z-index: 1;
      font-size: 13px; color: #444;
      background: rgba(255,255,255,0.92);
      padding: 10px 16px;
      letter-spacing: 0.04em;
      border: 1px dashed #c0c0c0;
      max-width: 80%;
      text-align: center; line-height: 1.6;
      white-space: pre-line;
    }
    .wf-lightbox-cap {
      font-size: 12px; color: #555;
      margin: 14px 0 0; line-height: 1.7;
    }
  `;
  document.head.appendChild(style);

  // ===== 用語ツールチップ =====
  let activePopover = null;
  let activeTrigger = null;
  let hideTimer = null;
  let pinned = false;

  function createPopover(title, body) {
    const el = document.createElement('div');
    el.className = 'wf-popover';
    el.innerHTML =
      '<div class="wf-popover-head">' +
      '<span class="wf-popover-title">' + title + '</span>' +
      '<button type="button" class="wf-popover-close" aria-label="閉じる">×</button>' +
      '</div>' +
      '<div class="wf-popover-body">' + body + '</div>';
    return el;
  }

  function positionPopover(popover, trigger) {
    const rect = trigger.getBoundingClientRect();
    const sy = window.scrollY || window.pageYOffset;
    const sx = window.scrollX || window.pageXOffset;
    popover.style.top = (rect.bottom + sy + 6) + 'px';
    let left = rect.left + sx;
    const vw = document.documentElement.clientWidth;
    if (left + 320 > vw - 12) left = Math.max(12, vw - 332);
    popover.style.left = left + 'px';
  }

  function hidePopover() {
    if (!activePopover) return;
    const p = activePopover;
    p.classList.remove('is-open');
    setTimeout(() => p && p.parentNode && p.parentNode.removeChild(p), 200);
    activePopover = null;
    activeTrigger = null;
    pinned = false;
  }

  function showPopover(trigger) {
    if (activeTrigger === trigger && activePopover) return;
    if (activePopover) hidePopover();
    const title = trigger.getAttribute('data-term-title') || trigger.textContent.trim();
    const body = trigger.getAttribute('data-term-body') || '';
    if (!body) return;
    const popover = createPopover(title, body);
    document.body.appendChild(popover);
    positionPopover(popover, trigger);
    requestAnimationFrame(() => popover.classList.add('is-open'));
    activePopover = popover;
    activeTrigger = trigger;

    popover.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    popover.addEventListener('mouseleave', () => {
      if (pinned) return;
      hideTimer = setTimeout(hidePopover, 150);
    });
    popover.querySelector('.wf-popover-close').addEventListener('click', (e) => {
      e.stopPropagation();
      hidePopover();
    });
  }

  document.addEventListener('mouseover', (e) => {
    const trig = e.target.closest('.term-trigger');
    if (!trig) return;
    clearTimeout(hideTimer);
    showPopover(trig);
  });

  document.addEventListener('mouseout', (e) => {
    const trig = e.target.closest('.term-trigger');
    if (!trig || pinned) return;
    const related = e.relatedTarget;
    if (related && (related.closest('.term-trigger') === trig || related.closest('.wf-popover'))) return;
    hideTimer = setTimeout(hidePopover, 200);
  });

  document.addEventListener('click', (e) => {
    const trig = e.target.closest('.term-trigger');
    if (trig) {
      if (activeTrigger === trig && pinned) {
        hidePopover();
      } else {
        showPopover(trig);
        pinned = true;
      }
      e.stopPropagation();
      return;
    }
    if (activePopover && !e.target.closest('.wf-popover')) {
      hidePopover();
    }
  });

  // ===== 画像拡大ライトボックス =====
  let lightbox = null;

  function ensureLightbox() {
    if (lightbox) return lightbox;
    lightbox = document.createElement('div');
    lightbox.className = 'wf-lightbox';
    lightbox.innerHTML =
      '<div class="wf-lightbox-modal" role="dialog" aria-modal="true">' +
      '<div class="wf-lightbox-head">' +
      '<span class="wf-lightbox-title">画像拡大</span>' +
      '<button type="button" class="wf-lightbox-close" aria-label="閉じる">×</button>' +
      '</div>' +
      '<div class="wf-lightbox-body">' +
      '<div class="wf-lightbox-figure"><span class="wf-lightbox-figure-label"></span></div>' +
      '<p class="wf-lightbox-cap"></p>' +
      '</div>' +
      '</div>';
    document.body.appendChild(lightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.closest('.wf-lightbox-close')) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
    });
    return lightbox;
  }

  function resolveImageContext(btn) {
    const ph = btn.parentElement;
    let label = '';
    let caption = '';
    if (!ph) return { label, caption };

    const labelEl = ph.querySelector(
      '.result-block-graph-ph-label, .large-figure-ph-label, .cm-progress-figure-ph-label, ' +
      '.activity-card-img-label, .img-zoom-modal-figure-label, [class*="-ph-label"], [class*="-img-label"]'
    );
    if (labelEl) {
      label = labelEl.innerText.trim();
    } else {
      const clone = ph.cloneNode(true);
      clone.querySelectorAll('.img-zoom-btn').forEach(b => b.remove());
      label = clone.innerText.trim();
    }

    const next = ph.nextElementSibling;
    if (next && /(graph-cap|figure-cap|img-cap|-cap)$/.test(next.className.split(' ').pop() || '')) {
      caption = next.innerText.trim();
    } else {
      const cell = ph.closest('.result-block-graph-cell, .vision-figure-2col, .strategy-figure-cell');
      if (cell) {
        const cap = cell.querySelector('.result-block-graph-cap, .figure-cap, .large-figure-cap');
        if (cap) caption = cap.innerText.trim();
      }
    }
    return { label, caption };
  }

  function openLightbox(btn) {
    ensureLightbox();
    const { label, caption } = resolveImageContext(btn);
    const titleEl = lightbox.querySelector('.wf-lightbox-title');
    const figLabel = lightbox.querySelector('.wf-lightbox-figure-label');
    const capEl = lightbox.querySelector('.wf-lightbox-cap');

    const head = caption ? caption.split('\n')[0].slice(0, 40) : '拡大表示';
    titleEl.textContent = '画像拡大：' + head;
    figLabel.textContent = label || '[ 拡大画像PH ]';
    capEl.textContent = caption;
    capEl.style.display = caption ? '' : 'none';

    lightbox.classList.add('is-open');
  }

  function closeLightbox() {
    if (lightbox) lightbox.classList.remove('is-open');
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.img-zoom-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    openLightbox(btn);
  });
})();
