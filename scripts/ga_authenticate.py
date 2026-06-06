"""
One-time script to set up Application Default Credentials (ADC) for Google Analytics MCP.
Opens a browser window for Google sign-in, then saves ADC credentials.
"""
import json
import os
import sys

CREDS_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "client_secret_628941023989-p1dltq98488d20fcuque3149a836ie4i.apps.googleusercontent.com.json"
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
        "https://www.googleapis.com/auth/analytics.readonly",
        "https://www.googleapis.com/auth/cloud-platform",
    ]

    if not os.path.exists(CREDS_PATH):
        print(f"ERROR: Credentials file not found at:\n  {CREDS_PATH}")
        sys.exit(1)

    # Read the client secrets to get client_id and client_secret
    with open(CREDS_PATH) as f:
        client_config = json.load(f)

    installed = client_config.get("installed", {})
    client_id = installed.get("client_id", "")
    client_secret = installed.get("client_secret", "")

    print(f"Using credentials: {os.path.basename(CREDS_PATH)}")
    print()
    print("Opening browser for Google sign-in...")
    print("Sign in with: digitalcliqsmarketplace@gmail.com")
    print()

    flow = InstalledAppFlow.from_client_secrets_file(CREDS_PATH, SCOPES)
    creds = flow.run_local_server(port=0)

    # Save as Application Default Credentials format
    adc_dir = os.path.join(os.path.expanduser("~"), "AppData", "Roaming", "gcloud")
    os.makedirs(adc_dir, exist_ok=True)
    adc_path = os.path.join(adc_dir, "application_default_credentials.json")

    adc_data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": creds.refresh_token,
        "type": "authorized_user",
    }

    with open(adc_path, "w") as f:
        json.dump(adc_data, f, indent=2)

    print()
    print("SUCCESS! Application Default Credentials saved.")
    print(f"Saved to: {adc_path}")
    print()
    print("The Google Analytics MCP server can now authenticate automatically.")

if __name__ == "__main__":
    main()
