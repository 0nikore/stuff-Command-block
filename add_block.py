import json
import tkinter as tk
from tkinter import filedialog

def carregar_json(caminho):
    with open(caminho, 'r', encoding='utf-8') as f:
        return json.load(f)

def salvar_json(caminho, dados):
    with open(caminho, 'w', encoding='utf-8') as f:
        json.dump(dados, f, indent=2, ensure_ascii=False)

def ordenar_blocos(destroy_speeds):
    def nome_bloco(item):
        b = item.get("block")
        if isinstance(b, str):
            return b.lower()
        elif isinstance(b, dict):
            return json.dumps(b).lower()
        return ""
    return sorted(destroy_speeds, key=nome_bloco)

def blocos_existentes(destroy_speeds):
    blocos = set()
    for item in destroy_speeds:
        b = item.get("block")
        if isinstance(b, str):
            blocos.add(b)
        elif isinstance(b, dict):
            blocos.add(json.dumps(b))
    return blocos

def adicionar_blocos(dados, blocos_novos, speed_padrao):
    digger = dados.get("minecraft:item", {}).get("components", {}).get("minecraft:digger", {})
    destroy_speeds = digger.get("destroy_speeds", [])
    blocos_atuais = blocos_existentes(destroy_speeds)

    for bloco in blocos_novos:
        bloco_key = bloco if isinstance(bloco, str) else json.dumps(bloco)
        if bloco_key not in blocos_atuais:
            destroy_speeds.append({
                "block": bloco,
                "speed": speed_padrao
            })

    digger["destroy_speeds"] = ordenar_blocos(destroy_speeds)

def copiar_lista_blocos(arquivo_origem, arquivo_destino, speed_padrao):
    dados_origem = carregar_json(arquivo_origem)
    dados_destino = carregar_json(arquivo_destino)

    destroy_speeds_origem = dados_origem.get("minecraft:item", {}).get("components", {}).get("minecraft:digger", {}).get("destroy_speeds", [])
    blocos_origem = [item.get("block") for item in destroy_speeds_origem]

    digger_destino = dados_destino.get("minecraft:item", {}).get("components", {}).get("minecraft:digger", {})
    digger_destino["destroy_speeds"] = [{"block": b, "speed": speed_padrao} for b in blocos_origem]
    digger_destino["destroy_speeds"] = ordenar_blocos(digger_destino["destroy_speeds"])

    salvar_json(arquivo_destino, dados_destino)

def comparar_blocos(arquivo1, arquivo2):
    dados1 = carregar_json(arquivo1)
    dados2 = carregar_json(arquivo2)

    ds1 = dados1.get("minecraft:item", {}).get("components", {}).get("minecraft:digger", {}).get("destroy_speeds", [])
    ds2 = dados2.get("minecraft:item", {}).get("components", {}).get("minecraft:digger", {}).get("destroy_speeds", [])

    blocos1 = blocos_existentes(ds1)
    blocos2 = blocos_existentes(ds2)

    so_em_1 = blocos1 - blocos2
    so_em_2 = blocos2 - blocos1

    return so_em_1, so_em_2

def escolher_arquivo(titulo):
    root = tk.Tk()
    root.withdraw()
    caminho = filedialog.askopenfilename(title=titulo, filetypes=[("Arquivos JSON", "*.json")])
    root.destroy()
    return caminho

def pedir_blocos():
    print("\nDigite os blocos que quer adicionar separados por vírgula, EXEMPLO:")
    print("minecraft:diamond_block, minecraft:iron_ore, minecraft:gold_ore")
    entrada = input("Blocos: ").strip()
    blocos = [b.strip() for b in entrada.split(",") if b.strip()]
    return blocos

def pedir_velocidade():
    speed = input("Velocidade para os blocos (exemplo: 15): ").strip()
    try:
        speed_val = int(speed)
    except:
        print("Velocidade inválida, usando 15 como padrão.")
        speed_val = 15
    return speed_val

def main():
    print("=== Gerenciador destroy_speeds Minecraft ===")

    while True:
        print("\nEscolha a opção:")
        print("1 - Adicionar blocos a um arquivo")
        print("2 - Copiar lista de blocos de um arquivo para outro")
        print("3 - Comparar blocos entre dois arquivos")
        print("0 - Sair")

        opcao = input("Opção: ").strip()

        if opcao == "0":
            break
        elif opcao == "1":
            arquivo = escolher_arquivo("Selecione o arquivo JSON para modificar")
            if not arquivo:
                print("Nenhum arquivo selecionado.")
                continue
            blocos = pedir_blocos()
            if not blocos:
                print("Nenhum bloco informado.")
                continue
            speed = pedir_velocidade()

            dados = carregar_json(arquivo)
            adicionar_blocos(dados, blocos, speed)
            salvar_json(arquivo, dados)
            print(f"Blocos adicionados e arquivo salvo em '{arquivo}'.")
        elif opcao == "2":
            origem = escolher_arquivo("Selecione o arquivo JSON de origem")
            if not origem:
                print("Nenhum arquivo selecionado.")
                continue
            destino = escolher_arquivo("Selecione o arquivo JSON de destino")
            if not destino:
                print("Nenhum arquivo selecionado.")
                continue
            speed = pedir_velocidade()
            copiar_lista_blocos(origem, destino, speed)
            print(f"Lista copiada de '{origem}' para '{destino}' com velocidade {speed}.")
        elif opcao == "3":
            arquivo1 = escolher_arquivo("Selecione o primeiro arquivo JSON para comparar")
            if not arquivo1:
                print("Nenhum arquivo selecionado.")
                continue
            arquivo2 = escolher_arquivo("Selecione o segundo arquivo JSON para comparar")
            if not arquivo2:
                print("Nenhum arquivo selecionado.")
                continue

            so_em_1, so_em_2 = comparar_blocos(arquivo1, arquivo2)
            print(f"\nBlocos em '{arquivo1}' e não em '{arquivo2}':")
            for b in sorted(so_em_1):
                print(f" - {b}")
            print(f"\nBlocos em '{arquivo2}' e não em '{arquivo1}':")
            for b in sorted(so_em_2):
                print(f" - {b}")
        else:
            print("Opção inválida, tente novamente.")

if __name__ == "__main__":
    main()
