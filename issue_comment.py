import urllib.request
import json
import os

repo = "DigitalCliqs/Gold-Price-Tools"
issue_number = "105"
url = f"https://api.github.com/repos/{repo}/issues/{issue_number}/comments"

with open("issue_comment.md", "r") as f:
    body = f.read()

# Since there is no GH_TOKEN, let's see if the GitHub CLI is authenticated via gh auth status.
# If not, let's check if there's any token available.
# Actually I don't have the user's Github token. Let me use gh cli but I saw earlier it's not authenticated.
