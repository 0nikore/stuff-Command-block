#!/bin/sh

get_name_from_manifest() {
  # Extrai o valor do campo "name" do manifest.json
  grep '"name"' "$1" | head -n1 | sed -E 's/.*"name"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/'
}

if [ ! -f "BP/manifest.json" ]; then
  echo "[ERRO] BP/manifest.json não encontrado."
  read -p "Pressione Enter para sair..."
  exit 1
fi

if [ ! -f "RP/manifest.json" ]; then
  echo "[ERRO] RP/manifest.json não encontrado."
  read -p "Pressione Enter para sair..."
  exit 1
fi

BP_NAME=$(get_name_from_manifest "BP/manifest.json")
RP_NAME=$(get_name_from_manifest "RP/manifest.json")
ADDON_NAME="$RP_NAME"

echo "Compactando addon_BP.mcpack..."
7z a -tzip addon_BP.mcpack ./BP/* > /dev/null

echo "Compactando addon_RP.mcpack..."
7z a -tzip addon_RP.mcpack ./RP/* > /dev/null

mkdir -p temp_packager
mv -f addon_BP.mcpack temp_packager/
mv -f addon_RP.mcpack temp_packager/

echo "Compactando ${ADDON_NAME}.mcaddon..."
7z a -tzip "${ADDON_NAME}.mcaddon" ./temp_packager/* > /dev/null

rm -rf temp_packager

echo
echo "✅ Compactação finalizada com sucesso e compatível com Minecraft!"
read -p "Pressione Enter para sair..."
exit 0
