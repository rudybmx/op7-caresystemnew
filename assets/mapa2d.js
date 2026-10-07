// Mapa 2D da rede de distribuidores — SP e PR, projeção real, sem pino
// ajustado a mão. Substitui a cena 3D (mapa3d.js, removido).
//
// Fonte única: os data-lat/data-lon/data-grupo dos .distrib-item na lista
// (ver index.html, secção #distribuidores). O mapa só agrega e projeta —
// não existe tabela paralela de coordenadas aqui. Um pino por CIDADE
// (data-grupo): quando duas unidades caem quase no mesmo ponto (Arapongas,
// Londrina) o pino ganha um badge de contagem em vez de uma segunda
// posição inventada.
(function () {
  "use strict";

  var sec = document.getElementById("distribuidores");
  var host = document.getElementById("mapa2d");
  if (!sec || !host) return;
  var svg = host.querySelector(".mapa-2d-svg");
  var itens = [].slice.call(sec.querySelectorAll(".distrib-item[data-lat][data-lon]"));
  if (!svg || !itens.length) return;

  var NS = "http://www.w3.org/2000/svg";

  // agrupa por cidade (data-grupo); cada item entra com seu lat/lon real
  var grupos = {}, ordem = [];
  itens.forEach(function (el) {
    var id = el.dataset.grupo || el.dataset.id;
    if (!grupos[id]) {
      grupos[id] = {
        id: id,
        sede: el.dataset.sede === "1",
        // rotulo do pino: nome da UNIDADE so faz sentido pra sede (ela e
        // uma so); pra cidade com 2+ unidades o pino mostra a cidade, nao
        // a primeira empresa encontrada — "Dental Ingá" nao e Arapongas
        nome: el.dataset.sede === "1"
          ? (el.querySelector(".distrib-nome") || {}).textContent || id
          : ((el.querySelector(".distrib-cidade") || {}).textContent || id).split(",")[0].trim(),
        itens: [], latSum: 0, lonSum: 0
      };
      ordem.push(id);
    }
    var g = grupos[id];
    g.itens.push(el);
    g.latSum += parseFloat(el.dataset.lat);
    g.lonSum += parseFloat(el.dataset.lon);
  });
  ordem.forEach(function (id) {
    var g = grupos[id];
    g.lat = g.latSum / g.itens.length;
    g.lon = g.lonSum / g.itens.length;
  });

  fetch("/public/malha-sp-pr.json").then(function (r) { return r.json(); })
    .then(function (malha) { montar(malha); })
    .catch(function (err) {
      console.warn("mapa indisponível:", err);
      host.parentNode.style.display = "none";
    });

  function montar(malha) {
    // mesma projeção do mapa 3D antigo: bbox real -> centro/escala, com a
    // correção de cos(lat) pro grau de longitude não esticar o desenho
    var mnx = 180, mxx = -180, mny = 90, mxy = -90;
    Object.keys(malha).forEach(function (uf) {
      malha[uf].forEach(function (poly) { poly.forEach(function (anel) { anel.forEach(function (p) {
        if (p[0] < mnx) mnx = p[0]; if (p[0] > mxx) mxx = p[0];
        if (p[1] < mny) mny = p[1]; if (p[1] > mxy) mxy = p[1];
      }); }); });
    });
    var cLon = (mnx + mxx) / 2, cLat = (mny + mxy) / 2;
    var escala = 100 / (mxx - mnx);
    var kx = Math.cos(cLat * Math.PI / 180);
    // svg é y-pra-baixo; o mapa 3D usava y-pra-cima, daí o sinal trocado
    function projetar(lon, lat) { return [(lon - cLon) * escala * kx, -(lat - cLat) * escala]; }

    var defs = document.createElementNS(NS, "defs");
    defs.innerHTML =
      '<linearGradient id="mapaUfGlow" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="rgba(168,209,86,.20)"/>' +
      '<stop offset="1" stop-color="rgba(122,196,164,.05)"/></linearGradient>';
    svg.appendChild(defs);

    var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    Object.keys(malha).forEach(function (uf) {
      malha[uf].forEach(function (poly) {
        var d = "";
        poly.forEach(function (anel) {
          anel.forEach(function (p, j) {
            var xy = projetar(p[0], p[1]);
            if (xy[0] < minX) minX = xy[0]; if (xy[0] > maxX) maxX = xy[0];
            if (xy[1] < minY) minY = xy[1]; if (xy[1] > maxY) maxY = xy[1];
            d += (j === 0 ? "M" : "L") + xy[0].toFixed(2) + "," + xy[1].toFixed(2);
          });
          d += "Z";
        });
        var path = document.createElementNS(NS, "path");
        path.setAttribute("d", d);
        path.setAttribute("fill", "url(#mapaUfGlow)");
        path.setAttribute("stroke", "rgba(168,209,86,.42)");
        path.setAttribute("stroke-width", "0.32");
        svg.appendChild(path);
      });
    });

    var pad = 3;
    var vw = maxX - minX + pad * 2, vh = maxY - minY + pad * 2;
    svg.setAttribute("viewBox", (minX - pad) + " " + (minY - pad) + " " + vw + " " + vh);

    function paraPercent(xy) {
      return [((xy[0] - (minX - pad)) / vw) * 100, ((xy[1] - (minY - pad)) / vh) * 100];
    }

    var sedeG = grupos.sede;
    var sedeXY = sedeG ? projetar(sedeG.lon, sedeG.lat) : null;

    var arcosLayer = document.createElementNS(NS, "g");
    svg.appendChild(arcosLayer);

    var pinos = [], selecionado = null;

    ordem.forEach(function (id) {
      var g = grupos[id];
      var xy = projetar(g.lon, g.lat);
      var pct = paraPercent(xy);

      var arcEl = null;
      if (!g.sede && sedeXY) {
        var mx = (sedeXY[0] + xy[0]) / 2, my = (sedeXY[1] + xy[1]) / 2;
        var dist = Math.hypot(xy[0] - sedeXY[0], xy[1] - sedeXY[1]);
        my -= dist * 0.16; // arco levemente pra cima, mesmo espírito do arco 3D
        var dPath = "M " + sedeXY[0].toFixed(2) + " " + sedeXY[1].toFixed(2) +
          " Q " + mx.toFixed(2) + " " + my.toFixed(2) + " " + xy[0].toFixed(2) + " " + xy[1].toFixed(2);
        arcEl = document.createElementNS(NS, "path");
        arcEl.setAttribute("d", dPath);
        arcEl.setAttribute("fill", "none");
        arcEl.setAttribute("class", "cs-arc");
        arcosLayer.appendChild(arcEl);
      }

      var pin = document.createElement("button");
      pin.type = "button";
      pin.className = "cs-pin" + (g.sede ? " cs-pin--sede" : "");
      pin.style.left = pct[0] + "%";
      pin.style.top = pct[1] + "%";
      var rotulo = g.nome + (g.itens.length > 1 ? " · " + g.itens.length + " unidades" : "");
      pin.setAttribute("aria-label", rotulo);
      // a sede fica perto da borda leste do mapa (SJBV) — rotulo curto no
      // pino pra nao estourar o cartao em telas estreitas; o nome cheio
      // continua no aria-label e na lista
      var textoPino = g.sede ? "Sede" : g.nome;
      // balao tipo Google Maps: a ponta (12,32) e o ponto geografico real —
      // o CSS ancora o botao nela (translate(-50%,-100%)), entao o resto do
      // desenho so preenche pra cima a partir dai
      pin.innerHTML =
        '<span class="cs-halo" aria-hidden="true"></span>' +
        '<svg class="cs-pin-icon" viewBox="0 0 24 32" aria-hidden="true">' +
        '<path class="cs-pin-fill" d="M12,0C5.383,0,0,5.383,0,12c0,9,12,20,12,20s12-11,12-20C24,5.383,18.617,0,12,0z"/>' +
        '<circle class="cs-pin-hole" cx="12" cy="12" r="5"/>' +
        "</svg>" +
        (g.itens.length > 1 ? '<span class="cs-pin-badge" aria-hidden="true">' + g.itens.length + "</span>" : "") +
        '<span class="cs-pin-label" aria-hidden="true">' + textoPino + "</span>";
      host.appendChild(pin);

      var registro = { id: id, el: pin, arc: arcEl };
      pinos.push(registro);

      pin.addEventListener("click", function (e) {
        e.stopPropagation();
        selecionar(id === selecionado ? null : id);
      });
    });

    // clicar em area vazia do mapa limpa a selecao
    host.addEventListener("click", function () { selecionar(null); });

    function selecionar(id) {
      selecionado = id;
      pinos.forEach(function (p) {
        var ativo = p.id === id;
        p.el.classList.toggle("is-ativo", ativo);
        if (p.arc) {
          p.arc.classList.toggle("is-ativo", ativo);
          p.arc.classList.toggle("is-fraco", !!id && !ativo);
        }
      });
      itens.forEach(function (el) {
        var g = el.dataset.grupo || el.dataset.id;
        el.classList.toggle("is-selecionado", !!id && g === id);
      });
    }

    window._selecionarMapa = selecionar;

    // lista -> mapa: cabecalho do acordeao (ou a linha inteira, na sede,
    // que nao tem acordeao) tambem seleciona o grupo no mapa
    itens.forEach(function (el) {
      var alvo = el.querySelector(".distrib-head") || el;
      alvo.addEventListener("click", function () {
        selecionar(el.dataset.grupo || el.dataset.id);
      });
    });
  }
})();
