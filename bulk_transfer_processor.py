import uuid
import requests
import time
import json
from datetime import datetime

import os

# Configuration: Utiliser le SDK comme proxy vers TTK
# Le SDK expose les endpoints Outbound sur le port 4001
# En Docker, on utilise le nom du service 'mojaloop-connector-load-test'
SDK_FSPIOP_URL = os.environ.get('SDK_URL', 'http://localhost:4001')
payer_fsp = 'itk-load-test-dfsp'
payee_fsp = 'testingtoolkitdfsp'
payer_id = '22912345678'

def process_bulk_transfers(payments, callback_results, transfers_per_bulk=1000):
    results = []
    num_bulks = (len(payments) + transfers_per_bulk - 1) // transfers_per_bulk
    session = requests.Session()
    
    print(f"\n{'='*60}")
    print(f"STARTING BULK PROCESSING")
    print(f"{'='*60}")
    print(f"Total paiements: {len(payments):,}")
    print(f"Nombre de batches: {num_bulks}")
    print(f"Taille par batch: {transfers_per_bulk}")
    print(f"{'='*60}\n")
    
    for bulk_num in range(num_bulks):
        start_idx = bulk_num * transfers_per_bulk
        end_idx = min(start_idx + transfers_per_bulk, len(payments))
        batch_payments = payments[start_idx:end_idx]
        
        bulk_transfer_id = str(uuid.uuid4())
        bulk_quote_id = str(uuid.uuid4())
        
        print(f"\nBatch {bulk_num + 1}/{num_bulks} - {len(batch_payments)} paiements")
        print(f"   Quote ID: {bulk_quote_id[:8]}...")
        print(f"   Transfer ID: {bulk_transfer_id[:8]}...")
        
        individual_quotes = []
        payment_tracking = []
        
        # Structure 'from' (Payer)
        payer_party = {
            "idType": "MSISDN",
            "idValue": payer_id,
            "fspId": payer_fsp
        }

        for payment in batch_payments:
            transfer_id = str(uuid.uuid4())
            quote_id = str(uuid.uuid4())
            
            payment_tracking.append({
                'transfer_id': transfer_id,
                'quote_id': quote_id,
                'payment': payment
            })
            
            # Structure 'to' (Payee)
            payee_party = {
                "idType": "MSISDN",
                "idValue": str(payment['valeur_id']),
                "fspId": payee_fsp
            }

            # Individual Quote pour le SDK
            individual_quotes.append({
                "quoteId": quote_id,
                "to": payee_party,
                "amountType": "SEND",
                "currency": payment['devise'],
                "amount": f"{payment['montant']:.0f}" if payment['montant'] % 1 == 0 else f"{payment['montant']:.2f}".rstrip('0').rstrip('.'),
                "transactionType": "TRANSFER", # Le SDK attend une string "TRANSFER", pas l'objet complexe
                "note": f"Payment to {payment['nom_complet']}"
            })

        # Payload Bulk Quote conforme au SDK Outbound API
        bulk_quote_payload = {
            "homeTransactionId": str(uuid.uuid4()), # Requis par le SDK
            "bulkQuoteId": bulk_quote_id,
            "from": payer_party,
            "individualQuotes": individual_quotes
        }
        
        # Headers simplifiés pour le SDK (le SDK gère les headers FSPIOP sortants)
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        quote_success = False
        quote_response_data = None
        print(f"   Sending bulkQuote via SDK...")
        for attempt in range(3):
            # Note: Le SDK Outbound API utilise des JSON standards, pas les content-types FSPIOP
            response = session.post(f'{SDK_FSPIOP_URL}/bulkQuotes', headers=headers, json=bulk_quote_payload, timeout=30)
            if response.status_code in [200, 202]:
                quote_success = True
                print(f"   Quote success (HTTP {response.status_code})")
                if response.status_code == 200:
                    try:
                        quote_response_data = response.json()
                    except:
                        pass
                break
            else:
                print(f"   Quote failed attempt {attempt + 1}/3 (HTTP {response.status_code})")
            time.sleep(1 + attempt)
        
        if quote_success:
            callback_data = None
            if quote_response_data:
                print("   Quote results received in response. Processing transfers...")
                callback_data = quote_response_data
            else:
                print(f"   Waiting for bulkQuote callback...")
                # Wait for callback
                max_retries = 30
                for _ in range(max_retries):
                    if bulk_quote_id in callback_results:
                        callback_data = callback_results[bulk_quote_id]
                        break
                    time.sleep(1)
            
            if not callback_data:
                print("   Timeout waiting for bulkQuote data")
                quote_success = False
            else:
                # Map quotes to transfers
                quote_map = {q['quoteId']: q for q in callback_data.get('individualQuoteResults', [])}
                
                individual_transfers = []
                
                for pt in payment_tracking:
                    quote_result = quote_map.get(pt['quote_id'])
                    
                    if not quote_result:
                        print(f"   Warning: No quote result for {pt['quote_id']}")
                        continue
                        
                    payment = pt['payment']
                    payee_party = {
                        "idType": "MSISDN",
                        "idValue": str(payment['valeur_id']),
                        "fspId": payee_fsp
                    }
                    
                    transfer_item = {
                        "transferId": pt['transfer_id'],
                        "to": payee_party,
                        "amountType": "SEND",
                        "currency": payment['devise'],
                        "amount": f"{payment['montant']:.0f}" if payment['montant'] % 1 == 0 else f"{payment['montant']:.2f}".rstrip('0').rstrip('.'),
                        "transactionType": "TRANSFER",
                        "note": f"Payment to {payment['nom_complet']}"
                    }
                    
                    # Add ILP Packet and Condition from Quote
                    if 'ilpPacket' in quote_result:
                        transfer_item['ilpPacket'] = quote_result['ilpPacket']
                    if 'condition' in quote_result:
                        transfer_item['condition'] = quote_result['condition']
                        
                    individual_transfers.append(transfer_item)

                print(f"   Sending bulkTransfer via SDK...")
                # Payload Bulk Transfer conforme au SDK Outbound API
                bulk_transfer_payload = {
                    "homeTransactionId": str(uuid.uuid4()),
                    "bulkTransferId": bulk_transfer_id,
                    "bulkQuoteId": bulk_quote_id,
                    "from": payer_party,
                    "individualTransfers": individual_transfers
                }
                
                transfer_success = False
                for attempt in range(3):
                    response = session.post(f'{SDK_FSPIOP_URL}/bulkTransfers', headers=headers, json=bulk_transfer_payload, timeout=30)
                    if response.status_code in [200, 202]:
                        transfer_success = True
                        print(f"   Transfer success (HTTP {response.status_code})")
                        break
                    else:
                        print(f"   Transfer failed attempt {attempt + 1}/3 (HTTP {response.status_code})")
                        print(f"   Response: {response.text}")
                    time.sleep(1 + attempt)
                
                print(f"   Result: {'SUCCESS' if transfer_success else 'FAILED'} - {len(batch_payments)} paiements")
                
                for pt in payment_tracking:
                    results.append({
                        'bulk_id': bulk_transfer_id,
                        'transfer_id': pt['transfer_id'],
                        'id_value': pt['payment']['valeur_id'],
                        'name': pt['payment']['nom_complet'],
                        'amount': pt['payment']['montant'],
                        'currency': pt['payment']['devise'],
                        'status': 'SUCCESS' if transfer_success else 'FAILED',
                        'error': '' if transfer_success else f'Transfer failed: {response.status_code}'
                    })
        else:
            for pt in payment_tracking:
                results.append({
                    'bulk_id': bulk_transfer_id,
                    'transfer_id': pt['transfer_id'],
                    'id_value': pt['payment']['valeur_id'],
                    'name': pt['payment']['nom_complet'],
                    'amount': pt['payment']['montant'],
                    'currency': pt['payment']['devise'],
                    'status': 'FAILED',
                    'error': f'Quote failed: {response.status_code}'
                })
        
        time.sleep(1)
    
    return results



