/* 株式会社A.K.商会 LP  main.js（ロードサービスLP・レッカー制作事業ページで共用）
   外部ライブラリなし。JSが動かなくても、ページの表示とボタンのリンクはそのまま使えます。
   ページの区別：<body data-page="seisaku"> のように付ける。付いていないページはロードサービスLP（roadservice）として扱う。 */
(function () {
  'use strict';

  var PAGE_TYPE = document.body.getAttribute('data-page') || 'roadservice';

  /* GA4（gtag）へ送る。gtag がなければ dataLayer に積む。どちらもなければ何もしない */
  function sendEvent(eventName, params) {
    params.page_type = PAGE_TYPE;
    try {
      if (typeof window.gtag === 'function') {
        params.transport_type = 'beacon';
        window.gtag('event', eventName, params);
      } else if (Array.isArray(window.dataLayer)) {
        // GTM を使う場合に備えて dataLayer にも積めるようにしておく
        var obj = { event: eventName };
        for (var k in params) { if (Object.prototype.hasOwnProperty.call(params, k)) obj[k] = params[k]; }
        window.dataLayer.push(obj);
      }
    } catch (e) {
      /* 計測の失敗でボタン操作を止めない */
    }
  }

  /* ------------------------------------------------------------
   * 1. 電話・LINEボタンのクリック計測（GA4）
   *    ボタンには data-cta="tel|line" と data-pos="（設置場所）" が付いています。
   *    イベント名：tel_click / line_click
   *    パラメータ：cta_position（設置場所）、link_url、page_type（roadservice / seisaku）
   * ------------------------------------------------------------ */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-cta]') : null;
    if (!el) return;
    var type = el.getAttribute('data-cta');
    sendEvent(type === 'tel' ? 'tel_click' : 'line_click', {
      cta_position: el.getAttribute('data-pos') || 'unknown',
      link_url: el.getAttribute('href') || ''
    });
  });

  /* Instagram リンク：instagram_click（パラメータ：ig_account＝アカウント名、cta_position＝company / footer） */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-ig]') : null;
    if (!el) return;
    sendEvent('instagram_click', {
      ig_account: el.getAttribute('data-ig'),
      cta_position: el.getAttribute('data-pos') || 'unknown',
      link_url: el.getAttribute('href') || ''
    });
  });

  /* ページどうしのリンク：data-link="seisaku" → seisaku_link_click、data-link="roadservice" → roadservice_link_click
     （パラメータ：cta_position＝設置場所、link_url） */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-link]') : null;
    if (!el) return;
    sendEvent(el.getAttribute('data-link') + '_link_click', {
      cta_position: el.getAttribute('data-pos') || 'unknown',
      link_url: el.getAttribute('href') || ''
    });
  });

  /* ------------------------------------------------------------
   * 2. 文面のコピー
   *    ボタンに data-done-text / data-fail-text と data-status（状態表示のid）があれば、
   *    その文を状態表示（aria-live）に出す。なければ従来どおりボタンの文言だけ切り替える。
   * ------------------------------------------------------------ */
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-copy-target]'), function (btn) {
    var label = btn.querySelector('span');
    var original = label ? label.textContent : '';
    var timer = null;
    var doneText = btn.getAttribute('data-done-text');
    var failText = btn.getAttribute('data-fail-text');
    var status = btn.getAttribute('data-status') ? document.getElementById(btn.getAttribute('data-status')) : null;

    btn.addEventListener('click', function () {
      var target = document.getElementById(btn.getAttribute('data-copy-target'));
      if (!target) return;
      var text = target.textContent;

      var done = function () {
        if (label) label.textContent = 'コピーしました';
        btn.classList.add('is-done');
        if (status && doneText) status.textContent = doneText;
        clearTimeout(timer);
        timer = setTimeout(function () {
          if (label) label.textContent = original;
          btn.classList.remove('is-done');
        }, 2000);
      };
      var fail = function () {
        if (status && failText) status.textContent = failText;
      };

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, function () {
          if (fallbackCopy(text)) done(); else fail();
        });
      } else if (fallbackCopy(text)) {
        done();
      } else {
        fail();
      }
    });
  });

  /* ------------------------------------------------------------
   * 3. 時間帯による表示の切り替え（日本時間）
   *    ・<body data-hours-open="9" data-hours-close="18"> があるページ（制作ページ）：
   *      受付時間外に body へ is-closed を付ける（is-night は付けない・固定ボタンの文言は変えない）
   *    ・属性がないページ（ロードサービスLP）：20:00〜翌9:00 は is-night を付け、固定ボタンの電話を強調
   *      （LINEボタンと「9:00〜20:00」の表示は消さない）
   * ------------------------------------------------------------ */
  function getTokyoHour() {
    try {
      var h = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Tokyo' }).format(new Date());
      return parseInt(h, 10);
    } catch (e) {
      return new Date().getHours();
    }
  }

  var hoursClose = document.body.getAttribute('data-hours-close');

  if (hoursClose !== null) {
    var openH = parseInt(document.body.getAttribute('data-hours-open') || '9', 10);
    var closeH = parseInt(hoursClose, 10);
    var updateClosed = function () {
      var h = getTokyoHour();
      document.body.classList.toggle('is-closed', h >= closeH || h < openH);
    };
    updateClosed();
    setInterval(updateClosed, 5 * 60 * 1000);
  } else {
    var telSub = document.querySelector('.fbtn--tel .fbtn__sub-time');
    var telSubDay = telSub ? telSub.textContent : '';

    var updateNight = function () {
      var h = getTokyoHour();
      var night = h >= 20 || h < 9;
      document.body.classList.toggle('is-night', night);
      if (telSub) telSub.textContent = night ? telSub.getAttribute('data-night') : telSubDay;
    };

    updateNight();
    setInterval(updateNight, 5 * 60 * 1000);
  }

  /* ------------------------------------------------------------
   * 4. 動画（制作ページ）：タップしたときだけ読み込んで再生する
   *    JSが動かないときは <video controls> の標準の再生ボタンで再生できる。
   *    再生したら movie_play を送る。
   * ------------------------------------------------------------ */
  Array.prototype.forEach.call(document.querySelectorAll('.sk-movie'), function (box) {
    var video = box.querySelector('video');
    var play = box.querySelector('.sk-movie__play');
    if (!video || !play) return;
    box.classList.add('is-js');
    // 再生前は標準の操作バーを隠し、重ね表示のボタンだけを見せる（押したら標準の操作バーに戻す）
    video.removeAttribute('controls');
    var sent = false;
    play.addEventListener('click', function () {
      box.classList.add('is-playing');
      play.hidden = true;
      video.setAttribute('controls', '');
      try {
        var p = video.play();
        if (p && typeof p.catch === 'function') p.catch(function () { /* 標準の操作ボタンで再生できる */ });
      } catch (e) { /* 同上 */ }
      video.focus();
    });
    video.addEventListener('play', function () {
      if (sent) return;
      sent = true;
      sendEvent('movie_play', { cta_position: box.getAttribute('data-pos') || 'factory' });
    });
  });
})();
