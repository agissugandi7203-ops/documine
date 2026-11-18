import os

html_template = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Signal — Log in</title>
  <style>
    @font-face {
      font-family: 'FreeSans';
      font-style: normal;
      font-weight: 400;
      font-display: block;
      src: url('/fonts/FreeSans.woff2') format('woff2');
    }
    @font-face {
      font-family: 'FreeSans';
      font-style: normal;
      font-weight: 700;
      font-display: block;
      src: url('/fonts/FreeSansBold.woff2') format('woff2');
    }
    @font-face {
      font-family: 'Eloquia';
      font-style: normal;
      font-weight: 200 800;
      font-display: block;
      src: url('/fonts/Eloquia.woff2') format('woff2-variations');
    }
    /* CSS_PLACEHOLDER */
  </style>
</head>
<body>
  <div class="login-stage" id="stage">
    <!-- 1) Fixed Full-screen Video Background -->
    <div class="photo" aria-hidden="true">
      <video class="photo-img" autoplay muted loop playsinline preload="auto">
        <source src="/falcon.mp4" type="video/mp4">
      </video>
      <div class="scrim"></div>
    </div>

    <!-- 2) Back Button -->
    <a href="/" class="back-btn" aria-label="Back to home">
      <svg class="back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      <span>Back</span>
    </a>

    <!-- 3) Main Responsive Container -->
    <div class="login-container">
      <div class="hero" id="hero">
        <div class="hl-wrap">
          <span class="hl" id="hl1">Find Signal to Action</span>
          <span class="hl" id="hl2">Instantly</span>
        </div>
      </div>

      <div class="pane" id="pane">
        <div class="login-card" id="card">
          <div class="card-in" id="cardIn">
            <h1 class="card-h1" id="h1">Welcome Back!</h1>
            <p class="card-sub" id="sub"><b>Log in</b> to continue monitoring your signals.</p>

            <div className="field" id="email" style="display:flex;align-items:center;height:56px;border-radius:12px;margin-bottom:14px;background:#fafafa;border:1.5px solid #acacae;padding:0 18px;">
              <input type="email" autocomplete="email" aria-label="Email address" placeholder="Eg. johndoe@gmail.com" style="width:100%;height:100%;border:none;background:transparent;outline:none;font-size:16px;">
            </div>

            <div className="field" id="pw" style="display:flex;align-items:center;height:56px;border-radius:12px;margin-bottom:22px;background:#f9f9f9;border:1.5px solid #acacae;padding:0 18px;">
              <input type="password" autocomplete="current-password" aria-label="Password" placeholder="Password" style="width:100%;height:100%;border:none;background:transparent;outline:none;font-size:16px;">
            </div>

            <button type="button" id="loginBtn">
              <span>Login</span>
              <svg class="login-arrow" viewBox="0 0 22 22" aria-hidden="true">
                <path d="M3 11h15.4M11 3.3l7.7 7.7-7.7 7.7" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              </svg>
            </button>

            <div class="login-divider">
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
      </div>
    </div>
  </div>
</body>
</html>
"""

css_path = os.path.join(os.path.dirname(__file__), "..", "apps", "web", "app", "login", "login.css")
with open(css_path, "r", encoding="utf-8") as f:
    css_content = f.read()

# Filter out font face from login.css to avoid duplicating
font_face_idx = css_content.find(":root {")
if font_face_idx != -1:
    css_rules = css_content[font_face_idx:]
else:
    css_rules = css_content

full_html = html_template.replace("/* CSS_PLACEHOLDER */", css_rules)

pub_login = os.path.join(os.path.dirname(__file__), "..", "apps", "web", "public", "login.html")
root_login = os.path.join(os.path.dirname(__file__), "..", "login.html")

with open(pub_login, "w", encoding="utf-8") as f:
    f.write(full_html)

with open(root_login, "w", encoding="utf-8") as f:
    f.write(full_html)

print("Synchronized public/login.html and root login.html successfully!")
