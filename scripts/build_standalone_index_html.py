import os
import base64

fonts_dir = os.path.join(os.path.dirname(__file__), "..", "apps", "web", "public", "fonts")

with open(os.path.join(fonts_dir, "FreeSans.woff2"), "rb") as f:
    freesans_b64 = base64.b64encode(f.read()).decode("utf-8")

with open(os.path.join(fonts_dir, "FreeSansBold.woff2"), "rb") as f:
    freesansbold_b64 = base64.b64encode(f.read()).decode("utf-8")

with open(os.path.join(fonts_dir, "Eloquia.woff2"), "rb") as f:
    eloquia_b64 = base64.b64encode(f.read()).decode("utf-8")

poster_b64 = "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"

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Signal — Log in</title>
  <script>
    document.documentElement.classList.add('entry-pending');
    window.__entryFallback = setTimeout(function() {{
      document.documentElement.classList.remove('entry-pending');
    }}, 3500);
  </script>
  <style>
    @font-face {{
      font-family: 'FreeSans';
      font-style: normal;
      font-weight: 400;
      font-display: block;
      src: url('data:font/woff2;base64,{freesans_b64}') format('woff2');
    }}
    @font-face {{
      font-family: 'FreeSans';
      font-style: normal;
      font-weight: 700;
      font-display: block;
      src: url('data:font/woff2;base64,{freesansbold_b64}') format('woff2');
    }}
    @font-face {{
      font-family: 'Eloquia';
      font-style: normal;
      font-weight: 200 800;
      font-display: block;
      src: url('data:font/woff2;base64,{eloquia_b64}') format('woff2-variations');
    }}

    :root {{
      --W:1464; --H:949; --photoW:836; --paneW:628; --cardW:613; --cardH:922;
      --badge-fs:13.60px; --badge-fw:400; --badge-ls:-0.163px; --badge-gap:10px; --badge-dy:0px; --badge-ws:0px;
      --badge-left:34px; --badge-top:684px;
      --hl-lh:1; --hl-wght:578;
      --hl1-fs:69.14px; --hl1-ls:-1.936px; --hl1-ws:0px; --hl1-left:33.00px; --hl1-top:750.02px;
      --hl2-fs:68.95px; --hl2-ls:-1.931px; --hl2-left:32.00px; --hl2-top:831.01px;
      --h1-top:65.00px; --h1-fs:42.55px; --h1-ls:-2.553px; --h1-ws:1.300px; --h1-wght:584;
      --sub-top:120.00px; --sub-fs:20.41px; --sub-ls:-0.245px; --sub-ws:-2.000px; --sub-fw:400; --sub-fwb:700;
      --fieldpad:19px;
      --eph-fs:15.68px; --eph-ls:-0.188px; --eph-left:17.0px; --eph-fw:400; --eph-ws:0px;
      --pph-fs:17.29px; --pph-ls:-0.698px; --pph-left:18px; --pph-fw:400;
      --login-fs:16.38px; --login-fw:400; --login-ls:0.200px; --login-gap:10px; --login-dy:0.00px; --login-padl:-12.00px;
      --arrow-w:13.2px;
      --div-top:477px; --or-fs:11.5px; --or-fw:700; --or-ls:0.8px; --or-dy:2.00px; --or-dx:0.00px;
      --or-line-l:205px; --or-line-r:204px;
      --g-gap:17px; --g-icon:18.5px;
      --gt-fs:18.10px; --gt-fw:400; --gt-ls:-0.217px; --gt-ws:-1.000px; --gt-dy:1.00px;
      --bt-top:611.00px; --bt-fs:16.37px; --bt-fw:400; --bt-ls:-0.196px; --bt-ws:-2.060px; --bt-fwb:700; --bt-uo:3px;
      --card-shadow:1px 10px 14px rgba(10,14,20,0.14), 0 1px 3px rgba(10,14,20,0.05);
      --cs:1;

      --ink:#000;          --h1-color:#2c3343;   --sub-grey:#797979;
      --badge-bg:#2f2a27;  --ph:#606060;         --or:#5a5a5b;
      --gtext:#232424;     --bottom:#0a0a0a;
      --btn1:#283139;      --btn2:#293340;
      --inputFill:#fafafa; --inputBorder:#acacae; --pwFill:#f9f9f9;
      --gBorder:#c8c8ca;   --divider:#b1b1b2;     --page:#fefefe;
    }}

    *, *::before, *::after {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    html, body {{
      height: 100%;
      background: var(--page);
    }}

    body {{
      -webkit-font-smoothing: antialiased;
      text-rendering: geometricPrecision;
      overflow: hidden;
      font-family: 'FreeSans', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
      color: var(--ink);
    }}

    /* Pre-paint guard */
    .entry-pending .card,
    .entry-pending .badge,
    .entry-pending #hl1,
    .entry-pending #hl2,
    .entry-pending #h1,
    .entry-pending #sub,
    .entry-pending #email,
    .entry-pending #pw,
    .entry-pending #loginBtn,
    .entry-pending .divider,
    .entry-pending #gBtn,
    .entry-pending #bottom {{
      opacity: 0;
      will-change: transform, opacity, clip-path;
    }}
    .entry-pending .card {{
      transform: translateY(12px) scale(0.988);
    }}
    .entry-pending .badge {{
      transform: translateY(8px);
    }}
    .entry-pending #hl1,
    .entry-pending #hl2 {{
      transform: translateY(16px);
      clip-path: inset(100% 0 0 0);
    }}
    .entry-pending #h1,
    .entry-pending #sub {{
      transform: translateY(10px);
    }}
    .entry-pending #email,
    .entry-pending #pw,
    .entry-pending #loginBtn,
    .entry-pending #gBtn {{
      transform: translateY(8px);
    }}
    .entry-pending .divider,
    .entry-pending #bottom {{
      transform: translateY(6px);
    }}

    @media (max-width: 699px) {{
      .entry-pending .card {{
        transform: translateY(14px);
      }}
      .entry-pending #hl1,
      .entry-pending #hl2 {{
        transform: translateY(12px);
      }}
    }}

    @media (prefers-reduced-motion: reduce) {{
      * {{
        transition: none !important;
        animation: none !important;
      }}
      .entry-pending .card,
      .entry-pending .badge,
      .entry-pending #hl1,
      .entry-pending #hl2,
      .entry-pending #h1,
      .entry-pending #sub,
      .entry-pending #email,
      .entry-pending #pw,
      .entry-pending #loginBtn,
      .entry-pending .divider,
      .entry-pending #gBtn,
      .entry-pending #bottom {{
        opacity: 1 !important;
        transform: none !important;
        clip-path: none !important;
        will-change: auto !important;
      }}
    }}

    /* Base Layout: Mode A (land) */
    .stage {{
      position: fixed;
      inset: 0;
      overflow: hidden;
    }}

    .photo {{
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      width: 57.1038%;
      overflow: hidden;
    }}

    .photo-img {{
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: 100% 50%;
      display: block;
      -webkit-user-drag: none;
    }}

    .photo-img--tall {{
      display: block;
    }}
    .photo-img--wide {{
      display: none;
    }}

    .scrim {{
      display: none;
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: linear-gradient(180deg, rgba(7,10,13,.02) 18%, rgba(7,10,13,.12) 48%, rgba(7,10,13,.78) 100%);
    }}

    .hero {{
      position: absolute;
      left: 0;
      bottom: 0;
      width: 836px;
      height: 949px;
      transform-origin: left bottom;
      pointer-events: none;
    }}
    .hero > * {{
      pointer-events: auto;
    }}

    .badge {{
      position: absolute;
      left: var(--badge-left);
      top: var(--badge-top);
      display: inline-flex;
      align-items: center;
      gap: var(--badge-gap);
      height: 37px;
      padding: 0 16px 0 19px;
      border-radius: 999px;
      background: var(--badge-bg);
      backdrop-filter: blur(7px) saturate(120%);
      -webkit-backdrop-filter: blur(7px) saturate(120%);
      box-shadow: 0 1px 2px rgba(0,0,0,.18), 0 6px 18px rgba(0,0,0,.14);
      color: #fff;
      white-space: nowrap;
      font-size: var(--badge-fs);
      font-weight: var(--badge-fw);
      letter-spacing: var(--badge-ls);
      word-spacing: var(--badge-ws);
      transform: translateY(var(--badge-dy));
    }}

    .badge-icon {{
      width: 17px;
      height: 16.27px;
      position: relative;
      top: -1px;
      display: inline-block;
      flex-shrink: 0;
    }}

    .hl-wrap {{
      position: relative;
    }}

    .hl {{
      position: absolute;
      font-family: 'Eloquia', sans-serif;
      font-variation-settings: 'wght' var(--hl-wght);
      line-height: var(--hl-lh);
      color: var(--ink);
      white-space: nowrap;
    }}

    #hl1 {{
      left: var(--hl1-left);
      top: var(--hl1-top);
      font-size: var(--hl1-fs);
      letter-spacing: var(--hl1-ls);
      word-spacing: var(--hl1-ws);
    }}

    #hl2 {{
      left: var(--hl2-left);
      top: var(--hl2-top);
      font-size: var(--hl2-fs);
      letter-spacing: var(--hl2-ls);
    }}

    .pane {{
      position: absolute;
      left: 57.1038%;
      right: 0;
      top: 0;
      bottom: 0;
    }}

    .card {{
      position: absolute;
      left: 1px;
      top: 14px;
      width: 613px;
      height: 922px;
      border-radius: 26px;
      overflow: hidden;
      background: rgba(254,254,254,.90);
      backdrop-filter: blur(28px) saturate(160%);
      -webkit-backdrop-filter: blur(28px) saturate(160%);
      border: 1px solid rgba(0,0,0,.036);
      box-shadow: var(--card-shadow);
    }}

    .card-in {{
      position: relative;
      width: 613px;
      height: 922px;
      transform-origin: left top;
    }}

    .col {{
      position: absolute;
      left: 62px;
      width: 488px;
    }}

    .center {{
      text-align: center;
    }}

    #h1 {{
      top: var(--h1-top);
      font-family: 'Eloquia', sans-serif;
      font-variation-settings: 'wght' var(--h1-wght);
      font-size: var(--h1-fs);
      letter-spacing: var(--h1-ls);
      word-spacing: var(--h1-ws);
      color: var(--h1-color);
      line-height: 1.1;
    }}

    #sub {{
      top: var(--sub-top);
      font-size: var(--sub-fs);
      letter-spacing: var(--sub-ls);
      word-spacing: var(--sub-ws);
      font-weight: var(--sub-fw);
      color: var(--sub-grey);
      line-height: 1.35;
    }}
    #sub b {{
      font-weight: var(--sub-fwb);
      color: var(--ink);
    }}

    .field {{
      position: absolute;
      left: 62px;
      width: 489px;
      display: flex;
      align-items: center;
      border-radius: 12px;
    }}

    .field input {{
      width: 100%;
      height: 100%;
      border: none;
      background: transparent;
      outline: none;
      font-family: 'FreeSans', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
      color: var(--ink);
    }}

    #email {{
      top: 203px;
      height: 61px;
      background: var(--inputFill);
      border: 1.5px solid var(--inputBorder);
    }}
    #email input {{
      font-size: var(--eph-fs);
      letter-spacing: var(--eph-ls);
      word-spacing: var(--eph-ws);
      font-weight: var(--eph-fw);
      padding-left: var(--eph-left);
      padding-right: var(--fieldpad);
    }}

    #pw {{
      top: 273.5px;
      height: 59px;
      background: var(--pwFill);
      border: 0;
    }}
    #pw input {{
      font-size: var(--pph-fs);
      letter-spacing: var(--pph-ls);
      font-weight: var(--pph-fw);
      padding-left: var(--pph-left);
      padding-right: var(--fieldpad);
    }}

    .field input::placeholder {{
      color: var(--ph);
      opacity: 1;
    }}

    :focus-visible {{
      outline: 2px solid #2b6cb0;
      outline-offset: 2px;
    }}

    #loginBtn {{
      position: absolute;
      left: 62px;
      top: 366px;
      width: 489px;
      height: 65.5px;
      border-radius: 999px;
      border: none;
      background: linear-gradient(180deg, var(--btn1) 0%, var(--btn2) 100%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--login-gap);
      padding-left: var(--login-padl);
      padding-right: 4px;
      box-shadow: 0 8px 20px rgba(18,26,34,.16), 0 2px 5px rgba(18,26,34,.10);
      cursor: pointer;
      transition: transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s ease, filter .18s ease;
    }}
    #loginBtn:hover {{
      filter: brightness(1.12);
    }}
    #loginBtn:active {{
      transform: translateY(1px);
    }}
    #loginBtn span {{
      font-size: var(--login-fs);
      font-weight: var(--login-fw);
      letter-spacing: var(--login-ls);
      transform: translateY(var(--login-dy));
    }}

    .login-arrow {{
      width: var(--arrow-w);
      height: var(--arrow-w);
      display: block;
    }}

    .divider {{
      position: absolute;
      left: 63px;
      top: var(--div-top);
      width: 487px;
      display: flex;
      align-items: center;
      justify-content: center;
    }}
    .divider i {{
      height: 1.5px;
      background: var(--divider);
      display: block;
    }}
    .divider i:first-child {{
      flex: 0 0 var(--or-line-l);
    }}
    .divider i:last-child {{
      flex: 0 0 var(--or-line-r);
    }}
    .divider b {{
      flex: 1 1 auto;
      text-align: center;
      color: var(--or);
      font-size: var(--or-fs);
      font-weight: var(--or-fw);
      letter-spacing: var(--or-ls);
      transform: translate(var(--or-dx), var(--or-dy));
      white-space: nowrap;
    }}

    #gBtn {{
      position: absolute;
      left: 62px;
      top: 535px;
      width: 489px;
      height: 59.5px;
      border: 1.5px solid var(--gBorder);
      border-radius: 999px;
      background: rgba(255,255,255,.92);
      box-shadow: 0 1px 2px rgba(0,0,0,.03);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--g-gap);
      transition: background .18s ease, box-shadow .18s ease, transform .18s cubic-bezier(.2,.7,.3,1);
    }}
    #gBtn:hover {{
      background: #fff;
      box-shadow: 0 3px 10px rgba(0,0,0,.07);
    }}
    #gBtn:active {{
      transform: translateY(1px);
    }}

    .g-icon {{
      width: var(--g-icon);
      height: var(--g-icon);
      display: block;
    }}

    #gBtn span {{
      font-family: 'FreeSans', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
      font-size: var(--gt-fs);
      font-weight: var(--gt-fw);
      letter-spacing: var(--gt-ls);
      word-spacing: var(--gt-ws);
      color: var(--gtext);
      transform: translateY(var(--gt-dy));
    }}

    #bottom {{
      position: absolute;
      left: 62px;
      width: 489px;
      top: var(--bt-top);
      text-align: center;
      font-size: var(--bt-fs);
      letter-spacing: var(--bt-ls);
      word-spacing: var(--bt-ws);
      font-weight: var(--bt-fw);
      color: var(--bottom);
    }}

    #bottom a {{
      color: #000;
      font-weight: 700;
      text-decoration: underline;
      text-underline-offset: 3px;
      text-decoration-thickness: 2px;
    }}

    /* Mode B: tabport (>=700px, portrait) */
    body.tabport .photo {{
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: var(--band-h);
    }}
    body.tabport .photo-img--tall {{
      display: none;
    }}
    body.tabport .photo-img--wide {{
      display: block;
      object-position: 50% 50%;
    }}
    body.tabport .hero {{
      position: absolute;
      left: var(--tp-hero-side);
      bottom: var(--tp-hero-bot);
      width: auto;
      height: auto;
      transform: none;
      display: flex;
      flex-direction: column;
      gap: var(--tp-hero-gap);
      pointer-events: none;
    }}
    body.tabport .badge {{
      position: static;
      transform: scale(var(--badge-k));
      transform-origin: left bottom;
    }}
    body.tabport .hl-wrap {{
      position: static;
      width: var(--tp-hl-measure);
    }}
    body.tabport .hl {{
      position: static;
      display: inline;
      white-space: normal;
      font-size: var(--tp-hero-fs);
      line-height: var(--tp-hero-lh);
    }}
    body.tabport #hl1,
    body.tabport #hl2 {{
      position: static;
      left: auto;
      top: auto;
    }}
    body.tabport .pane {{
      position: absolute;
      left: 0;
      right: 0;
      top: var(--band-h);
      bottom: var(--footer-h);
      padding: 0 var(--tp-side-margin);
    }}
    body.tabport .card {{
      position: relative;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      border-radius: 26px;
      overflow: hidden;
    }}
    body.tabport .card-in {{
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      transform: none;
    }}
    body.tabport .col,
    body.tabport .field,
    body.tabport #loginBtn,
    body.tabport #gBtn,
    body.tabport #bottom {{
      left: var(--tp-pad);
      width: calc(100% - (var(--tp-pad) * 2));
    }}
    body.tabport .divider {{
      left: var(--tp-or-pad);
      width: calc(100% - (var(--tp-or-pad) * 2));
    }}
    body.tabport #h1 {{
      top: var(--tp-h1-top);
      font-size: var(--tp-h1-fs);
      letter-spacing: calc(var(--h1-ls) / var(--h1-fs) * var(--tp-h1-fs));
    }}
    body.tabport #sub {{
      top: var(--tp-sub-top);
      font-size: var(--tp-sub-fs);
      letter-spacing: calc(var(--sub-ls) / var(--sub-fs) * var(--tp-sub-fs));
    }}
    body.tabport #email {{
      top: var(--tp-em-top);
      height: var(--tp-em-h);
      border-radius: var(--tp-em-r);
    }}
    body.tabport #email input {{
      font-size: var(--tp-eph-fs);
      padding-left: var(--tp-eph-pad);
      letter-spacing: calc(var(--eph-ls) / var(--eph-fs) * var(--tp-eph-fs));
    }}
    body.tabport #pw {{
      top: var(--tp-pw-top);
      height: var(--tp-pw-h);
      border-radius: var(--tp-em-r);
    }}
    body.tabport #pw input {{
      font-size: var(--tp-eph-fs);
      padding-left: var(--tp-eph-pad);
      letter-spacing: calc(var(--pph-ls) / var(--pph-fs) * var(--tp-eph-fs));
    }}
    body.tabport #loginBtn {{
      top: var(--tp-btn-top);
      height: var(--tp-btn-h);
      font-size: var(--tp-btn-fs);
      letter-spacing: calc(var(--login-ls) / var(--login-fs) * var(--tp-btn-fs));
      gap: var(--tp-btn-gap);
    }}
    body.tabport .login-arrow {{
      width: var(--tp-arrow);
      height: var(--tp-arrow);
    }}
    body.tabport .divider {{
      top: var(--tp-div-top);
      height: var(--tp-div-h);
    }}
    body.tabport .divider i {{
      height: var(--tp-div-h);
      flex: 1 1 auto;
    }}
    body.tabport .divider b {{
      font-size: var(--tp-or-fs);
    }}
    body.tabport #gBtn {{
      top: var(--tp-g-top);
      height: var(--tp-g-h);
      gap: var(--tp-g-gap);
    }}
    body.tabport .g-icon {{
      width: var(--tp-g-icon);
      height: var(--tp-g-icon);
    }}
    body.tabport #gBtn span {{
      font-size: var(--tp-gt-fs);
      letter-spacing: calc(var(--gt-ls) / var(--gt-fs) * var(--tp-gt-fs));
    }}
    body.tabport #bottom {{
      top: var(--tp-bt-top);
      font-size: var(--tp-bt-fs);
      letter-spacing: calc(var(--bt-ls) / var(--bt-fs) * var(--tp-bt-fs));
    }}

    /* Mode C: phone (<700px) */
    @media (max-width: 699px) {{
      :root {{
        --mobile-hero-h: clamp(244px, 34svh, 304px);
      }}
      body.stacked {{
        height: auto;
        min-height: 100%;
        overflow-y: auto;
        background: #fff;
      }}
      body.stacked .stage {{
        position: relative;
        min-height: 100svh;
        display: flex;
        flex-direction: column;
        overflow: visible;
      }}
      body.stacked .photo {{
        position: relative;
        width: 100%;
        height: var(--mobile-hero-h);
        overflow: hidden;
        flex-shrink: 0;
      }}
      body.stacked .photo-img--tall {{
        display: none;
      }}
      body.stacked .photo-img--wide {{
        display: block;
        object-position: 64% 48%;
        transform: scale(1.015);
      }}
      body.stacked .scrim {{
        display: block;
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(7,10,13,.02) 18%, rgba(7,10,13,.12) 48%, rgba(7,10,13,.78) 100%);
      }}
      body.stacked .hero {{
        position: absolute;
        left: 24px;
        bottom: 20px;
        width: calc(100% - 48px);
        height: auto;
        transform: none;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      }}
      body.stacked .badge {{
        position: static;
        height: 31px;
        padding: 0 12px;
        background: rgba(24,27,30,.82);
        box-shadow: 0 4px 16px rgba(0,0,0,.18);
        font-size: 11px;
        align-self: flex-start;
      }}
      body.stacked .hl-wrap {{
        position: static;
        display: flex;
        flex-direction: column;
      }}
      body.stacked .hl {{
        position: static;
        display: block;
        color: #fff;
        font-size: clamp(30px, 8.8vw, 38px);
        letter-spacing: -.035em;
        line-height: .96;
        text-shadow: 0 2px 18px rgba(0,0,0,.32);
        white-space: normal;
      }}
      body.stacked #hl1,
      body.stacked #hl2 {{
        left: auto;
        top: auto;
      }}
      body.stacked .pane {{
        position: relative;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        width: 100%;
        height: auto;
        flex: 1 1 auto;
      }}
      body.stacked .card {{
        position: relative;
        left: 0;
        top: 0;
        width: 100%;
        margin: -28px 0 0;
        border-radius: 28px 28px 0 0;
        background: #fff;
        border: 0;
        box-shadow: 0 -10px 28px rgba(20,28,36,.10);
        min-height: calc(100svh - var(--mobile-hero-h) + 28px);
        height: auto;
        overflow: visible;
      }}
      body.stacked .card-in {{
        position: relative;
        width: 100%;
        max-width: 500px;
        height: auto;
        margin: 0 auto;
        padding: 36px clamp(24px, 7vw, 38px) max(30px, env(safe-area-inset-bottom));
        display: flex;
        flex-direction: column;
        justify-content: center;
        box-sizing: border-box;
        transform: none;
      }}
      body.stacked .col,
      body.stacked .field,
      body.stacked #loginBtn,
      body.stacked .divider,
      body.stacked #gBtn,
      body.stacked #bottom {{
        position: static;
        left: auto;
        top: auto;
        width: 100%;
      }}
      body.stacked #h1 {{
        font-size: clamp(31px, 8.8vw, 38px);
        margin: 0 0 8px 0;
        text-align: center;
      }}
      body.stacked #sub {{
        font-size: 15px;
        margin: 0 0 24px 0;
        text-align: center;
      }}
      body.stacked .field input {{
        font-size: 16px;
      }}
      body.stacked #email {{
        height: 56px;
        margin-bottom: 12px;
      }}
      body.stacked #pw {{
        height: 56px;
        margin-bottom: 24px;
      }}
      body.stacked #loginBtn {{
        height: 58px;
        margin-bottom: 20px;
        padding-left: 0;
      }}
      body.stacked .divider {{
        margin-bottom: 20px;
      }}
      body.stacked .divider i {{
        flex: 1 1 auto;
      }}
      body.stacked #gBtn {{
        height: 56px;
        margin-bottom: 28px;
      }}
      body.stacked #bottom {{
        font-size: 14px;
        text-align: center;
        margin: 0;
      }}
    }}

    @media (max-width: 370px) {{
      :root {{
        --mobile-hero-h: 232px;
      }}
      body.stacked .card-in {{
        padding: 24px 18px max(24px, env(safe-area-inset-bottom));
      }}
      body.stacked .hl {{
        font-size: 30px;
      }}
    }}

    @media (max-height: 520px) and (orientation: landscape) {{
      :root {{
        --mobile-hero-h: 208px;
      }}
      body.stacked .card-in {{
        justify-content: flex-start;
      }}
    }}
  </style>
