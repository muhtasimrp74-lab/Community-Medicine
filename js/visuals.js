/* Visual identity for chapters and topics: original inline-SVG icons, per-part colour themes, banners and chips.
   No images are downloaded, so it stays tiny, works offline and follows light/dark mode.
   API (window.CMV): hue(part) theme(opts) art(icon) chip(partOrIcon, size) banner(part) ticon(topic, part) */
(function () {
  'use strict';

  /* 24x24 line icons, drawn with stroke="currentColor" (see css/visuals.css) */
  var P = {
    heart: '<path d="M12 20s-8-4.7-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.3 12 20 12 20z"/>',
    people: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14.2A5 5 0 0 1 21 19v1"/>',
    chart: '<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7.5" y="11" width="3" height="6"/><rect x="12.5" y="7" width="3" height="10"/><rect x="17" y="13" width="2.6" height="4"/>',
    chat: '<path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M8 9.5h8M8 12.5h5"/>',
    leaf: '<path d="M5 20C5 11 10 5 20 4c0 10-5 16-13 16"/><path d="M5 20 14 11"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    wind: '<path d="M3 9h11a3 3 0 1 0-3-3"/><path d="M3 14h15a3 3 0 1 1-3 3"/><path d="M3 19h7"/>',
    book: '<path d="M12 6c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2z"/><path d="M12 6v14"/>',
    hardhat: '<path d="M4 16a8 8 0 0 1 16 0"/><path d="M2.5 16h19v2.5h-19z"/><path d="M12 8v8"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    bug: '<ellipse cx="12" cy="14" rx="4.5" ry="6"/><path d="M12 8V5m-2-2 2 2 2-2"/><path d="M7.5 12h-4M7.8 15.5l-3.8 2M7.8 9 4.3 7M16.5 12h4M16.2 15.5l3.8 2M16.2 9l3.5-2"/>',
    shield: '<path d="M12 3 5 6v5c0 5 3 8.5 7 10 4-1.5 7-5 7-10V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    mch: '<circle cx="9" cy="6.5" r="2.8"/><path d="M4 20v-3.5a5 5 0 0 1 10 0V20"/><circle cx="18" cy="14" r="2"/><path d="M16 20v-1.5a2 2 0 0 1 4 0V20"/>',
    pill: '<g transform="rotate(-40 12 12)"><rect x="2.5" y="8.5" width="19" height="7" rx="3.5"/><path d="M12 8.5v7"/></g>',
    apple: '<path d="M12 7c-2-1.5-7-1-7 4.5 0 4.5 3 9 5 9 1.2 0 1.4-.6 2-.6s.8.6 2 .6c2 0 5-4.5 5-9C19 6 14 5.5 12 7z"/><path d="M12 7c0-2 1-3.5 3-4"/>',
    warning: '<path d="M12 3 2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.3"/>',
    virus: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
    building: '<path d="M4 21V8l8-5 8 5v13"/><path d="M2.5 21h19"/><path d="M9 21v-6h6v6"/><path d="M9 11h.01M15 11h.01"/>',
    flask: '<path d="M9.5 3h5"/><path d="M10.5 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2L13.5 9V3"/><path d="M7.5 15h9"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.8 2.8 5.4-5.6"/>',
    pen: '<path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z"/><path d="m14.5 6.5 3 3"/>',
    home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    cross: '<path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>'
  };

  /* one colour (hue 0-360) and one icon per part */
  var PART = {
    1: { h: 340, i: 'heart' },    2: { h: 215, i: 'chart' },    3: { h: 275, i: 'chat' },
    4: { h: 150, i: 'leaf' },     5: { h: 35,  i: 'hardhat' },  6: { h: 190, i: 'globe' },
    7: { h: 12,  i: 'bug' },      8: { h: 320, i: 'mch' },      9: { h: 95,  i: 'apple' },
    10: { h: 255, i: 'warning' }, 11: { h: 172, i: 'virus' }
  };
  /* hue for non-part icons (page headers, tiles) */
  var IHUE = { chart: 215, list: 340, book: 150, pen: 275, check: 172, menu: 255, target: 12, heart: 340, cross: 340,
    bolt: 340, sliders: 215, clock: 35, sparkle: 275, warning: 12, star: 35, search: 190, building: 255, home: 340 };

  /* topic name -> icon (first match wins), falls back to the part icon */
  var RULES = [
    [/arsen|water/i, 'drop'], [/air pollut|ventilat|noise|climate|radiation/i, 'wind'], [/environ|sanitat|waste|housing|excreta/i, 'leaf'],
    [/sampl/i, 'dice'], [/statist|biostat|data|central tend|dispers|probab|distribution|correlat|regress|significance/i, 'chart'],
    [/research|survey|study design|clinical trial|screening/i, 'search'],
    [/communication|health education|counsel|behavio/i, 'chat'], [/school/i, 'book'], [/occupation|industrial|ergonom/i, 'hardhat'],
    [/international|global|who\b|world/i, 'globe'], [/national|programme|program\b|ehp|epi\b/i, 'building'],
    [/arthropod|vector|insect|mosquito|entomolog|fly|flies|lice|mite|tick/i, 'bug'], [/sterili|disinfect|antisep/i, 'flask'],
    [/immun|vaccin|herd|cold chain/i, 'shield'], [/contracept|family planning/i, 'pill'],
    [/maternal|child|mch|antenatal|postnatal|neonat|infant|breastfeed|obstetric/i, 'mch'], [/demograph|fertil|population|census|vital stat/i, 'people'],
    [/food|nutri|diet|vitamin|malnutr|obes/i, 'apple'], [/accident|injur|disaster|emergenc|poison|burn/i, 'warning'],
    [/non-?communicable|ncd|cardio|hypertens|diabet|cancer|stroke|mental/i, 'heart'],
    [/communicable|infect|epidemi|outbreak|surveillance|zoono|tubercul|hiv|aids|hepatit|dengue|malaria/i, 'virus'],
    [/administ|manage|planning|organi[sz]|primary health|health system|financ|hospital/i, 'building'],
    [/health|public|concept|determinant|introduction|history|prevent/i, 'heart']
  ];

  function svg(name, cls) {
    return '<svg' + (cls ? ' class="' + cls + '"' : '') + ' viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (P[name] || P.cross) + '</svg>';
  }
  function hue(part) { return (PART[part] || { h: 340 }).h; }
  function iconOf(part) { return (PART[part] || { i: 'cross' }).i; }

  var V = {
    icon: svg,
    hue: hue,
    /* header theme for hero(): {part:n} or {icon:'chart'} */
    theme: function (o) {
      if (o && o.part && PART[o.part]) return { h: PART[o.part].h, icon: PART[o.part].i };
      if (o && o.icon && P[o.icon]) return { h: IHUE[o.icon] == null ? 340 : IHUE[o.icon], icon: o.icon };
      return null;
    },
    /* big faint watermark icon for headers */
    art: function (icon) { return '<span class="vart" aria-hidden="true">' + svg(icon) + '</span>'; },
    /* rounded icon tile. x = part number or icon name. size: '', 'sm' or 'lg' */
    chip: function (x, size) {
      var n = typeof x === 'number' ? x : null, name = n ? iconOf(n) : x, h = n ? hue(n) : (IHUE[name] == null ? 340 : IHUE[name]);
      return '<span class="vchip' + (size ? ' ' + size : '') + '" style="--h:' + h + '" aria-hidden="true">' + svg(name) + '</span>';
    },
    /* coloured strip with pattern, watermark icon and chip: top of a part card */
    banner: function (n) {
      return '<span class="vbn" aria-hidden="true">' + svg(iconOf(n), 'vbn-art') + '<span class="vbn-n">PART ' + n + '</span>' + V.chip(n, 'lg') + '</span>';
    },
    /* small coloured topic icon for a topic heading */
    ticon: function (topic, part) {
      var i = null, t = String(topic || '');
      for (var k = 0; k < RULES.length; k++) if (RULES[k][0].test(t)) { i = RULES[k][1]; break; }
      return '<svg class="tic" style="--h:' + hue(part) + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (P[i || iconOf(part)] || P.cross) + '</svg>';
    }
  };
  window.CMV = V;
})();
