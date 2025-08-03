 Ativa o modo de erro
set -e

# Caminhos dos manifests
BP_MANIFEST="BP/manifest.json"
RP_MANIFEST="RP/manifest.json"

# Função para exibir notificação
notificar() {
    notify-send "Atualizador Addon" "$1"
}

# Verifica se os manifests existem
if [ ! -f "$BP_MANIFEST" ]; then
    echo "[ERRO] $BP_MANIFEST não encontrado."
    notificar "[ERRO] $BP_MANIFEST não encontrado."
    exit 1
fi

if [ ! -f "$RP_MANIFEST" ]; then
    echo "[ERRO] $RP_MANIFEST não encontrado."
    notificar "[ERRO] $RP_MANIFEST não encontrado."
    exit 1
fi

# Extrai o nome do addon a partir do campo "name" dos manifests
get_name_from_manifest() {
    grep -oP '"name"\s*:\s*"\K[^"]+' "$1"
}

BP_NAME=$(get_name_from_manifest "$BP_MANIFEST")
RP_NAME=$(get_name_from_manifest "$RP_MANIFEST")

# Caminhos de destino para o MCPELAUNCHER
DEST_BASE="/home/nikolaa/.var/app/io.mrarm.mcpelauncher/data/mcpelauncher/games/com.mojang"
DEST_BP="$DEST_BASE/development_behavior_packs/$BP_NAME"
DEST_RP="$DEST_BASE/development_resource_packs/$RP_NAME"

echo "Removendo antigos..."
rm -rf "$DEST_BP" "$DEST_RP"

echo "Copiando Behavior: $BP_NAME"
cp -r "BP" "$DEST_BP"

echo "Copiando Resource: $RP_NAME"
cp -r "RP" "$DEST_RP"

echo ""
echo "✅ Addon atualizado com sucesso!"
notificar "✅ Addon atualizado com sucesso!"