</head>
<body class="land">
  <div class="stage" id="stage">
    <section class="photo" id="photo">
      <video class="photo-img photo-img--tall" autoplay muted loop playsinline preload="auto" poster="data:image/webp;base64,{poster_b64}">
        <source src="falcon.mp4" type="video/mp4">
      </video>
      <video class="photo-img photo-img--wide" aria-hidden="true" autoplay muted loop playsinline preload="auto" poster="data:image/webp;base64,{poster_b64}">
        <source src="falcon.mp4" type="video/mp4">
      </video>
      <div class="scrim"></div>
      <div class="hero" id="hero">
        <div class="badge">
          <svg class="badge-icon" viewBox="0 0 582 557" aria-hidden="true">
            <path fill="#fff" fill-rule="evenodd" d="M449.0 0.0 435.0 0.0 415.0 10.0 200.0 249.0 187.0 276.0 189.0 299.0 212.0 326.0 232.0 332.0 289.0 334.0 289.0 516.0 301.0 543.0 324.0 556.0 346.0 556.0 374.0 536.0 573.0 311.0 582.0 288.0 579.0 264.0 559.0 240.0 539.0 233.0 478.0 230.0 478.0 32.0 470.0 13.0ZM442.0 38.0 446.0 250.0 466.0 267.0 540.0 270.0 547.0 285.0 341.0 520.0 332.0 522.0 324.0 514.0 321.0 314.0 307.0 300.0 295.0 297.0 233.0 297.0 224.0 291.0 221.0 282.0ZM1.0 67.0 4.0 81.0 17.0 90.0 216.0 90.0 223.0 87.0 232.0 74.0 228.0 57.0 215.0 49.0 18.0 49.0 5.0 57.0ZM0.0 285.0 4.0 300.0 17.0 308.0 105.0 308.0 118.0 299.0 121.0 291.0 119.0 278.0 111.0 270.0 103.0 267.0 17.0 267.0 4.0 275.0ZM1.0 495.0 4.0 511.0 10.0 517.0 23.0 520.0 179.0 520.0 191.0 516.0 200.0 500.0 196.0 488.0 182.0 479.0 18.0 479.0 9.0 483.0Z"/>
          </svg>
          <span id="badgeTxt">Built for fast-moving teams</span>
        </div>
        <div class="hl-wrap">
          <span class="hl" id="hl1">Find Signal to Action</span>
          <span class="hl" id="hl2">Instantly</span>
        </div>
      </div>
    </section>
    <section class="pane" id="pane">
      <div class="card" id="card">
        <div class="card-in" id="cardIn">
          <h1 class="col center" id="h1">Welcome Back!</h1>
          <p class="col center" id="sub"><b>Log in</b> to continue monitoring your signals.</p>
          <div class="field" id="email">
            <input type="email" autocomplete="email" aria-label="Email address" placeholder="Eg. johndoe@gmail.com">
          </div>
          <div class="field" id="pw">
            <input type="password" autocomplete="current-password" aria-label="Password" placeholder="Password">
          </div>
          <button type="button" id="loginBtn">
            <span>Login</span>
            <svg class="login-arrow" viewBox="0 0 22 22" aria-hidden="true">
              <path d="M3 11h15.4M11 3.3l7.7 7.7-7.7 7.7" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            </svg>
          </button>
          <div class="divider">
            <i></i><b>OR</b><i></i>
          </div>
          <button type="button" id="gBtn">
            <svg class="g-icon" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
              <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
              <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"/>
              <path fill="#EA4335" d="M24 9.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 3.18 29.93 1 24 1 15.4 1 7.96 5.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
            </svg>
            <span>Sign in with Google</span>
          </button>
          <p id="bottom">Don&#8217;t have an account? <a href="/">Start Free</a></p>
        </div>
      </div>
    </section>
  </div>

  <script>
    (function() {{
      var REF_W=1464, REF_H=949, PHOTO_W=836, PANE_W=628, CARD_W=613, CARD_H=922;
      var CONTENT_H=697;
      var IMG_W=1177, IMG_H=1336, IMG_REF_SCALE=836/1177;
      var PANE_RATIO=PANE_W/REF_W;
      var HERO_W=681, HERO_H=219;
      var REF_CARD_ASPECT=692/855;
      var RAMP_HI=1280, RAMP_LO=1000, PHOTO_MIN=0.42;
      var RAMP_LO2=820, PHOTO_MIN2=0.36;
      var TP={{"pad":0.1076,"h1Top":0.08656,"h1Fs":0.06839,"subTop":0.17368,"subFs":0.0309,"emTop":0.25435,"emH":0.10257,"emR":0.0202,"ephFs":0.02702,"ephPad":0.0332,"pwTop":0.36851,"pwH":0.10839,"btnTop":0.50435,"btnH":0.10981,"btnFs":0.0275,"arrow":0.026,"btnGap":0.02,"divTop":0.68222,"orFs":0.02245,"orPad":0.051,"divH":0.0026,"gTop":0.76445,"gH":0.09966,"gIcon":0.032,"gtFs":0.03205,"gGap":0.026,"btTop":0.89668,"btFs":0.02876,"badgeH":0.0742,"heroLh":1.1246,"heroBot":0.06493,"heroGap":-0.30423,"heroSide":0.0525,"heroFs":0.1058}};

      var mqLandscape = window.matchMedia('(min-width:700px) and (min-aspect-ratio:51/50)');
      var mqPortrait  = window.matchMedia('(min-width:700px) and (max-aspect-ratio:51/50)');

      var photo = document.getElementById('photo');
      var pane = document.getElementById('pane');
      var card = document.getElementById('card');
      var cardIn = document.getElementById('cardIn');
      var hero = document.getElementById('hero');

      var currentMode = '';

      function clearInline() {{
        if (photo) photo.style.cssText = '';
        if (pane) pane.style.cssText = '';
        if (card) card.style.cssText = '';
        if (cardIn) cardIn.style.cssText = '';
        if (hero) hero.style.cssText = '';
      }}

      function setMode(mode) {{
        if (currentMode !== mode) {{
          clearInline();
          document.body.classList.remove('land', 'tabport', 'stacked');
          document.body.classList.add(mode);
          currentMode = mode;
        }}
      }}

      function photoRatio(vw) {{
        var base = 1 - PANE_RATIO;
        if (vw >= RAMP_HI) return base;
        if (vw >= RAMP_LO) {{
          var t = (vw - RAMP_LO) / (RAMP_HI - RAMP_LO);
          return PHOTO_MIN + t * (base - PHOTO_MIN);
        }}
        if (vw >= RAMP_LO2) {{
          var t2 = (vw - RAMP_LO2) / (RAMP_LO - RAMP_LO2);
          return PHOTO_MIN2 + t2 * (PHOTO_MIN - PHOTO_MIN2);
        }}
        return PHOTO_MIN2;
      }}

      function headlineMeasure() {{
        var span = document.createElement('span');
        span.style.fontFamily = "'Eloquia', sans-serif";
        span.style.fontSize = getComputedStyle(document.documentElement).getPropertyValue('--tp-hero-fs');
        span.style.letterSpacing = '-1.936px';
        span.style.wordSpacing = '0px';
        span.style.fontVariationSettings = "'wght' 578";
        span.style.position = 'absolute';
        span.style.visibility = 'hidden';
        span.style.whiteSpace = 'nowrap';
        span.textContent = 'Find Signal to Action Instantly';
        document.body.appendChild(span);
        var w = span.getBoundingClientRect().width;
        document.body.removeChild(span);
        return w;
      }}

      function toKebab(str) {{
        return str.replace(/([A-Z])/g, "-$1").toLowerCase();
      }}

      function layout() {{
        var vw = window.innerWidth;
        var vh = window.innerHeight;

        if (vw < 700) {{
          setMode('stacked');
          return;
        }}

        if (mqLandscape.matches) {{
          setMode('land');
          var pr = photoRatio(vw);
          var photoW = Math.round(vw * pr);
          var paneW = vw - photoW;

          if (photo) {{
            photo.style.width = photoW + 'px';
            photo.style.left = '0px';
            photo.style.top = '0px';
            photo.style.height = '100%';
          }}
          if (pane) {{
            pane.style.left = photoW + 'px';
            pane.style.width = paneW + 'px';
          }}

          var cs = Math.min(paneW / PANE_W, vh / CONTENT_H);
          var gapL = 1 * cs;
          var mT = 14 * cs;
          var mB = 13 * cs;
          var mR = 14 * cs;
          var cw = Math.max(CARD_W * cs, paneW - gapL - mR);
          var ch = vh - mT - mB;

          if (card) {{
            card.style.left = gapL + 'px';
            card.style.top = mT + 'px';
            card.style.width = cw + 'px';
            card.style.height = ch + 'px';
            card.style.borderRadius = (26 * cs) + 'px';
            card.style.borderWidth = Math.max(1, cs) + 'px';
          }}
          if (cardIn) {{
            cardIn.style.transform = 'translate(' + ((cw - CARD_W * cs) / 2) + 'px,0) scale(' + cs + ')';
          }}
          document.documentElement.style.setProperty('--cs', String(cs));

          var imgScale = Math.max(photoW / IMG_W, vh / IMG_H);
          var s = Math.min(imgScale / IMG_REF_SCALE, (photoW * 0.92) / HERO_W);
          if (hero) {{
            hero.style.transform = 'scale(' + s + ')';
            hero.style.transformOrigin = 'left bottom';
            hero.style.bottom = '0px';
          }}
        }} else {{
          setMode('tabport');
          var band = Math.round(vh * 0.425);
          var sideMargin = Math.round(vw * 0.0525);
          var footer = Math.round(vh * 0.0297);

          document.documentElement.style.setProperty('--band-h', band + 'px');
          document.documentElement.style.setProperty('--footer-h', footer + 'px');
          document.documentElement.style.setProperty('--tp-side-margin', sideMargin + 'px');

          var badgeK = (band * TP.badgeH) / 37;
          document.documentElement.style.setProperty('--badge-k', String(badgeK));
          document.documentElement.style.setProperty('--tp-hero-side', sideMargin + 'px');
          document.documentElement.style.setProperty('--tp-hero-bot', (band * TP.heroBot) + 'px');
          document.documentElement.style.setProperty('--tp-hero-gap', (band * TP.heroGap) + 'px');
          document.documentElement.style.setProperty('--tp-hero-lh', String(TP.heroLh));
          var heroFs = band * TP.heroFs;
          document.documentElement.style.setProperty('--tp-hero-fs', heroFs + 'px');

          var m = headlineMeasure();
          document.documentElement.style.setProperty('--tp-hl-measure', Math.round(m * 0.61) + 'px');

          var cardW = vw - sideMargin * 2;
          var cardH = vh - band - footer;
          var S = Math.min(cardH, cardW * REF_CARD_ASPECT);

          for (var key in TP) {{
            if (!Object.prototype.hasOwnProperty.call(TP, key)) continue;
            var val = TP[key];
            var cssKey = '--tp-' + toKebab(key);
            var computedVal;

            if (['h1Top','subTop','emTop','emH','pwTop','pwH','btnTop','btnH','divTop','divH','gTop','gH','btTop'].indexOf(key) !== -1) {{
              computedVal = (cardH * val) + 'px';
            }} else if (['pad','orPad'].indexOf(key) !== -1) {{
              computedVal = (cardW * val) + 'px';
            }} else if (key === 'badgeH' || key === 'heroFs') {{
              computedVal = (band * val) + 'px';
            }} else if (key === 'heroLh') {{
              computedVal = String(val);
            }} else if (['heroBot','heroGap','heroSide'].indexOf(key) !== -1) {{
              computedVal = (band * val) + 'px';
            }} else {{
              computedVal = (S * val) + 'px';
            }}
            document.documentElement.style.setProperty(cssKey, computedVal);
          }}
        }}
      }}

      function releaseEntrance() {{
        clearTimeout(window.__entryFallback);
        document.documentElement.classList.remove('entry-pending');
      }}

      function runEntrance() {{
        if (window.__entryRan) return;
        window.__entryRan = true;

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !Element.prototype.animate) {{
          releaseEntrance();
          return;
        }}

        var compact = window.matchMedia('(max-width:699px)').matches;
        var ease = 'cubic-bezier(.16,1,.3,1)';
        var softEase = 'cubic-bezier(.22,1,.36,1)';

        var items = [
          {{ el: document.querySelector('.card'), delay: 40, duration: 820, easing: ease, from: {{ opacity: 0, transform: compact ? 'translateY(14px)' : 'translateY(12px) scale(.988)' }}, to: {{ opacity: 1, transform: 'none' }} }},
          {{ el: document.querySelector('.badge'), delay: 120, duration: 480, easing: softEase, from: {{ opacity: 0, transform: 'translateY(8px)' }}, to: {{ opacity: 1, transform: 'none' }} }},
          {{ el: document.querySelector('#hl1'), delay: 240, duration: 760, easing: ease, from: {{ opacity: 0, transform: compact ? 'translateY(12px)' : 'translateY(16px)', clipPath: 'inset(100% 0 0 0)' }}, to: {{ opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' }} }},
          {{ el: document.querySelector('#hl2'), delay: 330, duration: 760, easing: ease, from: {{ opacity: 0, transform: compact ? 'translateY(12px)' : 'translateY(16px)', clipPath: 'inset(100% 0 0 0)' }}, to: {{ opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' }} }},
          {{ el: document.querySelector('#h1'), delay: 470, duration: 620, easing: ease, from: {{ opacity: 0, transform: 'translateY(10px)' }}, to: {{ opacity: 1, transform: 'none' }} }},
          {{ el: document.querySelector('#sub'), delay: 570, duration: 560, easing: ease, from: {{ opacity: 0, transform: 'translateY(10px)' }}, to: {{ opacity: 1, transform: 'none' }} }},
          {{ el: document.querySelector('#email'), delay: 720, duration: 520, easing: softEase, from: {{ opacity: 0, transform: 'translateY(8px)' }}, to: {{ opacity: 1, transform: 'none' }} }},
          {{ el: document.querySelector('#pw'), delay: 790, duration: 520, easing: softEase, from: {{ opacity: 0, transform: 'translateY(8px)' }}, to: {{ opacity: 1, transform: 'none' }} }},
          {{ el: document.querySelector('#loginBtn'), delay: 930, duration: 560, easing: ease, from: {{ opacity: 0, transform: 'translateY(8px)' }}, to: {{ opacity: 1, transform: 'none' }} }},
          {{ el: document.querySelector('.divider'), delay: 1060, duration: 440, easing: softEase, from: {{ opacity: 0, transform: 'translateY(6px)' }}, to: {{ opacity: 1, transform: 'none' }} }},
          {{ el: document.querySelector('#gBtn'), delay: 1150, duration: 540, easing: ease, from: {{ opacity: 0, transform: 'translateY(8px)' }}, to: {{ opacity: 1, transform: 'none' }} }},
          {{ el: document.querySelector('#bottom'), delay: 1260, duration: 500, easing: softEase, from: {{ opacity: 0, transform: 'translateY(6px)' }}, to: {{ opacity: 1, transform: 'none' }} }}
        ];

        var animations = [];
        items.forEach(function(item) {{
          if (item.el) {{
            animations.push(item.el.animate([item.from, item.to], {{
              delay: item.delay,
              duration: item.duration,
              easing: item.easing,
              fill: 'both'
            }}));
          }}
        }});

        document.documentElement.classList.remove('entry-pending');

        Promise.allSettled(animations.map(function(a) {{ return a.finished; }})).then(function() {{
          animations.forEach(function(a) {{ a.cancel(); }});
          animations.length = 0;
          releaseEntrance();
        }});
      }}

      layout();
      window.addEventListener('resize', layout, {{ passive: true }});
      window.addEventListener('orientationchange', layout);
      if (mqLandscape.addEventListener) {{
        mqLandscape.addEventListener('change', layout);
        mqPortrait.addEventListener('change', layout);
      }}

      if (document.fonts) {{
        Promise.race([
          document.fonts.ready,
          new Promise(function(r) {{ setTimeout(r, 650); }})
        ]).then(function() {{
          requestAnimationFrame(function() {{
            requestAnimationFrame(function() {{
              layout();
              runEntrance();
            }});
          }});
        }});
      }} else {{
        setTimeout(function() {{
          layout();
          runEntrance();
        }}, 50);
      }}
    }})();
  </script>
</body>
</html>
"""

# Output paths
root_index = os.path.join(os.path.dirname(__file__), "..", "index.html")
web_public_login = os.path.join(os.path.dirname(__file__), "..", "apps", "web", "public", "login.html")

with open(root_index, "w", encoding="utf-8") as f:
    f.write(html_content)

with open(web_public_login, "w", encoding="utf-8") as f:
    f.write(html_content)

print("Generated self-contained index.html and apps/web/public/login.html successfully!")
