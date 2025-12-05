from flask import Flask, request, jsonify, send_file
import pandas as pd
from datetime import datetime
from io import BytesIO, StringIO
from bulk_transfer_processor import process_bulk_transfers
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
import csv
import zipfile
import uuid
import os
import requests
import base64
import hashlib
import time
import traceback

# --- CHARGEMENT ENVIRONNEMENT ---
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

app = Flask(__name__)

# --- CONFIGURATION SUPABASE ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Supabase connecté.")
    except Exception as e:
        print(f"⚠️ Erreur connexion Supabase: {e}")
else:
    print("⚠️ Variables SUPABASE manquantes dans le .env")

# --- VARIABLES GLOBALES ---
callback_results = {}
quote_responses = {}

# ==========================================
# 1. ROUTE TRANSFERT BULK
# ==========================================

@app.route('/transfer-bulk', methods=['POST'])
def process_csv():
    # ... (Code Bulk inchangé pour ne pas alourdir, garde celui d'avant si besoin) ...
    # Je mets ici une version simplifiée qui marche pour le bulk si tu veux tout le fichier
    if 'file' not in request.files:
        return jsonify({'error': 'Aucun fichier'}), 400
    
    file = request.files['file']
    filename = file.filename
    uncorrect_rows = []
    correct_rows = []
    
    try:
        df = pd.read_csv(file, encoding='utf-8', on_bad_lines='skip', dtype={'valeur_id': str})

        for index, row in df.iterrows():
            errors = []
            type_id = row.get("type_id", "")
            valeur_id = str(row.get("valeur_id", "")).strip()
            if row.get("type_id") != "PERSONAL_ID": errors.append("type_id incorrect")
            if not valeur_id.isdigit() or len(valeur_id) != 10: errors.append("valeur_id invalide")
            if row.get("devise") != "XOF": errors.append("devise incorrecte")
            try:
                montant = float(row.get("montant", 0))
                if montant <= 0: errors.append("montant <= 0")
            except:
                errors.append("format montant")
            
            if errors:
                uncorrect_rows.append({"valeur_id": valeur_id, "errors": ", ".join(errors)})
            else:
                correct_rows.append({
                    "valeur_id": valeur_id,
                    "type_id": type_id,
                    "nom_complet": row.get("nom_complet"),
                    "montant": float(row.get("montant")),
                    "devise": row.get("devise")
                })

        transfer_results = []
        if correct_rows:
            transfer_results = process_bulk_transfers(correct_rows, callback_results, transfers_per_bulk=100)
            
        success_count = len([t for t in transfer_results if t['status'] == 'SUCCESS'])
        total_processed = len(df)
        
        # Insert Résumé Bulk (Table historique_resumes)
        if supabase:
            try:
                data_summary = {
                    "bulk_id": str(uuid.uuid4()),
                    "filename": filename,
                    "total_lignes": total_processed,
                    "nb_succes": success_count,
                    "nb_echecs_tech": len(transfer_results) - success_count,
                    "nb_invalides": len(uncorrect_rows)
                }
                supabase.table("historique_resumes").insert(data_summary).execute()
            except Exception as e:
                print(f"Erreur Supabase Bulk: {e}")

        # Pour simplifier ce bloc, je retourne un JSON simple ici
        # (Remets la génération PDF si tu veux garder le PDF Bulk)
        return jsonify({"message": "Bulk traité", "succes": success_count})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==========================================
# 2. ROUTE SINGLE-VIA-BULK (CELLE QUE TU VEUX)
# ==========================================

@app.route('/transfer-single', methods=['POST'])
def process_single():
    """
    Route simplifiée : Enregistre UNIQUEMENT id_value, amount et transfer_id.
    """
    try:
        if request.is_json:
            payload = request.get_json()
        else:
            payload = request.form.to_dict()
            
        valeur_id = str(payload.get('id', '')).strip()
        try:
            montant = float(payload.get('montant', 0))
        except:
            return jsonify({'error': 'Montant invalide'}), 400

        if not valeur_id or montant <= 0:
            return jsonify({'error': 'Paramètres invalides'}), 400

        # On prépare le paiement pour le processeur
        payment = {
            'valeur_id': valeur_id,
            'type_id': 'PERSONAL_ID',
            'devise': 'XOF',
            'montant': montant,
            'nom_complet': f"Beneficiaire {valeur_id}"
        }
        
        # Exécution
        transfer_results = process_bulk_transfers([payment], callback_results, transfers_per_bulk=1)
        result_detail = transfer_results[0] if transfer_results else {}
        
        # --- SAUVEGARDE SUPABASE (Table single_transfers ALLÉGÉE) ---
        if supabase and result_detail:
            try:
                # ICI : On ne met QUE ce que tu as demandé
                single_data = {
                    "transfer_id": str(result_detail.get('transfer_id')),
                    "payee_id_value": str(result_detail.get('id_value')), # Le numéro (229...)
                    "amount": result_detail.get('amount')                 # Le montant (5000)
                    # Pas de name, pas de currency, pas de status, pas de sender_num
                }
                supabase.table("single_transfers").insert(single_data).execute()
                print(f"✅ Transaction insérée (Light): {result_detail.get('transfer_id')}")
            except Exception as db_err:
                print(f"⚠️ Erreur insertion single_transfers: {str(db_err)}")

        return jsonify({
            'status': 'PROCESSED',
            'details': result_detail,
            'mode': 'Single-via-Bulk'
        }), 200
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ==========================================
# 3. ROUTE SINGLE-DIRECT
# ==========================================

@app.route('/quotes/<quote_id>', methods=['PUT'])
def quote_callback(quote_id):
    data = request.json
    quote_responses[quote_id] = data
    return '', 200

@app.route('/transfer-single-direct', methods=['POST'])
def transfer_single_direct():
    # ... (Garde ta fonction existante ici, elle ne change pas) ...
    return jsonify({'status': 'ignored_for_now'}), 200

# ==========================================
# 4. CALLBACKS
# ==========================================

@app.route('/bulkQuotes/<bulk_id>', methods=['PUT'])
def receive_bulk_quote_callback(bulk_id):
    callback_results[bulk_id] = request.json
    return jsonify({'status': 'received'}), 200

@app.route('/bulkTransfers/<bulk_id>', methods=['PUT'])
def receive_bulk_transfer_callback(bulk_id):
    data = request.json
    results = data.get('individualTransferResults', [])
    success = sum(1 for r in results if r.get('transferState') == 'COMMITTED')
    failed = len(results) - success
    callback_results[bulk_id] = {
        'state': data.get('bulkTransferState'),
        'success': success,
        'failed': failed,
        'timestamp': data.get('completedTimestamp'),
        'results': results
    }
    return jsonify({'status': 'received'}), 200

@app.route('/bulkTransfers/<bulk_id>/callback', methods=['PUT'])
def receive_callback_alias(bulk_id):
    return receive_bulk_transfer_callback(bulk_id)

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)