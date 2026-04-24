import json, urllib.request, datetime, os, pathlib

RANGES = [
    ("XAU", "GC%3DF", "1mo",  "1d",  "1M"),
    ("XAU", "GC%3DF", "3mo",  "1d",  "3M"),
    ("XAU", "GC%3DF", "1y",   "1wk", "1Y"),
    ("XAU", "GC%3DF", "5y",   "1wk", "5Y"),
    ("XAU", "GC%3DF", "10y",  "1mo", "10Y"),
    ("XAG", "SI%3DF", "1mo",  "1d",  "1M"),
    ("XAG", "SI%3DF", "3mo",  "1d",  "3M"),
    ("XAG", "SI%3DF", "1y",   "1wk", "1Y"),
    ("XAG", "SI%3DF", "5y",   "1wk", "5Y"),
    ("XAG", "SI%3DF", "10y",  "1mo", "10Y"),
]

pathlib.Path("chart-data").mkdir(exist_ok=True)
headers = {"User-Agent": "Mozilla/5.0 (compatible; GoldPriceTools/1.0)"}

for metal, ticker, yrange, interval, label in RANGES:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval={interval}&range={yrange}"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as r:
            raw = json.loads(r.read())
        result = raw["chart"]["result"][0]
        timestamps = result["timestamp"]
        closes = result["indicators"]["quote"][0]["close"]
        valid = [(t, c) for t, c in zip(timestamps, closes) if c is not None]
        lbls = [datetime.datetime.fromtimestamp(t, tz=datetime.timezone.utc).strftime("%Y-%m-%d") for t, _ in valid]
        data = [round(c, 2) for _, c in valid]
        output = {
            "metal": metal, "range": label, "labels": lbls, "data": data,
            "updated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        }
        with open(f"chart-data/{metal}-{label}.json", "w") as f:
            json.dump(output, f, separators=(",", ":"))
        print(f"OK: {metal}-{label} ({len(data)} pts, last={data[-1] if data else 'N/A'})")
    except Exception as e:
        print(f"WARN: {metal}-{label}: {e}")
        fname = f"chart-data/{metal}-{label}.json"
        if not os.path.exists(fname):
            with open(fname, "w") as f:
                json.dump({"metal": metal, "range": label, "labels": [], "data": [], "updated": ""}, f)

print("Done.")
