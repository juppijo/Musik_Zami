import json

def convert_and_export(input_json, output_js):
    try:
        # 1. JSON-Datei einlesen
        with open(input_json, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 2. JavaScript-String zusammenbauen
        lines = ["const DEFAULT_STATIONS = ["]
        for s in data:
            # Erstellt eine Zeile im gewünschten Format
            entry = f"  {{ name: '{s['name']}', url: '{s['url']}', genre: '{s['genre']}', icon: '{s['icon']}' }},"
            lines.append(entry)
        lines.append("];")
        
        full_output = "\n".join(lines)
        
        # 3. In Datei schreiben
        with open(output_js, 'w', encoding='utf-8') as f:
            f.write(full_output)
            
        # 4. Text in der Konsole ausgeben
        print("-" * 30)
        print(f"DATEI '{output_js}' WURDE ERSTELLT.")
        print("-" * 30)
        print(full_output)
        print("-" * 30)

    except FileNotFoundError:
        print(f"Fehler: Die Datei '{input_json}' wurde nicht gefunden.")
    except Exception as e:
        print(f"Ein unerwarteter Fehler ist aufgetreten: {e}")

# Ausführung
convert_and_export('aether-radio-sender.json', 'stations.js')
