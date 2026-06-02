/* Grayic purchase popup — social-proof widget.
 * Behavior + design driven by Gray DB (popup_settings). The data-* attributes
 * below are LOCAL OVERRIDES (per-site). Anything not overridden inherits from
 * the server config returned by /recent-purchases.
 *
 *   <script src="https://grayic-popup.vercel.app/popup.js"
 *           data-endpoint="https://kndyhdkaiqijyzmxtdem.supabase.co/functions/v1/recent-purchases"
 *           data-position="bottom-left"
 *           data-interval="8000"
 *           data-duration="5000"
 *           data-limit="20"
 *           defer></script>
 */
(function () {
  "use strict";
  if (window.__grayicPopupLoaded) return;
  window.__grayicPopupLoaded = true;

  var s = document.currentScript || (function () {
    var all = document.getElementsByTagName("script");
    return all[all.length - 1];
  })();

  var attr = function (n) { return s ? s.getAttribute(n) : null; };
  var localOverrides = {
    position: attr("data-position"),
    interval_ms: attr("data-interval") ? parseInt(attr("data-interval"), 10) : null,
    duration_ms: attr("data-duration") ? parseInt(attr("data-duration"), 10) : null,
  };
  var endpoint = attr("data-endpoint") ||
    "https://kndyhdkaiqijyzmxtdem.supabase.co/functions/v1/recent-purchases";
  var feedLimit = attr("data-limit") ? parseInt(attr("data-limit"), 10) : null;

  // Defaults — overridden by server config, then by per-site data-* overrides.
  var cfg = {
    enabled: true,
    position: "bottom-left",
    interval_ms: 8000,
    duration_ms: 5000,
    refresh_ms: 180000,
    show_country: true,
    show_time_ago: true,
    show_verified: true,
    accent_from: "#6366f1",
    accent_to: "#8b5cf6",
    name_fallback: "Someone",
    product_fallback: "a template",
  };

  var regionNames = null;
  try { regionNames = new Intl.DisplayNames(["en"], { type: "region" }); } catch (e) {}
  function countryName(iso) {
    if (!iso) return null;
    try { return regionNames ? regionNames.of(String(iso).toUpperCase()) : iso; }
    catch (e) { return iso; }
  }

  function timeAgo(iso) {
    if (!iso) return "recently";
    var diff = Math.max(0, Date.now() - new Date(iso).getTime());
    var m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + (m === 1 ? " minute ago" : " minutes ago");
    var h = Math.floor(m / 60);
    if (h < 24) return h + (h === 1 ? " hour ago" : " hours ago");
    var d = Math.floor(h / 24);
    return d + (d === 1 ? " day ago" : " days ago");
  }

  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Display-only random first names by ISO country (LemonSqueezy popups).
  // Used only when the real buyer's first name isn't available. Not stored.
  var NAMES_BY_COUNTRY = {
    US: ["Alex","Jordan","Casey","Taylor","Morgan","Jamie","Riley","Avery","Cameron","Quinn","Skyler","Drew"],
    GB: ["Oliver","Amelia","Harry","Emma","James","Sophia","William","Olivia","Jack","Ava","George","Isla"],
    CA: ["Ethan","Olivia","Liam","Emma","Noah","Charlotte","Jacob","Sophia","Lucas","Mia"],
    AU: ["Jack","Charlotte","Oliver","Mia","Noah","Olivia","William","Amelia","Liam","Ava"],
    NZ: ["Liam","Olivia","Noah","Charlotte","Oliver","Mia","Jack","Amelia","Ethan","Isla"],
    IE: ["Jack","Emily","Daniel","Emma","Conor","Sophie","Sean","Aoife","Adam","Ava"],
    MX: ["Carlos","Sofia","Diego","Maria","Luis","Lucia","Juan","Camila","Miguel","Valentina"],
    ES: ["Hugo","Lucia","Daniel","Sofia","Pablo","Maria","Alvaro","Martina","Mateo","Sara"],
    AR: ["Mateo","Sofia","Santiago","Valentina","Benjamin","Catalina","Tomas","Isabella","Bruno","Camila"],
    CL: ["Sebastian","Florencia","Vicente","Antonia","Joaquin","Martina","Agustin","Emilia","Tomas","Sofia"],
    CO: ["Santiago","Isabella","Mateo","Sofia","Sebastian","Valentina","Nicolas","Mariana","Daniel","Camila"],
    PE: ["Mateo","Valentina","Santiago","Isabella","Sebastian","Camila","Diego","Sofia","Joaquin","Lucia"],
    BR: ["Miguel","Sophia","Arthur","Helena","Davi","Alice","Bernardo","Laura","Pedro","Manuela"],
    PT: ["Joao","Maria","Pedro","Ana","Rodrigo","Beatriz","Diogo","Carolina","Tiago","Matilde"],
    DE: ["Lukas","Mia","Leon","Hannah","Felix","Lena","Jonas","Emma","Max","Sophie"],
    AT: ["Lukas","Anna","Maximilian","Lena","Felix","Sophie","Tobias","Mia","David","Lara"],
    CH: ["Noah","Mia","Liam","Emma","Leon","Lina","Luca","Sofia","David","Lara"],
    FR: ["Leo","Emma","Gabriel","Louise","Hugo","Alice","Adam","Chloe","Louis","Jade"],
    BE: ["Lucas","Emma","Liam","Olivia","Noah","Louise","Arthur","Mila","Jules","Alice"],
    NL: ["Daan","Emma","Bram","Anna","Sem","Sophie","Liam","Julia","Noah","Tess"],
    IT: ["Leonardo","Sofia","Francesco","Aurora","Lorenzo","Giulia","Alessandro","Ginevra","Mattia","Greta"],
    PL: ["Jakub","Zofia","Antoni","Julia","Jan","Hanna","Aleksander","Maja","Franciszek","Lena"],
    SE: ["William","Alice","Oscar","Maja","Liam","Astrid","Hugo","Vera","Lucas","Wilma"],
    NO: ["William","Emma","Oliver","Nora","Lukas","Sofia","Mathias","Ella","Jakob","Maja"],
    DK: ["William","Ella","Oscar","Sofia","Lucas","Freja","Oliver","Alma","Noah","Clara"],
    FI: ["Onni","Aino","Eino","Sofia","Leo","Olivia","Niilo","Helmi","Eemil","Aada"],
    CZ: ["Jakub","Eliska","Jan","Tereza","Tomas","Anna","Adam","Sofia","Matyas","Viktorie"],
    GR: ["Giorgos","Maria","Dimitris","Eleni","Nikos","Sofia","Kostas","Katerina","Alex","Anna"],
    TR: ["Mustafa","Zeynep","Ahmet","Elif","Ali","Asya","Mehmet","Defne","Hasan","Azra"],
    RU: ["Aleksandr","Maria","Mikhail","Anna","Ivan","Sofia","Dmitri","Ekaterina","Sergei","Anastasia"],
    UA: ["Oleksandr","Anastasia","Maksym","Sofia","Dmytro","Anna","Andriy","Veronika","Bogdan","Mariia"],
    IL: ["Noam","Tamar","Itay","Maya","Ariel","Yael","David","Shira","Yosef","Avigail"],
    AE: ["Ahmed","Fatima","Omar","Aisha","Hassan","Layla","Khalid","Noor","Yusuf","Mariam"],
    SA: ["Mohammed","Layla","Abdullah","Maryam","Khalid","Sara","Faisal","Aisha","Salman","Hala"],
    QA: ["Ahmed","Fatima","Mohammed","Aisha","Hamad","Maryam","Khalid","Noor","Ali","Layla"],
    KW: ["Abdullah","Fatima","Ahmed","Aisha","Mohammed","Mariam","Yousef","Sara","Khalid","Noor"],
    EG: ["Mohamed","Aya","Ahmed","Salma","Omar","Mariam","Youssef","Fatma","Ali","Habiba"],
    MA: ["Mohamed","Salma","Youssef","Aya","Ahmed","Lina","Omar","Ines","Adam","Maryam"],
    NG: ["Chidi","Amara","Tunde","Ngozi","Femi","Adaeze","Emeka","Kemi","Bola","Ifeoma"],
    KE: ["Brian","Faith","Kevin","Mary","David","Grace","James","Joy","Peter","Esther"],
    ZA: ["Themba","Ayanda","Sipho","Naledi","Lwazi","Lerato","Andile","Zinhle","Kabelo","Nomvula"],
    IN: ["Aarav","Ananya","Arjun","Diya","Vivaan","Ishaani","Reyansh","Aaradhya","Krishna","Saanvi"],
    PK: ["Muhammad","Fatima","Ali","Aisha","Hassan","Maryam","Ahmed","Zainab","Bilal","Khadija"],
    BD: ["Rakib","Tahmina","Sakib","Mim","Tanvir","Nusrat","Imran","Sumaiya","Arif","Maliha"],
    LK: ["Dilshan","Tharushi","Kasun","Sachini","Nuwan","Hashini","Tharindu","Dilini","Pasindu","Nethmi"],
    NP: ["Aarav","Sita","Bibek","Anjali","Rohit","Pooja","Prashant","Sunita","Niraj","Anita"],
    ID: ["Adi","Putri","Budi","Siti","Eko","Dewi","Andi","Lestari","Bagus","Sari"],
    MY: ["Aiman","Aisyah","Aqil","Nur","Adam","Iman","Daniel","Sara","Aidan","Aliya"],
    PH: ["Juan","Maria","Jose","Anna","Mark","Sofia","John","Joy","Rico","Bea"],
    SG: ["Wei Ming","Hui Min","Jun Hao","Mei Ling","Yong Jie","Xin Yi","Cheng Hao","Li Wen","Kai Xuan","Jia En"],
    TH: ["Somchai","Siriporn","Anurak","Suda","Krit","Wanida","Niran","Malee","Sak","Pim"],
    VN: ["Minh","Linh","Anh","Mai","Hoang","Thao","Long","Huong","Quan","Ngoc"],
    JP: ["Hiroshi","Yuki","Takashi","Sakura","Daichi","Hina","Haruto","Aoi","Ren","Mio"],
    KR: ["Min-jun","Seo-yeon","Ji-ho","Ha-eun","Jun-seo","Ji-woo","Do-yoon","Su-jin","Hyun-woo","Eun-ji"],
    CN: ["Wei","Xia","Jun","Mei","Yang","Hua","Lin","Yan","Bo","Jing"],
    HK: ["Chun","Mei","Wing","Kwan","Ming","Wai","Hei","Yan","Tin","Lai"],
    TW: ["Chun","Hui","Wei","Mei","Yi","Ling","Jia","Ting","Hao","Ying"],
    __DEFAULT__: [
      "Aisha","Akira","Amara","Andre","Anya","Arjun","Beatriz","Camila","Carlos","Chen",
      "Daniela","Dimitri","Elena","Emeka","Fatima","Felix","Hassan","Hiroshi","Ines","Ingrid",
      "Isabela","Jasmin","Joaquin","Joelle","Karim","Kenji","Lars","Leila","Lukas","Mateo",
      "Mei","Mikhail","Mira","Nadia","Naomi","Niko","Omar","Pablo","Priya","Rafael",
      "Rania","Ravi","Renata","Sanjay","Sebastian","Selena","Sven","Tariq","Tomoko","Valentina",
      "Wei","Xiomara","Yael","Yara","Yasmin","Yusuf","Zara","Zoran","Anika","Mateusz"
    ]
  };

  // Deterministic random pick based on a stable seed (sale timestamp) so the same
  // popup shows the same generated name across reloads / cycles.
  function hashSeed(seed) {
    var h = 0;
    var s = String(seed || "");
    for (var i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }
  function pickFromPool(pool, seed) {
    if (!pool || pool.length === 0) return null;
    return pool[hashSeed(seed) % pool.length];
  }
  function pickName(country, seed) {
    var key = country ? String(country).toUpperCase() : null;
    var pool = (key && NAMES_BY_COUNTRY[key]) || NAMES_BY_COUNTRY.__DEFAULT__;
    return pickFromPool(pool, seed);
  }

  // Template-name pool sent by the server, used by the 'framerbite' slug override.
  var templatePool = [];

  // ── Shadow DOM host ──────────────────────────────────────────────────────
  var host = document.createElement("div");
  host.style.cssText = "all:initial;position:fixed;z-index:2147483647;";
  document.body.appendChild(host);
  var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;

  var style = document.createElement("style");
  var card = document.createElement("div");
  card.className = "card";
  root.appendChild(style);
  root.appendChild(card);

  function applyPositionAndTheme() {
    var pos = cfg.position;
    host.style.top = host.style.bottom = host.style.left = host.style.right = "";
    host.style[pos.indexOf("bottom") > -1 ? "bottom" : "top"] = "20px";
    host.style[pos.indexOf("right") > -1 ? "right" : "left"] = "20px";
    var fromBottom = pos.indexOf("bottom") > -1;

    style.textContent = [
      ":host{all:initial}",
      "*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}",
      ".card{position:relative;display:flex;align-items:center;gap:12px;width:320px;max-width:calc(100vw - 40px);",
      "background:#fff;border:1px solid rgba(0,0,0,.06);border-radius:14px;padding:12px 14px;",
      "box-shadow:0 8px 30px rgba(0,0,0,.16);opacity:0;transform:translateY(" + (fromBottom ? "16px" : "-16px") + ");",
      "transition:opacity .35s ease,transform .35s ease;cursor:default}",
      ".card.show{opacity:1;transform:translateY(0)}",
      ".avatar{flex:0 0 auto;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;",
      "background:linear-gradient(135deg," + cfg.accent_from + "," + cfg.accent_to + ");color:#fff;font-weight:600;font-size:16px}",
      ".body{flex:1;min-width:0}",
      ".line1{font-size:13.5px;font-weight:600;color:#111;line-height:1.3}",
      ".line2{font-size:12.5px;color:#555;line-height:1.35;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".meta{font-size:10px;color:#9aa0a6;margin-top:3px;display:flex;align-items:center;justify-content:space-between;gap:8px}",
      ".meta .time{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".meta .verified{flex:0 0 auto;display:inline-flex;align-items:center;gap:4px}",
      ".meta .check{color:#22c55e;font-weight:700}",
      ".close{position:absolute;top:8px;right:8px;border:none;background:transparent;color:#bbb;font-size:16px;line-height:1;cursor:pointer;padding:2px}",
      ".close:hover{color:#666}",
      "@media (prefers-color-scheme:dark){.card{background:#1c1c1e;border-color:rgba(255,255,255,.08)}",
      ".line1{color:#f5f5f7}.line2{color:#c7c7cc}.meta{color:#8e8e93}}",
    ].join("");
  }

  function render(item) {
    var realName = item.first_name && item.first_name.trim();
    // No real name? Pick a country-appropriate display name (falls back to a
    // diverse international pool when country is unknown). Display-only — never
    // stored anywhere.
    var displayName = realName || pickName(item.country, item.at) || cfg.name_fallback;
    var name = displayName;
    var product = (item.product && item.product.trim()) || cfg.product_fallback;

    // For any Dub row where the product is the generic 'template' fallback
    // (no specific match available), substitute a random real template name
    // from our pool so the popup looks meaningful. Display-only override.
    if (
      item.source === "dub" &&
      /^(a\s+)?template$/i.test(product) &&
      templatePool.length > 0
    ) {
      product = pickFromPool(templatePool, item.at);
    }
    var line1, line2;
    if (item.source === "dub") {
      // Dub = affiliate commission notice; phrasing differs from direct purchases.
      line1 = esc(name) + " has created a website";
      // When no specific template is matched (product is the generic fallback),
      // drop the redundant word to avoid "using our template template.".
      var generic = /^(a\s+)?template$/i.test(product);
      line2 = generic ? "using our template." : "using our " + esc(product) + " template.";
    } else {
      var cn = cfg.show_country ? countryName(item.country) : null;
      line1 = esc(name) + (cn ? ' <span style="font-weight:500">from ' + esc(cn) + "</span>" : "");
      line2 = "purchased " + esc(product);
    }
    var meta = "";
    if (cfg.show_time_ago || cfg.show_verified) {
      var left = cfg.show_time_ago ? '<span class="time">' + esc(timeAgo(item.at)) + "</span>" : '<span class="time"></span>';
      var srcLabel = item.source === "lemonsqueezy" ? "LemonSqueezy"
                   : item.source === "webflow" ? "Webflow"
                   : item.source === "dub" ? "Dub"
                   : null;
      var verifiedText = srcLabel ? "Verified by " + srcLabel : "Verified";
      var right = cfg.show_verified ? '<span class="verified"><span class="check">✓</span> ' + esc(verifiedText) + "</span>" : "";
      meta = '<div class="meta">' + left + right + "</div>";
    }
    card.innerHTML =
      '<div class="avatar">' + esc(name.charAt(0).toUpperCase()) + "</div>" +
      '<div class="body">' +
        '<div class="line1">' + line1 + "</div>" +
        '<div class="line2">' + line2 + "</div>" +
        meta +
      "</div>" +
      '<button class="close" aria-label="Close">×</button>';
    card.querySelector(".close").onclick = function () { stop(); hide(); };
  }

  var showTimer, hideTimer;
  function show() { card.classList.add("show"); }
  function hide() { card.classList.remove("show"); }

  var items = [], idx = 0, running = false;
  function cycle() {
    if (!running || !items.length) return;
    var item = items[idx % items.length];
    idx++;
    render(item);
    show();
    hideTimer = setTimeout(function () {
      hide();
      showTimer = setTimeout(cycle, cfg.interval_ms);
    }, cfg.duration_ms);
  }
  function start() { if (running) return; running = true; cycle(); }
  function stop() { running = false; clearTimeout(showTimer); clearTimeout(hideTimer); }

  function mergeConfig(serverCfg) {
    if (!serverCfg) return;
    Object.keys(cfg).forEach(function (k) {
      if (serverCfg[k] !== undefined && serverCfg[k] !== null) cfg[k] = serverCfg[k];
    });
    // Local overrides win.
    if (localOverrides.position) cfg.position = localOverrides.position;
    if (localOverrides.interval_ms) cfg.interval_ms = localOverrides.interval_ms;
    if (localOverrides.duration_ms) cfg.duration_ms = localOverrides.duration_ms;
  }

  var refreshTimer;
  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(load, Math.max(60000, cfg.refresh_ms || 180000));
  }

  function load() {
    var url = endpoint + (endpoint.indexOf("?") > -1 ? "&" : "?") + "_=" + Date.now();
    if (feedLimit) url += "&limit=" + feedLimit;
    fetch(url)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) return;
        mergeConfig(d.config);
        applyPositionAndTheme();
        if (Array.isArray(d.template_pool)) templatePool = d.template_pool;
        if (cfg.enabled === false) { stop(); hide(); items = []; return; }
        items = (d.items || []).filter(function (x) { return x && x.at; });
        if (items.length) start();
      })
      .catch(function () {})
      .then(scheduleRefresh); // chain next poll using latest cfg.refresh_ms
  }

  applyPositionAndTheme();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
