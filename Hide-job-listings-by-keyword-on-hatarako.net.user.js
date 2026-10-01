// ==UserScript==
// @name         hatarako 求人単語非表示
// @namespace    local.hatarako.hide
// @version      1.0.0
// @description  指定語句を含む求人を非表示にする（語句は後から追加・削除可能）
// @match        https://www.hatarako.net/*
// @exclude      https://www.hatarako.net/job/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // 求人1件分を囲む要素（コンソール出力で [No=1] の最上位だった DIV.common-jobList02）
  const CARD_SELECTOR = '.common-jobList02';

  const KEY = 'ngWords';
  const HIDDEN_ATTR = 'data-hk-hidden';
  const getWords = () => GM_getValue(KEY, []);
  const setWords = (w) => GM_setValue(KEY, w);

  const norm = (s) => s.toLowerCase().replace(/\s+/g, '');

  function findCards() {
    if (CARD_SELECTOR) return [...document.querySelectorAll(CARD_SELECTOR)];

    const re = /お仕事No/g;
    const cards = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (!/お仕事No/.test(n.nodeValue)) continue;
      let el = n.parentElement;
      while (
        el.parentElement &&
        !['BODY', 'MAIN', 'HTML'].includes(el.parentElement.tagName) &&
        (el.parentElement.textContent.match(re) || []).length === 1
      ) {
        el = el.parentElement;
      }
      cards.add(el);
    }
    return [...cards];
  }

  function apply() {
    const words = getWords().map(norm).filter(Boolean);
    let hidden = 0;
    for (const card of findCards()) {
      const text = norm(card.textContent);
      const hit = words.find((w) => text.includes(w));
      if (hit) {
        card.style.display = 'none';
        card.setAttribute(HIDDEN_ATTR, hit);
        hidden++;
      } else if (card.hasAttribute(HIDDEN_ATTR)) {
        card.style.display = '';
        card.removeAttribute(HIDDEN_ATTR);
      }
    }
    console.log(`[hatarako-hide] 非表示: ${hidden}件 / 語句: ${words.length}個`);
  }

  GM_registerMenuCommand('語句を追加（カンマ区切り）', () => {
    const input = prompt('非表示にする語句を入力（複数はカンマ「,」または「、」区切り）');
    if (!input) return;
    const add = input.split(/[,、]/).map((s) => s.trim()).filter(Boolean);
    setWords([...new Set([...getWords(), ...add])]);
    apply();
  });

  GM_registerMenuCommand('語句を削除', () => {
    const words = getWords();
    const input = prompt('削除する語句を入力（カンマ区切り）\n現在: ' + words.join(', '));
    if (!input) return;
    const del = input.split(/[,、]/).map((s) => s.trim());
    setWords(words.filter((w) => !del.includes(w)));
    apply();
  });

  GM_registerMenuCommand('語句一覧を表示', () => {
    alert('現在の語句:\n' + (getWords().join('\n') || '(なし)'));
  });

  GM_registerMenuCommand('語句を全削除', () => {
    if (confirm('全ての語句を削除しますか？')) {
      setWords([]);
      apply();
    }
  });

  apply();

  let timer;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(apply, 300);
  }).observe(document.body, { childList: true, subtree: true });
})();
