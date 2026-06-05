#!/usr/bin/env python3
"""
Scrapea los planteles del Mundial 2026 desde Wikipedia y genera jugadores.json.

Fuente: https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_squads
Se obtiene el HTML renderizado vía la API de MediaWiki (action=parse), que es
estable y no depende del layout visual de la página.

Estructura de la página (una sección <h3> por selección, con su tabla):
  <h3>Argentina</h3>
  <table class="sortable wikitable plainrowheaders">
    <tr class="nat-fs-player">
      <td>1</td>                         No.
      <td><a>GK</a></td>                 Pos.  -> GK/DF/MF/FW
      <th scope="row"><a>Juan Musso</a>  Player
      <td>...</td>                       Date of birth
      <td>3</td>                         Caps
      <td>0</td>                         Goals
      <td><span class=flagicon>…</span> <a>Atlético Madrid</a>   Club
    </tr>

Emite frontend/src/data/jugadores.json con el esquema que consume la app
(Jugador en src/data/types.ts):
  { nombre, seleccion, club|null, posicion, es_figura }

`es_figura` se hereda de la lista curada FIGURAS de build_data.py (cruzando por
nombre normalizado); el resto queda en False.

Requisitos:  pip install requests beautifulsoup4
Reproducir:  python3 frontend/scripts/scrape_squads.py
"""
import json
import os
import sys
import unicodedata

import requests
from bs4 import BeautifulSoup

from build_data import FIGURAS  # misma carpeta; reutilizamos la lista de figuras

WIKI_API = "https://en.wikipedia.org/w/api.php"
PAGE = "2026 FIFA World Cup squads"

# Nombre de la sección en Wikipedia (inglés) -> código FIFA de equipos.json.
NOMBRE_WIKI_A_CODIGO = {
    "Czech Republic": "CZE", "Mexico": "MEX", "South Africa": "RSA", "South Korea": "KOR",
    "Bosnia and Herzegovina": "BIH", "Canada": "CAN", "Qatar": "QAT", "Switzerland": "SUI",
    "Brazil": "BRA", "Haiti": "HAI", "Morocco": "MAR", "Scotland": "SCO",
    "Australia": "AUS", "Paraguay": "PAR", "Turkey": "TUR", "United States": "USA",
    "Curaçao": "CUW", "Ecuador": "ECU", "Germany": "GER", "Ivory Coast": "CIV",
    "Japan": "JPN", "Netherlands": "NED", "Sweden": "SWE", "Tunisia": "TUN",
    "Belgium": "BEL", "Egypt": "EGY", "Iran": "IRN", "New Zealand": "NZL",
    "Cape Verde": "CPV", "Saudi Arabia": "KSA", "Spain": "ESP", "Uruguay": "URU",
    "France": "FRA", "Iraq": "IRQ", "Norway": "NOR", "Senegal": "SEN",
    "Algeria": "ALG", "Argentina": "ARG", "Austria": "AUT", "Jordan": "JOR",
    "Colombia": "COL", "DR Congo": "COD", "Portugal": "POR", "Uzbekistan": "UZB",
    "Croatia": "CRO", "England": "ENG", "Ghana": "GHA", "Panama": "PAN",
}

POSICIONES = {"GK", "DF", "MF", "FW"}


def normalizar(nombre: str) -> str:
    """Quita acentos y normaliza a minúsculas para comparar nombres entre fuentes."""
    sin_acentos = "".join(
        c for c in unicodedata.normalize("NFKD", nombre) if not unicodedata.combining(c)
    )
    return " ".join(sin_acentos.lower().split())


def figuras_por_codigo() -> dict:
    """{ codigo: {nombre_normalizado, ...} } a partir de FIGURAS de build_data.py."""
    out = {}
    for code, figs in FIGURAS.items():
        out[code] = {normalizar(nombre) for nombre, _club, _pos in figs}
    return out


def fetch_html() -> str:
    params = {
        "action": "parse", "page": PAGE, "prop": "text",
        "format": "json", "formatversion": "2",
    }
    headers = {"User-Agent": "scout-austral/1.0 (squad scraper; build_data companion)"}
    resp = requests.get(WIKI_API, params=params, headers=headers, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    if "error" in data:
        raise RuntimeError(f"Wikipedia API: {data['error'].get('info')}")
    return data["parse"]["text"]


def extraer_posicion(celda) -> str | None:
    """La celda de Pos. trae un <span display:none> con el orden + el texto GK/DF/MF/FW."""
    for token in celda.get_text(" ", strip=True).split():
        if token in POSICIONES:
            return token
    return None


def extraer_club(celda) -> str | None:
    """Último <td>: bandera de la federación + enlace al club. Devolvemos el club o None."""
    for flag in celda.select("span.flagicon"):
        flag.extract()  # descartamos el enlace de la bandera de la federación
    enlace = celda.find("a")
    if enlace:
        return enlace.get_text(strip=True)
    texto = celda.get_text(strip=True)
    return texto or None


def parsear(html: str) -> list:
    soup = BeautifulSoup(html, "html.parser")
    figuras = figuras_por_codigo()
    jugadores = []
    vistos_codigos = set()

    for heading in soup.find_all("h3"):
        nombre_seccion = heading.get_text(strip=True)
        code = NOMBRE_WIKI_A_CODIGO.get(nombre_seccion)
        if code is None:
            continue

        tabla = heading.find_next("table")
        if tabla is None:
            print(f"  ⚠ {nombre_seccion}: sin tabla", file=sys.stderr)
            continue

        filas = tabla.find_all("tr", class_="nat-fs-player")
        if not filas:
            print(f"  ⚠ {nombre_seccion}: tabla sin jugadores", file=sys.stderr)
            continue

        for fila in filas:
            th = fila.find("th", attrs={"scope": "row"})
            celdas = fila.find_all("td")
            if th is None or len(celdas) < 2:
                continue
            # El nombre vive en el <a> del jugador; marcas como "(captain)" quedan
            # fuera del enlace, así que preferimos el texto del ancla.
            enlace_jugador = th.find("a")
            nombre = (enlace_jugador or th).get_text(strip=True)
            posicion = extraer_posicion(celdas[1])  # celdas[0]=No., celdas[1]=Pos.
            club = extraer_club(celdas[-1])
            if not nombre or posicion is None:
                continue
            jugadores.append({
                "nombre": nombre,
                "seleccion": code,
                "club": club,
                "posicion": posicion,
                "es_figura": normalizar(nombre) in figuras.get(code, set()),
            })
        vistos_codigos.add(code)
        print(f"  {code} {nombre_seccion}: {len(filas)} jugadores")

    faltan = set(NOMBRE_WIKI_A_CODIGO.values()) - vistos_codigos
    if faltan:
        print(f"⚠ selecciones sin plantel en la página: {sorted(faltan)}", file=sys.stderr)
    return jugadores


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # frontend/
    out_path = os.path.join(root, "src", "data", "jugadores.json")

    print(f"Descargando «{PAGE}» …")
    html = fetch_html()
    print("Parseando planteles …")
    jugadores = parsear(html)

    if len(jugadores) < 1000:
        print(f"⚠ solo {len(jugadores)} jugadores; ¿la página ya tiene todos los planteles?",
              file=sys.stderr)

    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(jugadores, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    figuras = sum(1 for j in jugadores if j["es_figura"])
    sin_club = sum(1 for j in jugadores if j["club"] is None)
    print(f"\nEscrito {out_path}")
    print(f"  {len(jugadores)} jugadores · {figuras} figuras · {sin_club} sin club")


if __name__ == "__main__":
    main()
