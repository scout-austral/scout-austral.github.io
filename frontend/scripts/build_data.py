#!/usr/bin/env python3
"""
Generador del dataset de Scout (Mundial 2026, fase de grupos).

Fuente primaria (fixture, equipos, estadios): dataset openfootball/world-cup,
copiado en frontend/scripts/sources/:
  - worldcup.json          -> 104 partidos (filtramos los 72 de fase de grupos)
  - worldcup.teams.json    -> 48 selecciones (fifa_code, grupo, confederación, bandera)
  - worldcup.stadiums.json -> 16 sedes (zona horaria, capacidad, coordenadas)

Datos suplementarios que la fuente NO trae (verificados con búsqueda web, mayo 2026,
cruzando ranking FIFA oficial y planteles anunciados), unidos por fifa_code:
  - RANKING  -> posición en el ranking FIFA
  - FIGURAS  -> hasta 3 jugadores referentes por selección

Emite los tres JSON que consume la app (frontend/src/data/):
  equipos.json    -> ficha por selección
  jugadores.json  -> figuras aplanadas, enlazadas por código de selección
  partidos.json   -> 72 partidos de grupo, con instante UTC de inicio

Reproducir:  python3 frontend/scripts/build_data.py
"""
import json
import os
import re
from collections import defaultdict
from datetime import datetime, timedelta

# --- Ranking FIFA por código (verificado web, mayo 2026) ---
RANKING = {
    "MEX": 15, "RSA": 60, "KOR": 25, "CZE": 41, "CAN": 30, "BIH": 65, "QAT": 55,
    "SUI": 19, "BRA": 6, "MAR": 8, "HAI": 83, "SCO": 43, "USA": 16, "PAR": 40,
    "AUS": 27, "TUR": 22, "GER": 10, "CUW": 82, "CIV": 34, "ECU": 23, "NED": 7,
    "JPN": 18, "SWE": 38, "TUN": 44, "BEL": 9, "EGY": 29, "IRN": 21, "NZL": 85,
    "ESP": 2, "CPV": 69, "KSA": 61, "URU": 17, "FRA": 1, "SEN": 14, "IRQ": 57,
    "NOR": 31, "ARG": 3, "ALG": 28, "AUT": 24, "JOR": 63, "POR": 5, "COD": 46,
    "UZB": 50, "COL": 13, "ENG": 4, "CRO": 11, "GHA": 74, "PAN": 33,
}

