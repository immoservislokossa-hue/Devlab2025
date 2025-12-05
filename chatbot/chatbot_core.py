import os
import json
import requests
import google.generativeai as genai
from colorama import init, Fore, Style

# Initialize colorama
init()

# Load API keys from environment variable `GENAI_API_KEYS` (comma separated)
# Example: set GENAI_API_KEYS="key1,key2"
API_KEYS = []
_env_keys = os.environ.get('GENAI_API_KEYS')
if _env_keys:
    API_KEYS = [k.strip() for k in _env_keys.split(',') if k.strip()]

def load_knowledge_base(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return json.load(file)
    except FileNotFoundError:
        return {}

def process_csv_upload(file_path):
    """
    Proxies the CSV file to the load test backend.
    """
    url = "http://localhost:5000/transfer-bulk"
    print(f"{Fore.YELLOW}Envoi de {file_path} vers {url}...{Style.RESET_ALL}")
    
    try:
        with open(file_path, 'rb') as f:
            files = {'file': f}
            response = requests.post(url, files=files)

        if response.status_code == 200:
            # Check if the response is actually a ZIP file
            content_type = response.headers.get('Content-Type', '')
            if 'application/zip' in content_type or response.content.startswith(b'PK'):
                return response.content, "rapport_resultat.zip"
            else:
                # The server returns a JSON report when no rows are valid (Total Failure)
                try:
                    data = response.json()
                    
                    # Handle the specific format from the server (incorrect_data, incorrect_rows)
                    if 'incorrect_data' in data and isinstance(data['incorrect_data'], list):
                        count = data.get('incorrect_rows', 0)
                        total = data.get('total_rows', 0)
                        
                        # Extract unique error types for a better summary
                        error_types = set()
                        for row in data['incorrect_data']:
                            if 'errors' in row:
                                error_types.add(row['errors'])
                        
                        error_summary = ", ".join(list(error_types)[:3])
                        if len(error_types) > 3:
                            error_summary += ", ..."
                            
                        return None, f"Échec de validation : {count}/{total} lignes incorrectes.\nTypes d'erreurs : {error_summary}"
                    
                    # Fallback for generic errors
                    return None, f"Erreur de validation : {json.dumps(data, ensure_ascii=False)}"
                except:
                    return None, f"Réponse inattendue du serveur (pas un ZIP) : {response.text[:200]}"
        else:
            return None, f"Erreur {response.status_code}: {response.text}"
    except FileNotFoundError:
        return None, f"Erreur : Fichier introuvable à {file_path}"
    except Exception as e:
        return None, f"Erreur lors de l'envoi : {str(e)}"

def generate_ai_response(user_input, knowledge_base_str, media_path=None, stream=True):
    """
    Generates a response from Gemini, handling text and optional media (audio).
    """
    system_prompt = f"""
    Tu es un assistant IA utile pour le projet 'Mojaloop Bulk Transfer Load Tester'.
    Utilise la documentation technique suivante (Base de connaissances) pour répondre aux questions de l'utilisateur avec précision.
    
    BASE DE CONNAISSANCES :
    {knowledge_base_str}
    
    IMPORTANT :
    Si l'utilisateur veut télécharger un fichier CSV ou lancer un test avec un fichier, dis-lui d'utiliser l'endpoint d'upload.
    
    Si l'utilisateur fournit un fichier audio, écoute-le et réponds aux questions qu'il contient,
    ou résume l'audio s'il s'agit d'une déclaration.
    
    Si la réponse n'est pas dans la base de connaissances, dis poliment que tu n'as pas cette information.
    Garde les réponses concises et techniques si nécessaire.
    Réponds TOUJOURS en français.
    """

    for key in API_KEYS:
        try:
            genai.configure(api_key=key)
            # Using flash for speed
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            content = []
            
            if media_path:
                uploaded_file = genai.upload_file(media_path)
                content.append(system_prompt)
                content.append(uploaded_file)
                if user_input:
                    content.append(f"\nUser Note: {user_input}")
            else:
                full_prompt = f"{system_prompt}\n\nUser Question: {user_input}"
                content.append(full_prompt)
            
            if stream:
                return model.generate_content(content, stream=True)
            else:
                return model.generate_content(content)
                
        except Exception as e:
            print(f"Warning: API Key failed. Switching to next key... (Error: {e})")
            continue
    
    # If no API keys configured or all keys failed, raise a clear error
    if not API_KEYS:
        raise Exception("Aucune clé API configurée. Définissez la variable d'environnement GENAI_API_KEYS avec vos clés.")
    raise Exception("Toutes les clés API ont échoué.")
