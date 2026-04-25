"""fetch-chart-data.py
Fetches OHLCV data for XAU and XAG across multiple time ranges.
Primary source: Yahoo Finance (query1.finance.yahoo.com)
Fallback:       stooq.com CSV (no auth required, reliable from CI)
Writes JSON files to chart-data/
"""
import json, urllib.request, urllib.parse, datetime, os, pathlib, time, csv, io

RANGES = [
    ("XAU", "GC%3DF", "XAUUSD", "1mo",  "1d",  "1M"),
    ("XAU", "GC%3DF", "XAUUSD", "3mo",  "1d",  "3M"),
    ("XAU", "GC%3DF", "XAUUSD", "1y",   "1wk", "1Y"),
    ("XAU", "GC%3DF", "XAUUSD", "5y",   "1wk", "5Y"),
    ("XAU", "GC%3DF", "XAUUSD", "10y",  "1mo", "10Y"),
    ("XAG", "SI%3DF", "XAGUSD", "1mo",  "1d",  "1M"),
    ("XAG", "SI%3DF", "XAGUSD", "3mo",  "1d",  "3M"),
    ("XAG", "SI%3DF", "XAGUSD", "1y",   "1wk", "1Y"),
    ("XAG", "SI%3DF", "XAGUSD", "5y",   "1wk", "5Y"),
    ("XAG", "SI%3DF", "XAGUSD", "10y",  "1mo", "10Y"),
]

pathlib.Path("chart-data").mkdir(exist_ok=True)

YAHOO_HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://finance.yahoo.com/",
    "Origin": "https://finance.yahoo.com",
}

# Stooq range/interval mapping
STOOQ_INTERVALS = {
    "1d": "d",
    "1wk": "w",
    "1mo": "m",
}

# Date offsets for stooq 'd' parameter
STOOQ_DAYS = {
    "1M": 35,
    "3M": 95,
    "1Y": 370,
    "5Y": 1830,
    "10Y": 3660,
}

def fetch_yahoo(ticker_encoded, yrange, interval):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker_encoded}?interval={interval}&range={yrange}"
    req = urllib.request.Request(url, headers=YAHOO_HEADERS)
    with urllib.request.urlopen(req, timeout=20) as r:
        raw = json.loads(r.read())
    result = raw["chart"]["result"][0]
    timestamps = result["timestamp"]
    closes = result["indicators"]["quote"][0]["close"]
    valid = [(t, c) for t, c in zip(timestamps, closes) if c is not None]
    lbls = [datetime.datetime.fromtimestamp(t, tz=datetime.timezone.utc).strftime("%Y-%m-%d") for t, _ in valid]
    data = [round(c, 2) for _, c in valid]
    return lbls, data

def fetch_stooq(stooq_symbol, interval_key, label):
    """Fallback: stooq.com daily/weekly/monthly CSV download"""
    period = STOOQ_INTERVALS.get(interval_key, "d")
    days = STOOQ_DAYS.get(label, 370)
    end_dt = datetime.datetime.utcnow()
    start_dt = end_dt - datetime.timedelta(days=days)
    d1 = start_dt.strftime("%Y%m%d")
    d2 = end_dt.strftime("%Y%m%d")
    url = f"https://stooq.com/q/d/l/?s={stooq_symbol.lower()}&d1={d1}&d2={d2}&i={period}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        content = r.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))
    lbls, data = [], []
    for row in reader:
        try:
            lbls.append(row["Date"])
            data.append(round(float(row["Close"]), 2))
        except (KeyError, ValueError):
            continue
    return lbls, data

for metal, ticker_enc, stooq_sym, yrange, interval, label in RANGES:
    fname = f"chart-data/{metal}-{label}.json"
    lbls, data = [], []
    source = "none"

    # --- Try Yahoo Finance first ---
    try:
        lbls, data = fetch_yahoo(ticker_enc, yrange, interval)
        source = "yahoo"
    except Exception as e:
        print(f"  Yahoo WARN {metal}-{label}: {e}")

    # --- Fallback to stooq if Yahoo failed or returned empty ---
    if not data:
        try:
            time.sleep(0.5)  # be polite to stooq
            lbls, data = fetch_stooq(stooq_sym, interval, label)
            source = "stooq"
        except Exception as e:
            print(f"  Stooq WARN {metal}-{label}: {e}")

    if data:
        output = {
            "metal": metal,
            "range": label,
            "source": source,
            "labels": lbls,
            "data": data,
            "updated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        }
        with open(fname, "w") as f:
            json.dump(output, f, separators=(",", ":"))
        print(f"OK [{source}]: {metal}-{label} ({len(data)} pts, last={data[-1]})")
    else:
        # Write empty fallback so chart-data/ always has all expected files
        if not os.path.exists(fname):
            with open(fname, "w") as f:
                json.dump({"metal": metal, "range": label, "source": "none", "labels": [], "data": [], "updated": ""}, f)
        print(f"FAIL: {metal}-{label} — both sources failed, kept existing file")

print("Done.")
