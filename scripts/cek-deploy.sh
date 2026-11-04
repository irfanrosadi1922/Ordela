#!/usr/bin/env bash
# Cek kesiapan 4 subdomain Ordela. Jalankan: bash scripts/cek-deploy.sh
for a in kasir admin dapur pesan; do
  h="$a.ordela.my.id"
  cn=$(dig +short CNAME "$h" 2>/dev/null | head -1)
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$h/")
  echo "$h  CNAME=${cn:-(belum ada)}  HTTPS=$code"
done