# --- Figuras por código (hasta 3 por selección; club=None si no se pudo verificar) ---
FIGURAS = {
    "MEX": [("Edson Álvarez", "West Ham United", "MF"), ("Santiago Giménez", "AC Milan", "FW"), ("Raúl Jiménez", "Fulham", "FW")],
    "RSA": [("Lyle Foster", "Burnley", "FW"), ("Teboho Mokoena", "Mamelodi Sundowns", "MF"), ("Ronwen Williams", "Mamelodi Sundowns", "GK")],
    "KOR": [("Son Heung-min", "Los Angeles FC", "FW"), ("Kim Min-jae", "Bayern Munich", "DF"), ("Lee Kang-in", "Paris Saint-Germain", "MF")],
    "CZE": [("Patrik Schick", "Bayer Leverkusen", "FW"), ("Tomáš Souček", "West Ham United", "MF"), ("Adam Hložek", "Hoffenheim", "FW")],
    "CAN": [("Alphonso Davies", "Bayern Munich", "DF"), ("Jonathan David", "Juventus", "FW"), ("Tajon Buchanan", "Villarreal", "MF")],
    "BIH": [("Edin Džeko", "Fiorentina", "FW"), ("Sead Kolašinac", "Atalanta", "DF"), ("Ermedin Demirović", "VfB Stuttgart", "FW")],
    "QAT": [("Akram Afif", "Al-Sadd", "FW"), ("Almoez Ali", "Al-Duhail", "FW"), ("Boualem Khoukhi", "Al-Sadd", "DF")],
    "SUI": [("Granit Xhaka", "Sunderland", "MF"), ("Manuel Akanji", "Manchester City", "DF"), ("Breel Embolo", "Rennes", "FW")],
    "BRA": [("Vinícius Júnior", "Real Madrid", "FW"), ("Rodrygo", "Real Madrid", "FW"), ("Raphinha", "Barcelona", "FW")],
    "MAR": [("Achraf Hakimi", "Paris Saint-Germain", "DF"), ("Brahim Díaz", "Real Madrid", "MF"), ("Hakim Ziyech", "Al-Duhail", "MF")],
    "HAI": [("Duckens Nazon", None, "FW"), ("Jean-Ricner Bellegarde", "Wolverhampton Wanderers", "MF"), ("Johny Placide", None, "GK")],
    "SCO": [("Scott McTominay", "Napoli", "MF"), ("Andrew Robertson", "Liverpool", "DF"), ("John McGinn", "Aston Villa", "MF")],
    "USA": [("Christian Pulisic", "AC Milan", "FW"), ("Weston McKennie", "Juventus", "MF"), ("Gio Reyna", "Borussia Dortmund", "MF")],
    "PAR": [("Miguel Almirón", "Atlanta United", "MF"), ("Antonio Sanabria", "Cremonese", "FW"), ("Julio Enciso", "Brighton & Hove Albion", "FW")],
    "AUS": [("Mathew Ryan", "Lens", "GK"), ("Jackson Irvine", "FC St. Pauli", "MF"), ("Riley McGree", "Middlesbrough", "MF")],
    "TUR": [("Arda Güler", "Real Madrid", "MF"), ("Hakan Çalhanoğlu", "Inter Milan", "MF"), ("Kenan Yıldız", "Juventus", "FW")],
    "GER": [("Jamal Musiala", "Bayern Munich", "MF"), ("Florian Wirtz", "Liverpool", "MF"), ("Kai Havertz", "Arsenal", "FW")],
    "CUW": [("Tahith Chong", "Sheffield United", "MF"), ("Juninho Bacuna", None, "MF"), ("Eloy Room", None, "GK")],
    "CIV": [("Franck Kessié", "Al-Ahli", "MF"), ("Simon Adingra", "AS Monaco", "FW"), ("Amad Diallo", "Manchester United", "FW")],
    "ECU": [("Moisés Caicedo", "Chelsea", "MF"), ("Enner Valencia", None, "FW"), ("Pervis Estupiñán", "AC Milan", "DF")],
    "NED": [("Virgil van Dijk", "Liverpool", "DF"), ("Cody Gakpo", "Liverpool", "FW"), ("Frenkie de Jong", "Barcelona", "MF")],
    "JPN": [("Takefusa Kubo", "Real Sociedad", "MF"), ("Kaoru Mitoma", "Brighton & Hove Albion", "FW"), ("Wataru Endō", "Liverpool", "MF")],
    "SWE": [("Alexander Isak", "Liverpool", "FW"), ("Viktor Gyökeres", "Arsenal", "FW"), ("Dejan Kulusevski", "Tottenham Hotspur", "MF")],
    "TUN": [("Hannibal Mejbri", "Burnley", "MF"), ("Ellyes Skhiri", "Eintracht Frankfurt", "MF"), ("Aïssa Laïdouni", "Union Berlin", "MF")],
    "BEL": [("Kevin De Bruyne", "Napoli", "MF"), ("Jeremy Doku", "Manchester City", "FW"), ("Romelu Lukaku", "Napoli", "FW")],
    "EGY": [("Mohamed Salah", "Liverpool", "FW"), ("Omar Marmoush", "Manchester City", "FW"), ("Mohamed Elneny", "Al-Jazira", "MF")],
    "IRN": [("Mehdi Taremi", "Inter Milan", "FW"), ("Alireza Jahanbakhsh", None, "MF"), ("Sardar Azmoun", None, "FW")],
    "NZL": [("Chris Wood", "Nottingham Forest", "FW"), ("Marko Stamenić", "Swansea City", "MF"), ("Joe Bell", "Viking FK", "MF")],
    "ESP": [("Lamine Yamal", "Barcelona", "FW"), ("Rodri", "Manchester City", "MF"), ("Pedri", "Barcelona", "MF")],
    "CPV": [("Ryan Mendes", None, "FW"), ("Logan Costa", "Villarreal", "DF"), ("Garry Rodrigues", None, "FW")],
    "KSA": [("Salem Al-Dawsari", "Al-Hilal", "FW"), ("Firas Al-Buraikan", None, "FW"), ("Saud Abdulhamid", "Lens", "DF")],
    "URU": [("Federico Valverde", "Real Madrid", "MF"), ("Darwin Núñez", "Al-Hilal", "FW"), ("Ronald Araújo", "Barcelona", "DF")],
    "FRA": [("Kylian Mbappé", "Real Madrid", "FW"), ("Aurélien Tchouaméni", "Real Madrid", "MF"), ("Ousmane Dembélé", "Paris Saint-Germain", "FW")],
    "SEN": [("Sadio Mané", "Al-Nassr", "FW"), ("Nicolas Jackson", "Bayern Munich", "FW"), ("Pape Matar Sarr", "Tottenham Hotspur", "MF")],
    "IRQ": [("Aymen Hussein", None, "FW"), ("Zidane Iqbal", "Utrecht", "MF"), ("Mohanad Ali", None, "FW")],
    "NOR": [("Erling Haaland", "Manchester City", "FW"), ("Martin Ødegaard", "Arsenal", "MF"), ("Alexander Sørloth", "Atlético Madrid", "FW")],
    "ARG": [("Lionel Messi", "Inter Miami", "FW"), ("Lautaro Martínez", "Inter Milan", "FW"), ("Julián Álvarez", "Atlético Madrid", "FW")],
    "ALG": [("Riyad Mahrez", "Al-Ahli", "FW"), ("Amine Gouiri", "Marseille", "FW"), ("Ismaël Bennacer", "AC Milan", "MF")],
    "AUT": [("David Alaba", "Real Madrid", "DF"), ("Marcel Sabitzer", "Borussia Dortmund", "MF"), ("Marko Arnautović", None, "FW")],
    "JOR": [("Musa Al-Taamari", "Stade Rennais", "FW"), ("Yazan Al-Naimat", None, "FW"), ("Ali Olwan", None, "FW")],
    "POR": [("Cristiano Ronaldo", "Al-Nassr", "FW"), ("Bruno Fernandes", "Manchester United", "MF"), ("Rafael Leão", "AC Milan", "FW")],
    "COD": [("Chancel Mbemba", "Lille", "DF"), ("Yoane Wissa", "Newcastle United", "FW"), ("Cédric Bakambu", "Real Betis", "FW")],
    "UZB": [("Eldor Shomurodov", "AS Roma", "FW"), ("Abdukodir Khusanov", "Manchester City", "DF"), ("Jaloliddin Masharipov", None, "MF")],
    "COL": [("Luis Díaz", "Bayern Munich", "FW"), ("James Rodríguez", None, "MF"), ("Jhon Durán", "Al-Nassr", "FW")],
    "ENG": [("Jude Bellingham", "Real Madrid", "MF"), ("Harry Kane", "Bayern Munich", "FW"), ("Bukayo Saka", "Arsenal", "FW")],
    "CRO": [("Luka Modrić", "AC Milan", "MF"), ("Joško Gvardiol", "Manchester City", "DF"), ("Mateo Kovačić", "Manchester City", "MF")],
    "GHA": [("Antoine Semenyo", "Bournemouth", "FW"), ("Thomas Partey", None, "MF"), ("Jordan Ayew", "Leicester City", "FW")],
    "PAN": [("José Córdoba", "Norwich City", "DF"), ("Adalberto Carrasquilla", "UNAM", "MF"), ("Ismael Díaz", "León", "FW")],
}

