import subprocess

def run_cmd(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True)

res = run_cmd("git push origin feature/issue-133-gold-silver-ratio")
print(res.stdout)
print(res.stderr)
