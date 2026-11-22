#!/usr/bin/env python3
"""Exit 0 if every given string occurs in the Hermes bundle as UTF-8/ASCII or UTF-16LE
(Hermes stores non-ASCII string literals as UTF-16). Usage: bundle_contains.py BUNDLE STR [STR...]"""
import sys
data = open(sys.argv[1], "rb").read()
missing = [s for s in sys.argv[2:] if s.encode("utf-8") not in data and s.encode("utf-16-le") not in data]
for s in missing:
    print(f"missing: {s[:60]}", file=sys.stderr)
sys.exit(1 if missing else 0)
