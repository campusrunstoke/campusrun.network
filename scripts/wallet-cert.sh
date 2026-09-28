#!/usr/bin/env bash
# Converts Apple's .p12 into the three base64 values the app needs, and checks the
# cert actually matches the Pass Type ID / Team ID we expect before anyone deploys it.
#
#   ./scripts/wallet-cert.sh certs/YourCert.p12
#
# The export password is typed at a hidden prompt — it is never passed as an argument
# (which would land in shell history) and never printed. Output goes to
# certs/vercel-env.txt, which is gitignored.
set -euo pipefail

P12="${1:-}"
[ -z "$P12" ] && { echo "usage: $0 <path-to.p12>"; exit 1; }
[ -f "$P12" ] || { echo "✗ no such file: $P12"; exit 1; }

EXPECT_PASSTYPE="${EXPECT_PASSTYPE:-pass.bet.nextwave.campusrun}"
EXPECT_TEAM="${EXPECT_TEAM:-M6K485R64Y}"
WWDR="certs/AppleWWDRCAG4.cer"
OUT="certs/vercel-env.txt"

read -rsp "Export password for the .p12 (hidden, press enter if none): " PW; echo

# Keychain exports are often legacy-encrypted; OpenSSL 3 needs -legacy for those.
extract() { # $1 = extra openssl args
  openssl pkcs12 -in "$P12" -passin pass:"$PW" $1 -out "$2" -nodes 2>/dev/null
}
LEGACY=""
if ! extract "-clcerts -nokeys" certs/signerCert.pem; then
  LEGACY="-legacy"
  extract "-clcerts -nokeys -legacy" certs/signerCert.pem \
    || { echo "✗ Could not open the .p12 — wrong password, or not a valid p12."; exit 1; }
fi
extract "-nocerts $LEGACY" certs/signerKey.pem

# --- verify the cert is the one we think it is, before it reaches production ---
SUBJ=$(openssl x509 -in certs/signerCert.pem -noout -subject)
GOT_PASSTYPE=$(echo "$SUBJ" | grep -oE 'UID ?= ?[^,/]+' | sed 's/.*= *//' | tr -d ' ')
GOT_TEAM=$(echo "$SUBJ" | grep -oE 'OU ?= ?[^,/]+' | sed 's/.*= *//' | tr -d ' ')
EXPIRY=$(openssl x509 -in certs/signerCert.pem -noout -enddate | sed 's/notAfter=//')

echo
echo "Certificate says:"
echo "  Pass Type ID : $GOT_PASSTYPE"
echo "  Team ID      : $GOT_TEAM"
echo "  Expires      : $EXPIRY"
FAIL=0
[ "$GOT_PASSTYPE" = "$EXPECT_PASSTYPE" ] || { echo "  ✗ Pass Type ID does NOT match expected $EXPECT_PASSTYPE"; FAIL=1; }
[ "$GOT_TEAM" = "$EXPECT_TEAM" ]         || { echo "  ✗ Team ID does NOT match expected $EXPECT_TEAM"; FAIL=1; }
[ "$FAIL" = 0 ] && echo "  ✓ matches what Kasey sent"
openssl x509 -checkend 0 -noout -in certs/signerCert.pem >/dev/null || { echo "  ✗ CERT HAS EXPIRED"; FAIL=1; }

[ -f "$WWDR" ] || { echo "✗ missing $WWDR"; exit 1; }
openssl x509 -inform DER -in "$WWDR" -out certs/wwdr.pem 2>/dev/null

b64() { base64 -i "$1" | tr -d '\n'; }
{
  echo "# Paste each value into Vercel → Settings → Environment Variables (Production)."
  echo "# This file is gitignored. Delete it once the values are in Vercel."
  echo
  echo "WALLET_PASS_TYPE_ID=$GOT_PASSTYPE"
  echo "WALLET_TEAM_ID=$GOT_TEAM"
  echo "WALLET_ORG_NAME=Campus Run"
  echo
  echo "WALLET_SIGNER_CERT_B64=$(b64 certs/signerCert.pem)"
  echo
  echo "WALLET_SIGNER_KEY_B64=$(b64 certs/signerKey.pem)"
  echo
  echo "WALLET_WWDR_B64=$(b64 certs/wwdr.pem)"
  echo
  echo "# Leave WALLET_SIGNER_KEY_PASSPHRASE empty — the key is exported unencrypted above."
} > "$OUT"

echo
[ "$FAIL" = 0 ] && echo "✓ Wrote $OUT — open it and copy the values into Vercel." \
               || echo "⚠ Wrote $OUT but the checks above FAILED. Do not deploy until resolved."
