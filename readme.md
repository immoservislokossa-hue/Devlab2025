# Système de Transfert Bulk MojaLoop avec SDK

## Configuration IMPORTANTE

### ✅ Architecture avec SDK (Option A - Pour Hackathon)

```
CSV → Flask → SDK (port 4000) → ml-testing-toolkit → Callbacks → SDK → Flask
```

### Modifications effectuées

1. **bulk_transfer_processor.py**
   - URL changée : `http://localhost:4000` (SDK au lieu de TTK 4040)
   - `payer_fsp = 'itk-load-test-dfsp'` (restauré)

2. **server.py**
   - Endpoints callbacks : `PUT /bulkQuotes/<bulk_id>` et `PUT /bulkTransfers/<bulk_id>`
   - Ces endpoints reçoivent les callbacks du SDK

3. **mojaloop-connector-load-test.env**
   - Configuration complète du SDK
   - `PEER_ENDPOINT=http://ml-testing-toolkit:4040` (SDK → TTK)
   - `BACKEND_ENDPOINT=http://host.docker.internal:5000` (SDK → Flask callbacks)

4. **docker-compose.yml**
   - Container SDK actif
   - `extra_hosts` pour accès à l'hôte

---

## Démarrage sur VM

### 1. Vérifier les 4 containers
```bash
docker-compose up -d
docker-compose ps
```

Vous DEVEZ avoir 4 containers :
- ✅ ml-testing-toolkit
- ✅ ml-testing-toolkit-ui
- ✅ mojaloop-connector-load-test (SDK)
- ✅ redis

### 2. Vérifier les logs du SDK
```bash
docker logs back-end-mojaloop-connector-load-test-1 --tail 20
```

Vous DEVEZ voir : "Server running on port 4000" (ou similaire)

### 3. Démarrer Flask
```bash
nohup python server.py > server.log 2>&1 &
```

### 4. Tester
```bash
python test_vm.py
```

---

## Vérification des callbacks

### Dans les logs Flask :
```
💬 QUOTE CALLBACK REÇU pour bulk ...
📞 TRANSFER CALLBACK REÇU pour bulk ...
State: ACCEPTED
✅ Success: X
```

### Dans les logs SDK :
```bash
docker logs back-end-mojaloop-connector-load-test-1 --tail 30
```

Cherchez : "Callback sent" ou "POST to backend"

### Dans les logs TTK (0 erreur) :
```bash
docker logs back-end-ml-testing-toolkit-1 --tail 30
```

Vous DEVEZ voir : "Received callback response 200 OK"

---

## Endpoints

- POST /transfer-bulk - Upload CSV (appelle SDK)
- GET /status/{bulk_id} - Statut du transfert
- PUT /bulkQuotes/{bulk_id} - Callback quote (reçu du SDK)
- PUT /bulkTransfers/{bulk_id} - Callback transfer (reçu du SDK)

---

## Architecture Complète

```
1. Client upload CSV
   ↓
2. Flask valide et batch (1000/batch)
   ↓
3. Flask → SDK (port 4000) : POST /bulkQuotes, POST /bulkTransfers
   ↓
4. SDK → ml-testing-toolkit (port 4040) : Requêtes FSPIOP
   ↓
5. TTK traite et génère callbacks
   ↓
6. TTK → SDK (callbacks)
   ↓
7. SDK → Flask (port 5000) : PUT /bulkQuotes/{ID}, PUT /bulkTransfers/{ID}
   ↓
8. Flask stocke résultats et génère rapport PDF
   ↓
9. Client télécharge ZIP (PDF + CSV erreurs)
```

---

## Résultat attendu

✅ SDK actif et fonctionnel  
✅ Callbacks transitent par le SDK  
✅ 0 erreur dans tous les logs  
✅ Rapports PDF générés  
✅ Architecture MojaLoop complète  
