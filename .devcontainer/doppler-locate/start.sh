#!/usr/bin/env bash
# postStartCommand: Docker servislerini arka planda başlatır. Tekrar çalıştırılabilir.
set -euo pipefail
if [ "${DOPPLER_BG:-0}" != "1" ]; then
  DOPPLER_BG=1 nohup bash "$0" >>/tmp/doppler-locate.log 2>&1 </dev/null &
  echo "DOPPLER / LOCATE motoru başlatılıyor. Ayrıntılar: /tmp/doppler-locate.log"
  exit 0
fi
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT/doppler-locate"
echo "[$(date -u +%FT%TZ)] Codespaces hizmeti hazırlanıyor"
ok=0
for _ in $(seq 1 90); do
  if docker info >/dev/null 2>&1; then ok=1; break; fi
  sleep 2
done
if [ "$ok" != "1" ]; then echo "Docker çalıştırılamadı. Ports ve Terminal'i kontrol et."; exit 1; fi
echo "Docker kullanılabilir. Konteynerler açılıyor..."
docker compose up --detach --pull missing
echo "[$(date -u +%FT%TZ)] Uygulama başlatıldı. Ports sekmesi -> 7070 -> Open in Browser."
docker compose ps
