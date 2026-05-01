import subprocess
import os

token = os.environ.get('GITHUB_TOKEN')
cmd = f"curl -s -X POST -H 'Authorization: token {token}' -d '{{\"title\": \"feat: Add /gold-rates-today landing page (WP-48)\", \"head\": \"jules-15626985237826672352-60928680\", \"base\": \"main\", \"body\": \"Closes #57\\n\\n- Create gold-rates-today.html based on index.html\\n- Update H1, hero description and schemas for the target keyword\\n- Set up clean URL routing in _redirects\\n- Add to sitemap.xml\\n- Add new page to main navigation links across the site\"}}' https://api.github.com/repos/DigitalCliqs/Gold-Price-Tools/pulls"

result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
print(result.stdout)
