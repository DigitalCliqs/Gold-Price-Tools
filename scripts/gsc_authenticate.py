"""
One-time script to authenticate with Google Search Console via OAuth.
Opens a browser window for Google sign-in, then saves a token for future use.
"""
import json
import os
import sys

# Find the credentials file
CREDS_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "client_secret_628941023989-p1dltq98488d20fcuque3149a836ie4i.apps.googleusercontent.com.json"
)
TOKEN_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "gsc_token.json"
)

def main():
    try:
        from google_auth_oauthlib.flow import InstalledAppFlow
    except ImportError:
        print("Installing required packages...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", 
                               "google-auth-oauthlib", "google-api-python-client"])
        from google_auth_oauthlib.flow import InstalledAppFlow

    SCOPES = [
        "https://www.googleapis.com/auth/webmasters.readonly",
        "https://www.googleapis.com/auth/webmasters",
    ]

    if not os.path.exists(CREDS_PATH):
        print(f"ERROR: Credentials file not found at:\n  {CREDS_PATH}")
        sys.exit(1)

    print(f"Using credentials: {os.path.basename(CREDS_PATH)}")
    print(f"Token will be saved to: {TOKEN_PATH}")
    print()
    print("Opening browser for Google sign-in...")
    print("Sign in with: digitalcliqsmarketplace@gmail.com")
    print()

    flow = InstalledAppFlow.from_client_secrets_file(CREDS_PATH, SCOPES)
    creds = flow.run_local_server(port=0)

    # Save the token
    with open(TOKEN_PATH, "w") as f:
        f.write(creds.to_json())

    print()
    print("SUCCESS! Token saved.")
    print(f"Saved to: {TOKEN_PATH}")

    # Quick test
    from googleapiclient.discovery import build
    service = build("searchconsole", "v1", credentials=creds)
    sites = service.sites().list().execute()
    print()
    print("Your Search Console properties:")
    for site in sites.get("siteEntry", []):
        print(f"  - {site['siteUrl']} ({site['permissionLevel']})")

if __name__ == "__main__":
    main()
