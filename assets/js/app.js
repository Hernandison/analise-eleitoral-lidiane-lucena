/* ============ Análise Jorginho Araujo — app.js ============ */
(function () {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const fmtInt = n => Number(n).toLocaleString("pt-BR");
  const fmtPct = (x, d = 2) => Number(x).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }) + "%";
  const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  const PAL = ['#eef5fb','#d6e7f6','#b9d6ee','#93c0e3','#69a7d6','#4389c4','#2a6cae','#1b5293','#0d3b73'];
  const NAVY = '#0d3b73', BLUE = '#2a6cae', LIGHT = '#9ecae1';
  const BREAKS = { pctVal: [0.5,1,2.5,5,10,20,35,50], votos: [25,75,150,300,600,1200,2400,5000] };
  const colorFor = (v, br) => { for (let i=0;i<br.length;i++) if (v<br[i]) return PAL[i]; return PAL[br.length]; };

  const R = window.RESUMO, M = window.MUNICIPIOS, RK = window.RANKING, GEO = window.MALHA;
  M.forEach((m, i) => m.rankVotos = i + 1);          // ja vem ordenado por votos desc
  const byCod = {}; M.forEach(m => byCod[m.cod] = m);
  const maxVotos = Math.max(...M.map(m => m.votos));

  /* ---------- NAV / scroll ---------- */
  const nav = $("#nav");
  const onScroll = () => {
    nav.classList.toggle("scrolled", window.scrollY > 10);
    $("#toTop").classList.toggle("show", window.scrollY > 500);
    let cur = "";
    $$("section[id]").forEach(sec => { if (window.scrollY >= sec.offsetTop - 120) cur = sec.id; });
    $$(".nav-links a").forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + cur));
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  $("#hamburger").addEventListener("click", () => $("#navLinks").classList.toggle("open"));
  $$(".nav-links a").forEach(a => a.addEventListener("click", () => $("#navLinks").classList.remove("open")));
  $("#toTop").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  /* ---------- contadores animados ---------- */
  function animateCount(el) {
    const target = parseFloat(el.dataset.target);
    const dec = parseInt(el.dataset.decimals || "0", 10);
    const suf = el.dataset.suffix || "", pre = el.dataset.prefix || "";
    const dur = 1400, t0 = performance.now();
    function step(t) {
      const p = Math.min((t - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      const val = target * e;
      el.textContent = pre + (dec ? val.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec })
                                   : Math.round(val).toLocaleString("pt-BR")) + suf;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  const io = new IntersectionObserver((ents) => {
    ents.forEach(e => { if (e.isIntersecting) { animateCount(e.target); io.unobserve(e.target); } });
  }, { threshold: .4 });
  $$(".hstat .num").forEach(el => io.observe(el));

  /* ---------- reveal ---------- */
  const ro = new IntersectionObserver((ents) => {
    ents.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); ro.unobserve(e.target); } });
  }, { threshold: .12 });
  $$(".section .sec-head, .card, .chart-card, .table-card, .reduto, .dl-card, .map-wrap").forEach(el => { el.classList.add("reveal"); ro.observe(el); });

  /* ---------- cards de resumo (orientado a dados) ---------- */
  const compact = n => n >= 1000 ? Math.round(n / 1000) + " mil" : String(n);
  const TITLES = new Set(["dra","dr","prof","profa","professor","professora","pr","pastor","padre","cabo","sgt","sargento","sd","soldado","delegado","delegada","cel","coronel","major","cap","capitao","ten","tenente","vereador","vereadora","deputado","deputada","dep","doutor","doutora"]);
  const firstName = s => { for (const w of s.split(" ")) { if (!TITLES.has(w.toLowerCase().replace(/\./g, ""))) return w; } return s.split(" ")[0]; };
  const primNome = firstName(R.candidato);
  const cardVitorias = R.municipios_venceu > 0
    ? { ic: "🗺️", val: R.municipios_venceu, lbl: "municípios em 1º lugar", desc: "Onde foi o candidato mais votado do cargo." }
    : { ic: "🗺️", val: R.municipios_top5, lbl: "municípios no Top 5 local", desc: "Onde ficou entre os 5 mais votados do município." };
  const insights = [
    { ic: "🏅", val: `${R.posicao}º lugar`, lbl: "no estado", desc: `${fmtInt(R.votos)} votos — a ${fmtInt(R.gap_lider)} do 1º colocado (${titleCase(R.lider_estadual)}).` },
    { ic: "🎯", val: R.share_top5.toLocaleString("pt-BR") + "%", lbl: "dos votos em 5 cidades", desc: `Votação concentrada — os 10 maiores municípios somam ${R.share_top10.toLocaleString("pt-BR")}%.` },
    { ic: "👑", val: fmtPct(R.top_reduto_pct, 1), lbl: `de domínio em ${R.top_reduto_nome}`, desc: "Maior percentual entre os 75 municípios do estado." },
    cardVitorias,
    { ic: "🏛️", val: "≈" + compact(R.part_total), lbl: `votos do ${R.partido} no cargo`, desc: `Desempenho da legenda em ${R.cargo}. ${primNome} é um dos principais puxadores.` },
    { ic: "📈", val: R.municipios_menos1, lbl: "municípios com <1%", desc: "Espaço de expansão futura ou território de adversários." },
  ];
  $("#insightCards").innerHTML = insights.map(c => `
    <div class="card"><div class="c-ic">${c.ic}</div>
      <div class="c-val">${c.val}</div><div class="c-lbl">${c.lbl}</div>
      <div class="c-desc">${c.desc}</div></div>`).join("");

  /* ---------- cards de seções (orientado a dados) ---------- */
  const cobertura = (100 * R.secoes / R.secoes_estado).toFixed(1).replace(".", ",");
  const secCards = [
    { ic: "🗳️", val: fmtInt(R.secoes), lbl: "seções com voto", desc: `De ${fmtInt(R.secoes_estado)} seções do estado (${cobertura}% de cobertura).` },
    { ic: "📊", val: R.media_secao.toLocaleString("pt-BR"), lbl: "média por seção", desc: `Mediana de ${R.mediana_secao} — distribuição assimétrica.` },
    { ic: "🔝", val: R.maior_secao, lbl: "votos na maior urna", desc: R.maior_secao_local + "." },
    { ic: "💪", val: fmtInt(R.secoes_ge30), lbl: "urnas com ≥30 votos", desc: "Núcleo de urnas de alta performance." },
  ];
  $("#secCards").innerHTML = secCards.map(c => `
    <div class="card"><div class="c-ic">${c.ic}</div>
      <div class="c-val">${c.val}</div><div class="c-lbl">${c.lbl}</div>
      <div class="c-desc">${c.desc}</div></div>`).join("");

  /* ---------- MAPA ---------- */
  let metric = "pctVal", geoLayer = null, map = null;
  if (typeof L !== "undefined" && GEO) {
    map = L.map("map", { scrollWheelZoom: false, zoomSnap: 0.25, zoomControl: true }).setView([-10.6, -37.4], 8);
    map.attributionControl.setPrefix("");
    map.attributionControl.addAttribution("Malha: IBGE · Dados: TSE/BWEB");

    const styleFn = f => {
      const d = byCod[String(f.properties.codarea)];
      return { fillColor: colorFor(d ? d[metric] : 0, BREAKS[metric]), weight: 1, color: "#fff", fillOpacity: .88 };
    };
    const info = $("#mapInfo");
    function showInfo(d) {
      if (!d) return;
      const pos = d.posicao === 1
        ? '<span class="mi-badge win">★ 1º colocado no município</span>'
        : `<span class="mi-badge">${d.posicao}º de ${d.totcand} · líder: ${titleCase(d.lider)}</span>`;
      info.innerHTML = `<h3>${d.nome}</h3>
        <div class="mi-row"><span class="k">Votos de Jorginho</span><span class="v">${fmtInt(d.votos)}</span></div>
        <div class="mi-row"><span class="k">% dos válidos</span><span class="v">${fmtPct(d.pctVal)}</span></div>
        <div class="mi-row"><span class="k">Posição no município</span><span class="v">${d.posicao}º</span></div>
        <div class="mi-row"><span class="k">Seções</span><span class="v">${fmtInt(d.secoes)}</span></div>
        <div class="mi-row"><span class="k">Média / seção</span><span class="v">${d.media_sec.toLocaleString("pt-BR")}</span></div>
        <div class="mi-row"><span class="k">Comparecimento</span><span class="v">${fmtInt(d.comp)}</span></div>
        ${pos}`;
    }
    geoLayer = L.geoJSON(GEO, {
      style: styleFn,
      onEachFeature: (f, layer) => {
        const d = byCod[String(f.properties.codarea)];
        const nm = d ? d.nome : f.properties.codarea;
        layer.bindTooltip(`${nm}<br><b>${d ? fmtInt(d.votos) : "?"}</b> votos · ${d ? fmtPct(d.pctVal) : "?"}`, { className: "mun-tip", sticky: true });
        layer.on("mouseover", function () { this.setStyle({ weight: 2.5, color: "#113a66" }); this.bringToFront(); showInfo(d); });
        layer.on("mouseout", function () { geoLayer.resetStyle(this); });
        layer.on("click", function () { map.fitBounds(this.getBounds()); showInfo(d); });
      }
    }).addTo(map);
    map.fitBounds(geoLayer.getBounds());

    function renderLegend() {
      const br = BREAKS[metric], unit = metric === "pctVal" ? "%" : "";
      let lo = 0, html = "";
      for (let i = 0; i < br.length; i++) {
        html += `<span class="lg-item"><i style="background:${PAL[i]}"></i>${fmtRange(lo, br[i], unit)}</span>`; lo = br[i];
      }
      html += `<span class="lg-item"><i style="background:${PAL[br.length]}"></i>≥ ${metric === "pctVal" ? lo.toLocaleString("pt-BR") + "%" : fmtInt(lo)}</span>`;
      $("#mapLegend").innerHTML = html;
    }
    function fmtRange(a, b, u) {
      return metric === "pctVal" ? `${a.toLocaleString("pt-BR")}–${b.toLocaleString("pt-BR")}${u}` : `${fmtInt(a)}–${fmtInt(b - 1)}`;
    }
    renderLegend();
    $$(".mt-btn").forEach(b => b.addEventListener("click", () => {
      $$(".mt-btn").forEach(x => x.classList.remove("active")); b.classList.add("active");
      metric = b.dataset.metric; geoLayer.setStyle(styleFn); renderLegend();
    }));
  }
  function titleCase(s) { return s.toLowerCase().split(/\s+/).map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(" "); }

  /* ---------- CHARTS ---------- */
  if (typeof Chart !== "undefined") {
    Chart.defaults.font.family = "Inter, sans-serif";
    Chart.defaults.color = "#5a6b7d";
    const gridC = "rgba(17,58,102,.07)";

    // Ranking
    new Chart($("#rankingChart"), {
      type: "bar",
      data: { labels: RK.map(r => `${r.pos}. ${titleCase(r.nome)}`),
        datasets: [{ data: RK.map(r => r.votos),
          backgroundColor: RK.map(r => r.jorg ? NAVY : LIGHT),
          borderRadius: 5 }] },
      options: { indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false },
          tooltip: { callbacks: { label: c => fmtInt(c.raw) + " votos" + (RK[c.dataIndex].jorg ? "  ← JORGINHO" : "") } } },
        scales: { x: { grid: { color: gridC }, ticks: { callback: v => (v/1000) + "k" } }, y: { grid: { display: false }, ticks: { font: { size: 11 }, autoSkip: false } } } }
    });

    // Top votos
    const tv = M.slice(0, 12);
    new Chart($("#topVotosChart"), {
      type: "bar",
      data: { labels: tv.map(m => m.nome), datasets: [{ data: tv.map(m => m.votos), backgroundColor: BLUE, borderRadius: 5 }] },
      options: { indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmtInt(c.raw) + " votos · " + fmtPct(tv[c.dataIndex].pctVal) } } },
        scales: { x: { grid: { color: gridC }, ticks: { callback: v => (v/1000) + "k" } }, y: { grid: { display: false }, ticks: { font: { size: 11 } } } } }
    });

    // Top pct
    const tp = [...M].sort((a, b) => b.pctVal - a.pctVal).slice(0, 12);
    new Chart($("#topPctChart"), {
      type: "bar",
      data: { labels: tp.map(m => m.nome), datasets: [{ data: tp.map(m => m.pctVal),
        backgroundColor: tp.map(m => colorFor(m.pctVal, BREAKS.pctVal)), borderRadius: 5, borderColor: "#cdd", borderWidth: .5 }] },
      options: { indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmtPct(c.raw) + " · " + fmtInt(tp[c.dataIndex].votos) + " votos" } } },
        scales: { x: { grid: { color: gridC }, ticks: { callback: v => v + "%" } }, y: { grid: { display: false }, ticks: { font: { size: 11 } } } } }
    });

    // Histograma
    new Chart($("#histChart"), {
      type: "bar",
      data: { labels: R.hist_order, datasets: [{ data: R.hist_order.map(k => R.hist[k]), backgroundColor: BLUE, borderRadius: 6 }] },
      options: { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmtInt(c.raw) + " seções" } } },
        scales: { x: { grid: { display: false }, title: { display: true, text: "votos por seção" } }, y: { grid: { color: gridC }, title: { display: true, text: "nº de seções" } } } }
    });
  }

  /* ---------- top seções ---------- */
  $("#topSecBody").innerHTML = R.topsec.map(s => `
    <tr><td>${s.mun}</td><td class="num">${s.zona}</td><td class="num">${s.secao}</td><td class="num"><b>${s.votos}</b></td></tr>`).join("");

  /* ---------- explorador de seções por município ---------- */
  if (window.SECOES && $("#secMunSel")) {
    const sel = $("#secMunSel"), body = $("#secDetBody"), ssearch = $("#secSearch"), summ = $("#secSummary");
    SECOES.forEach((m, i) => {
      const o = document.createElement("option");
      o.value = i; o.textContent = `${m.nome} — ${fmtInt(m.votos)} votos (${fmtInt(m.nsec)} seções)`;
      sel.appendChild(o);
    });
    let curr = 0, sfilter = "";
    function renderSec() {
      const m = SECOES[curr];
      let rows = m.rows;
      if (sfilter) rows = rows.filter(r => norm(r.loc).includes(sfilter) || norm(r.b).includes(sfilter));
      body.innerHTML = rows.map(r => `<tr>
        <td class="num">${r.z}</td><td class="num">${r.s}</td>
        <td>${r.loc || "—"}</td><td>${r.b || "—"}</td>
        <td class="num"><b>${r.v}</b></td></tr>`).join("");
      summ.textContent = `${rows.length} seções · ${fmtInt(rows.reduce((a, r) => a + r.v, 0))} votos`;
    }
    sel.addEventListener("change", e => { curr = +e.target.value; sfilter = ""; ssearch.value = ""; renderSec(); });
    ssearch.addEventListener("input", e => { sfilter = norm(e.target.value); renderSec(); });
    renderSec();
  }

  /* ---------- redutos (adaptativo) ---------- */
  let redutos = M.filter(m => m.venceu).sort((a, b) => b.pctVal - a.pctVal);
  if (redutos.length === 0) redutos = [...M].sort((a, b) => b.pctVal - a.pctVal).slice(0, 6);
  $("#redutosGrid").innerHTML = redutos.map(m => `
    <div class="reduto">
      <h3>${m.nome}</h3>
      <div class="r-pct">${fmtPct(m.pctVal, 1)}</div>
      <div class="r-sub">dos votos válidos · ${m.posicao === 1 ? "1º colocado" : m.posicao + "º no município"}</div>
      <div class="r-votos"><b>${fmtInt(m.votos)}</b> votos · ${fmtInt(m.secoes)} seções</div>
    </div>`).join("");

  /* ---------- tabela municípios ---------- */
  const tbody = $("#munTbody"), search = $("#tblSearch"), count = $("#tblCount");
  let sortKey = "votos", sortDir = -1, filter = "";
  function rowHtml(m) {
    const w = Math.round(100 * m.votos / maxVotos);
    return `<tr class="${m.venceu ? "win" : ""}">
      <td class="num">${m.rankVotos}</td>
      <td>${m.nome}</td>
      <td class="num bar-cell"><span class="bar" style="width:${w}%"></span><span>${fmtInt(m.votos)}</span></td>
      <td class="num">${fmtPct(m.pctVal)}</td>
      <td class="num">${m.venceu ? '<span class="pill win">1º</span>' : '<span class="pill">' + m.posicao + 'º</span>'}</td>
      <td class="num">${fmtInt(m.secoes)}</td>
      <td class="num">${m.media_sec.toLocaleString("pt-BR")}</td>
      <td class="num">${m.maior_sec}</td></tr>`;
  }
  function renderTable() {
    let rows = M.filter(m => !filter || norm(m.nome).includes(filter));
    rows.sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (typeof va === "string") return sortDir * va.localeCompare(vb, "pt-BR");
      return sortDir * (va - vb);
    });
    tbody.innerHTML = rows.map(rowHtml).join("");
    count.textContent = `${rows.length} municípios` + (filter ? " (filtrado)" : "");
  }
  search.addEventListener("input", e => { filter = norm(e.target.value); renderTable(); });
  $$("#munTable th.sortable").forEach(th => th.addEventListener("click", () => {
    const k = th.dataset.k;
    if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = (k === "nome") ? 1 : -1; }
    $$("#munTable th").forEach(x => x.classList.remove("sort-asc", "sort-desc"));
    th.classList.add(sortDir === 1 ? "sort-asc" : "sort-desc");
    renderTable();
  }));
  renderTable();
  onScroll();
})();
