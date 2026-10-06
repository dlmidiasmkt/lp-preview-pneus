(function () {
  'use strict';

  var CFG = window.NORONHA || {};
  var T = CFG.tracking || {};
  var doc = document;
  var reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- armazenamento seguro ---------- */
  function ler(k, store) { try { return (store || localStorage).getItem(k); } catch (e) { return null; } }
  function gravar(k, v, store) { try { (store || localStorage).setItem(k, v); } catch (e) {} }

  /* =========================================================
     TRACKING: Consent Mode v2 + GTM + GA4/Google Ads + Meta Pixel
     Nada é carregado sem ID em js/config.js.
     ========================================================= */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  var consent = ler('noronha_consent'); // 'aceitar' | 'negar' | null
  gtag('consent', 'default', {
    ad_storage: 'denied', analytics_storage: 'denied',
    ad_user_data: 'denied', ad_personalization: 'denied',
    wait_for_update: 500
  });
  if (consent === 'aceitar') concederConsentimento(false);

  function carregarScript(src) {
    var s = doc.createElement('script'); s.async = true; s.src = src; doc.head.appendChild(s);
  }

  if (T.gtmId) {
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    carregarScript('https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(T.gtmId));
  }
  if (T.ga4Id || T.adsConversion) {
    var idBase = T.ga4Id || T.adsConversion.split('/')[0];
    carregarScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(idBase));
    gtag('js', new Date());
    if (T.ga4Id) gtag('config', T.ga4Id);
    if (T.adsConversion) gtag('config', T.adsConversion.split('/')[0]);
  }
  if (T.metaPixelId) {
    /* código base oficial do Meta Pixel */
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, doc, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    if (consent !== 'aceitar') window.fbq('consent', 'revoke');
    window.fbq('init', T.metaPixelId);
    window.fbq('track', 'PageView');
  }

  function concederConsentimento(salvar) {
    gtag('consent', 'update', {
      ad_storage: 'granted', analytics_storage: 'granted',
      ad_user_data: 'granted', ad_personalization: 'granted'
    });
    if (window.fbq) window.fbq('consent', 'grant');
    if (salvar) gravar('noronha_consent', 'aceitar');
  }

  /* UTMs e IDs de clique ficam na sessão e seguem no dataLayer (útil para CAPI/GTM server-side) */
  var origem = {};
  (function capturarOrigem() {
    var p = new URLSearchParams(location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid', 'wbraid', 'gbraid'].forEach(function (k) {
      var v = p.get(k) || ler('noronha_' + k, sessionStorage);
      if (v) { origem[k] = v; gravar('noronha_' + k, v, sessionStorage); }
    });
    if (Object.keys(origem).length) window.dataLayer.push(Object.assign({ event: 'origem_campanha' }, origem));
  })();

  function idEvento() { return 'lead-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8); }

  function registrarLead(dados) {
    var eventId = idEvento();
    var payload = Object.assign({ event: 'whatsapp_click', event_id: eventId }, dados, origem);
    window.dataLayer.push(payload);
    if (!T.gtmId) {
      gtag('event', 'generate_lead', { placement: dados.placement, medida: dados.medida || '', tipo: dados.tipo || '' });
      if (T.adsConversion) gtag('event', 'conversion', { send_to: T.adsConversion });
    }
    if (window.fbq) {
      window.fbq('track', 'Lead', {
        content_name: dados.medida || dados.placement,
        content_category: dados.tipo || 'pneus e rodas'
      }, { eventID: eventId });
    }
  }

  /* =========================================================
     WHATSAPP
     ========================================================= */
  var MSG_PADRAO = 'Olá! Vim pelo site da Noronha Pneus e quero fazer uma cotação.';
  function urlWhats(msg) {
    return 'https://wa.me/' + (CFG.whatsapp || '554991475797') + '?text=' + encodeURIComponent(msg || MSG_PADRAO);
  }

  doc.querySelectorAll('.js-wa').forEach(function (a) {
    a.href = urlWhats(a.getAttribute('data-msg'));
    a.addEventListener('click', function () {
      registrarLead({ placement: a.getAttribute('data-placement') || 'link' });
    });
  });

  /* =========================================================
     DECODIFICADOR DE MEDIDA
     ========================================================= */
  var form = doc.getElementById('cotacao');
  var selL = doc.getElementById('largura');
  var selP = doc.getElementById('perfil');
  var selA = doc.getElementById('aro');

  function preencher(sel, inicio, fim, passo, padrao, sufixo) {
    for (var v = inicio; v <= fim; v += passo) {
      var o = doc.createElement('option');
      o.value = String(v); o.textContent = v + (sufixo || '');
      if (v === padrao) o.selected = true;
      sel.appendChild(o);
    }
  }
  if (form) {
    preencher(selL, 155, 335, 10, 265);
    preencher(selP, 30, 85, 5, 70);
    preencher(selA, 13, 22, 1, 16);
  }

  function tipoAtual() { var r = form.querySelector('input[name="tipo"]:checked'); return r ? r.value : 'pneu'; }
  function usoAtual() { var r = form.querySelector('input[name="uso"]:checked'); return r ? r.value : ''; }
  function medidaAtual() { return selL.value + '/' + selP.value + ' R' + selA.value; }

  var elMedidaSvg = doc.getElementById('lateral-medida');
  var elLeitura = doc.getElementById('leitura-medida');
  var elExp = doc.getElementById('leitura-exp');
  var raios = doc.querySelector('.lateral__raios');
  var giro = 0;

  function atualizarVisor() {
    var tipo = tipoAtual();
    var m = medidaAtual();
    var ehRoda = tipo === 'roda';
    form.classList.toggle('is-roda', ehRoda);
    var texto = ehRoda ? 'RODA ARO ' + selA.value : m;
    elMedidaSvg.textContent = texto;
    elLeitura.textContent = ehRoda ? 'Aro ' + selA.value : m;
    elExp.textContent = ehRoda
      ? 'Roda aro ' + selA.value + '. Informe o veículo para conferirmos a furação.'
      : selL.value + ' mm de largura, lateral com ' + selP.value + '% dessa largura, para roda aro ' + selA.value + '.';
    giro += 30;
    if (raios && !reduzMovimento) raios.style.transform = 'rotate(' + giro + 'deg)';
    window.dispatchEvent(new CustomEvent('noronha:medida', { detail: { texto: texto } }));
  }

  if (form) {
    form.addEventListener('change', atualizarVisor);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var tipo = tipoAtual();
      var qtd = form.qtd.value;
      var veiculo = (form.veiculo.value || '').trim();
      var qtdTxt = qtd === 'atacado' ? 'compra no atacado' : (qtd === '1' ? '1 unidade' : qtd + ' unidades');
      var linhas = ['Olá! Vim pelo site da Noronha Pneus e quero uma cotação:'];
      if (tipo === 'roda') {
        linhas.push('• Roda aro ' + selA.value);
      } else {
        linhas.push('• ' + (tipo === 'pneu e roda' ? 'Pneu + roda' : 'Pneu') + ' ' + medidaAtual());
        linhas.push('• Uso: ' + usoAtual());
      }
      linhas.push('• Quantidade: ' + qtdTxt);
      if (veiculo) linhas.push('• Veículo: ' + veiculo);
      registrarLead({ placement: 'seletor', medida: tipo === 'roda' ? 'aro ' + selA.value : medidaAtual(), tipo: tipo, quantidade: qtd });
      abrir(urlWhats(linhas.join('\n')));
    });

    doc.getElementById('sem-medida').addEventListener('click', function () {
      registrarLead({ placement: 'sem-medida', tipo: tipoAtual() });
      abrir(urlWhats('Olá! Vim pelo site da Noronha Pneus. Não sei a medida do meu pneu, vou mandar uma foto da lateral para vocês me ajudarem.'));
    });

    atualizarVisor();
  }

  function abrir(url) {
    var w = window.open(url, '_blank', 'noopener');
    if (!w) location.href = url;
  }

  /* chips de medida do Xbri preenchem o seletor */
  doc.querySelectorAll('.js-chip').forEach(function (b) {
    b.addEventListener('click', function () {
      var m = b.getAttribute('data-medida').match(/(\d+)\/(\d+)\s*R(\d+)/);
      if (!m || !form) return;
      form.querySelector('input[name="tipo"][value="pneu"]').checked = true;
      selL.value = m[1]; selP.value = m[2]; selA.value = m[3];
      atualizarVisor();
      doc.getElementById('medida').scrollIntoView({ behavior: reduzMovimento ? 'auto' : 'smooth' });
      setTimeout(function () { form.querySelector('button[type="submit"]').focus({ preventScroll: true }); }, reduzMovimento ? 0 : 700);
    });
  });

  /* desenho da lateral: cravos e raios gerados aqui para manter o SVG leve */
  (function desenharLateral() {
    var NS = 'http://www.w3.org/2000/svg';
    var cravos = doc.querySelector('.lateral__cravos');
    if (cravos) {
      for (var i = 0; i < 44; i++) {
        var r = doc.createElementNS(NS, 'rect');
        var largo = i % 2 ? 9 : 14;
        r.setAttribute('x', String(200 - largo / 2)); r.setAttribute('y', '2');
        r.setAttribute('width', String(largo)); r.setAttribute('height', i % 2 ? '14' : '20');
        r.setAttribute('rx', '2');
        r.setAttribute('transform', 'rotate(' + (i * 360 / 44) + ' 200 200)');
        cravos.appendChild(r);
      }
    }
    if (raios) {
      for (var k = 0; k < 6; k++) {
        var p = doc.createElementNS(NS, 'path');
        p.setAttribute('d', 'M 188 178 L 180 112 Q 200 104 220 112 L 212 178 Z');
        p.setAttribute('transform', 'rotate(' + (k * 60) + ' 200 200)');
        raios.appendChild(p);
      }
    }
  })();

  /* =========================================================
     OFERTA COM PRAZO
     ========================================================= */
  (function validarOferta() {
    var fim = Date.parse(CFG.ofertaXbriFim || '');
    if (!fim || Date.now() <= fim) return;
    doc.querySelectorAll('.js-oferta, .js-oferta-preco').forEach(function (el) { el.hidden = true; });
    doc.querySelectorAll('.js-oferta-fim').forEach(function (el) { el.hidden = false; });
    var tit = doc.querySelector('.destaque__medidas-tit');
    if (tit) tit.textContent = 'Medidas da linha';
  })();

  /* =========================================================
     TOPO, BARRA MOBILE, VIEWCONTENT
     ========================================================= */
  var topo = doc.getElementById('topo');
  var barra = doc.getElementById('barra-mobile');
  var hero = doc.querySelector('.hero');
  var final = doc.querySelector('.final');
  var heroVisivel = true, finalVisivel = false;

  function aoRolar() { topo.classList.toggle('is-solido', window.scrollY > 24); }
  window.addEventListener('scroll', aoRolar, { passive: true });
  aoRolar();

  if ('IntersectionObserver' in window) {
    var atualizarBarra = function () { barra.classList.toggle('is-visivel', !heroVisivel && !finalVisivel); };
    new IntersectionObserver(function (es) { heroVisivel = es[0].isIntersecting; atualizarBarra(); }, { threshold: 0.15 }).observe(hero);
    new IntersectionObserver(function (es) { finalVisivel = es[0].isIntersecting; atualizarBarra(); }).observe(final);

    var produtos = doc.getElementById('produtos');
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      window.dataLayer.push({ event: 'view_produtos' });
      if (window.fbq) window.fbq('track', 'ViewContent', { content_name: 'Vitrine de pneus e rodas' });
    }, { threshold: 0.3 });
    io.observe(produtos);
  } else {
    barra.classList.add('is-visivel');
  }

  /* =========================================================
     CONSENTIMENTO (LGPD)
     ========================================================= */
  var aviso = doc.getElementById('cookies');
  var precisaAviso = T.gtmId || T.ga4Id || T.adsConversion || T.metaPixelId;
  if (precisaAviso && !consent) aviso.hidden = false;
  aviso.addEventListener('click', function (e) {
    var b = e.target.closest('[data-consent]');
    if (!b) return;
    if (b.getAttribute('data-consent') === 'aceitar') concederConsentimento(true);
    else gravar('noronha_consent', 'negar');
    aviso.hidden = true;
  });
  doc.getElementById('abrir-cookies').addEventListener('click', function () { aviso.hidden = false; });

  /* entrada do hero */
  requestAnimationFrame(function () { doc.body.classList.add('is-carregado'); });
})();
