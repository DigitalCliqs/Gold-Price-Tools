import re, glob

CONSENT = """<!-- Consent Mode v2 defaults - must fire BEFORE AdSense and GA4 -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('consent', 'default', {
    'ad_storage':          'denied',
    'analytics_storage':   'denied',
    'ad_user_data':        'denied',
    'ad_personalization':  'denied',
    'wait_for_update':     500
  });
</script>
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ZPLL52C3K8"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-ZPLL52C3K8');</script>"""

ADSENSE = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8849494330640880" crossorigin="anonymous"></script>'
ADSENSE_BLOCK = '<!-- AdSense publisher script loaded async in head -->\n' + ADSENSE

for fpath in sorted(glob.glob('*.html') + glob.glob('guides/*.html')):
    with open(fpath) as f: c = f.read()
    c = re.sub(r'\n?<script async src="https://www\.googletagmanager\.com/gtag/js\?id=G-ZPLL52C3K8"></script>\n<script>window\.dataLayer[^<]+</script>', '', c)
    c = re.sub(r'<!-- AdSense[^\n]*-->\n' + re.escape(ADSENSE), '', c)
    c = c.replace(ADSENSE, '')
    c = re.sub(r'\n{3,}', '\n\n', c)
    block = CONSENT + '\n' + ADSENSE_BLOCK + '\n'
    m = re.search(r'(<link rel="preconnect" href="https://fonts\.googleapis\.com">)', c)
    if m:
        c = c[:m.start()] + block + c[m.start():]
    else:
        c = c.replace('</head>', block + '</head>', 1)
    with open(fpath, 'w') as f: f.write(c)
    print('OK', fpath)
