RULES: list[tuple[list[str], list[str]]] = [
    (
        ["guarda-corpo", "guarda corpo", "guardacorpo"],
        ["ensaio de guarda-corpo", "laudo técnico", "verificação de conformidade"],
    ),
    (
        ["piso", "revestimento", "assentamento"],
        ["ensaio de percussão", "ensaio de desempenho de piso", "vistoria técnica"],
    ),
    (
        ["residencial", "prédio", "predio", "condomínio", "condominio", "edifício", "edificio"],
        [
            "análise de desempenho",
            "ensaios NBR 15575",
            "vistoria de entrega",
            "manual de uso, operação e manutenção",
        ],
    ),
    (
        ["acústica", "acustica", "ruído", "ruido", "auditório", "auditorio", "escola", "salão", "salao"],
        ["ensaio acústico", "avaliação de ruído", "laudo técnico"],
    ),
    (
        ["fase final", "entrega", "habite-se", "habite se", "vistoria"],
        [
            "vistoria técnica de entrega",
            "relatório de não conformidades",
            "manual de manutenção",
            "laudo de conformidade",
        ],
    ),
    (
        ["fachada", "impermeabilização", "impermeabilizacao"],
        ["vistoria técnica de fachada", "laudo de impermeabilização"],
    ),
]


def sugerir_servicos(nome_obra: str, resumo: str, texto_original: str) -> list[str]:
    texto = f"{nome_obra} {resumo} {texto_original}".lower()
    servicos: list[str] = []
    for termos, sugestoes in RULES:
        for termo in termos:
            if termo in texto:
                for s in sugestoes:
                    if s not in servicos:
                        servicos.append(s)
                break
    return servicos