CC_PAIS = {"us": "USA", "mx": "Mexico", "ca": "Canada"}


def parse_kickoff_utc(fecha: str, time_str: str):
    """'2026-06-11', '13:00 UTC-6' -> (hora_local, offset, kickoff_utc_iso_Z)."""
    m = re.match(r"^(\d{1,2}:\d{2})\s+UTC([+-]\d{1,2})$", time_str.strip())
    if not m:
        raise ValueError(f"time inesperado: {time_str!r}")
    hora_local, offset_h = m.group(1), int(m.group(2))
    local = datetime.strptime(f"{fecha} {hora_local}", "%Y-%m-%d %H:%M")
    utc = local - timedelta(hours=offset_h)  # local = UTC + offset  ->  UTC = local - offset
    return hora_local, f"UTC{offset_h:+d}", utc.strftime("%Y-%m-%dT%H:%M:00Z")


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # frontend/
    src_dir = os.path.join(root, "scripts", "sources")
    out_dir = os.path.join(root, "src", "data")
    os.makedirs(out_dir, exist_ok=True)

    raw_teams = json.load(open(os.path.join(src_dir, "worldcup.teams.json"), encoding="utf-8"))
    raw_wc = json.load(open(os.path.join(src_dir, "worldcup.json"), encoding="utf-8"))
    raw_stad = json.load(open(os.path.join(src_dir, "worldcup.stadiums.json"), encoding="utf-8"))

    nombre_a_codigo = {t["name"]: t["fifa_code"] for t in raw_teams}
    sede_por_ciudad = {s["city"]: s for s in raw_stad["stadiums"]}

    # equipos.json
    equipos = []
    for t in raw_teams:
        code = t["fifa_code"]
        if code not in RANKING:
            raise ValueError(f"falta ranking para {code} ({t['name']})")
        equipos.append({
            "codigo": code,
            "nombre": t["name"],
            "grupo": t["group"],
            "confederacion": t["confed"],
            "continente": t["continent"],
            "bandera": t["flag_icon"],
            "ranking_fifa": RANKING[code],
        })
    equipos.sort(key=lambda e: (e["grupo"], e["codigo"]))

    # jugadores.json (figuras aplanadas)
    jugadores = []
    for t in raw_teams:
        code = t["fifa_code"]
        for nombre, club, posicion in FIGURAS.get(code, []):
            jugadores.append({
                "nombre": nombre, "seleccion": code, "club": club,
                "posicion": posicion, "es_figura": True,
            })

    # partidos.json (solo fase de grupos)
    group_ms = [m for m in raw_wc["matches"] if m.get("group")]
    partidos = []
    for m in group_ms:
        grupo = m["group"].replace("Group", "").strip()
        hora_local, offset, kickoff_utc = parse_kickoff_utc(m["date"], m["time"])
        ciudad = m["ground"]
        st = sede_por_ciudad.get(ciudad)
        if st is None:
            raise ValueError(f"sede sin estadio: {ciudad}")
        partidos.append({
            "grupo": grupo,
            "jornada": 0,  # se completa abajo
            "local": nombre_a_codigo[m["team1"]],
            "visitante": nombre_a_codigo[m["team2"]],
            "fecha": m["date"],
            "hora_local": hora_local,
            "utc_offset": offset,
            "kickoff_utc": kickoff_utc,
            "sede": st["name"],
            "ciudad": ciudad,
            "pais": CC_PAIS[st["cc"]],
            "capacidad": st["capacity"],
        })

    # jornada (1/2/3): en un round-robin cada equipo juega una vez por jornada,
    # así que la jornada de un partido = el orden cronológico de ese partido para
    # cada uno de sus equipos (ambos deben coincidir).
    orden_equipo = defaultdict(int)
    vistos = defaultdict(dict)  # equipo -> {kickoff: pos}
    for p in sorted(partidos, key=lambda x: (x["kickoff_utc"], x["grupo"])):
        for eq in (p["local"], p["visitante"]):
            if p["kickoff_utc"] not in vistos[eq]:
                orden_equipo[eq] += 1
                vistos[eq][p["kickoff_utc"]] = orden_equipo[eq]
    for p in partidos:
        jl = vistos[p["local"]][p["kickoff_utc"]]
        jv = vistos[p["visitante"]][p["kickoff_utc"]]
        if jl != jv:
            raise ValueError(f"jornada inconsistente en {p['local']}-{p['visitante']}: {jl} vs {jv}")
        p["jornada"] = jl

    # id estable por orden cronológico
    partidos.sort(key=lambda p: (p["kickoff_utc"], p["grupo"], p["local"]))
    for i, p in enumerate(partidos, start=1):
        p["id"] = f"M{i:02d}"
    partidos = [{"id": p.pop("id"), **p} for p in partidos]

    # Validaciones
    assert len(equipos) == 48, f"esperaba 48 equipos, hay {len(equipos)}"
    assert len(partidos) == 72, f"esperaba 72 partidos, hay {len(partidos)}"
    from collections import Counter
    por_grupo = Counter(p["grupo"] for p in partidos)
    assert all(v == 6 for v in por_grupo.values()), f"grupos sin 6 partidos: {por_grupo}"
    por_jornada = Counter(p["jornada"] for p in partidos)
    assert por_jornada == {1: 24, 2: 24, 3: 24}, f"jornadas mal repartidas: {por_jornada}"
    cods = {e["codigo"] for e in equipos}
    assert all(p["local"] in cods and p["visitante"] in cods for p in partidos), "partido con código inexistente"

    for fname, data in (("equipos.json", equipos), ("jugadores.json", jugadores), ("partidos.json", partidos)):
        with open(os.path.join(out_dir, fname), "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
        print(f"escrito {fname}: {len(data)} registros")


if __name__ == "__main__":
    main()
