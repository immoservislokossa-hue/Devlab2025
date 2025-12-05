# Documentation Complète - Système de Transfert Bulk MojaLoop

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture du système](#architecture-du-système)
3. [Composants techniques](#composants-techniques)
4. [Installation et démarrage](#installation-et-démarrage)
5. [Utilisation](#utilisation)
6. [API et endpoints](#api-et-endpoints)
7. [Flux de données](#flux-de-données)
8. [Configuration](#configuration)
9. [Tests et validation](#tests-et-validation)
10. [Dépannage](#dépannage)

---

## 🎯 Vue d'ensemble

### Qu'est-ce que ce projet ?

Ce système est une **solution complète de traitement de transferts de masse** (bulk transfers) conforme au protocole **MojaLoop FSPIOP**. Il permet de :

- Traiter des fichiers CSV contenant jusqu'à **100 000 transactions**
- Valider automatiquement les données
- Exécuter les transferts via le SDK MojaLoop
- Générer des rapports détaillés (PDF + CSV)
- Stocker l'historique dans Supabase

### Cas d'usage

- **Tests de charge** pour valider la robustesse d'un système de paiement
- **Hackathons MojaLoop** pour démontrer l'intégration FSPIOP
- **Simulations** de transferts de masse sans infrastructure bancaire réelle
- **Validation technique** de connecteurs MojaLoop

### Caractéristiques principales

✅ Traitement par lots (batching) intelligent  
✅ Support des réponses synchrones et asynchrones  
✅ Gestion automatique des callbacks  
✅ Rapports PDF professionnels  
✅ Architecture Docker complète  
✅ Intégration Supabase pour l'historique  

---

## 🏗️ Architecture du système

### Schéma global

```
┌─────────────┐
│   Client    │ (Upload CSV)
│  (Browser)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│                    Flask Backend                        │
│                    (Port 5000)                          │
│  • Validation CSV                                       │
│  • Batching (1000 transactions/lot)                     │
│  • Génération rapports PDF/CSV                          │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│           MojaLoop SDK Scheme Adapter                   │
│              (Ports 4000-4002)                          │
│  • Traduction REST → FSPIOP                             │
│  • Signature JWS                                        │
│  • Gestion callbacks                                    │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│         MojaLoop Testing Toolkit (TTK)                  │
│              (Ports 4040, 5050, 6060)                   │
│  • Simulation du Switch                                 │
│  • Simulation banque destinataire                       │
│  • Interface UI de monitoring                           │
└─────────────────────────────────────────────────────────┘
```


### Flux de communication

```
1. Client → Flask : POST /transfer-bulk (CSV)
2. Flask → SDK : POST /bulkQuotes (demande de devis)
3. SDK → TTK : Requêtes FSPIOP
4. TTK → SDK : Réponses + Callbacks
5. SDK → Flask : PUT /bulkQuotes/{id} (callback)
6. Flask → SDK : POST /bulkTransfers (exécution)
7. SDK → TTK : Requêtes FSPIOP
8. TTK → SDK : Confirmation
9. SDK → Flask : PUT /bulkTransfers/{id} (callback)
10. Flask → Client : ZIP (PDF + CSV erreurs)
```

---

## 🔧 Composants techniques

### 1. Backend Flask (Python)

**Fichier principal** : `server.py`

**Responsabilités** :
- Exposition de l'API REST
- Validation des données CSV avec Pandas
- Orchestration des appels au SDK
- Réception des callbacks
- Génération de rapports avec ReportLab
- Persistance dans Supabase

**Technologies** :
- Flask 3.0.0
- Pandas 2.1.4 (manipulation CSV)
- ReportLab 4.0.7 (génération PDF)
- Requests 2.31.0 (HTTP client)
- Supabase (base de données)

### 2. Processeur de transferts bulk

**Fichier principal** : `bulk_transfer_processor.py`

**Responsabilités** :
- Découpage en lots (batching)
- Construction des payloads FSPIOP
- Gestion des retries (3 tentatives)
- Mapping des callbacks
- Tracking des résultats

**Logique de batching** :
```python
# Par défaut : 1000 transactions par lot
# Ajustable selon les besoins de performance
transfers_per_bulk = 1000
num_bulks = (len(payments) + transfers_per_bulk - 1) // transfers_per_bulk
```

### 3. MojaLoop SDK Scheme Adapter

**Image Docker** : `mojaloop/sdk-scheme-adapter:latest`

**Ports exposés** :
- **4000** : Inbound API (réception)
- **4001** : Outbound API (envoi) ← utilisé par Flask
- **4002** : Test API
- **9229** : Debug Node.js

**Configuration clé** (`mojaloop-connector-load-test.env`) :
```bash
PEER_ENDPOINT=ml-testing-toolkit:4040
BACKEND_ENDPOINT=http://backend:5000
DFSP_ID=itk-load-test-dfsp
CACHE_URL=redis://redis:6379
AUTO_ACCEPT_QUOTES=true
```

### 4. MojaLoop Testing Toolkit (TTK)

**Image Docker** : `mojaloop/ml-testing-toolkit:latest`

**Ports exposés** :
- **4040** : API principale
- **5050** : API admin
- **6060** : Interface web UI

**Optimisation mémoire** :
```yaml
environment:
  - NODE_OPTIONS=--max-old-space-size=4096
```

### 5. Redis

**Image Docker** : `redis:6.2.4-alpine`

**Rôle** : Cache pour le SDK (stockage des états de transaction)

**Port** : 6379

---

## 📦 Installation et démarrage

### Prérequis

- Docker Engine (version 20+)
- Docker Compose (version 2+)
- Python 3.9+ (pour tests locaux)
- 4 GB RAM minimum (8 GB recommandé)

### Installation rapide

#### Sur Linux/Mac

```bash
# 1. Cloner le projet
git clone <repository-url>
cd <project-directory>

# 2. Démarrer tous les services Docker
docker-compose up -d

# 3. Vérifier que les 4 containers sont actifs
docker-compose ps

# 4. Attendre 20 secondes pour l'initialisation
sleep 20

# 5. Démarrer Flask (optionnel si pas dans Docker)
python server.py
# OU en arrière-plan :
nohup python server.py > server.log 2>&1 &
```

#### Sur Windows (PowerShell)

```powershell
# Script automatisé fourni
.\start_system.ps1
```

### Vérification du démarrage

```bash
# Vérifier les logs du SDK
docker logs back-end-mojaloop-connector-load-test-1 --tail 20

# Vérifier les logs du TTK
docker logs back-end-ml-testing-toolkit-1 --tail 20

# Tester l'API Flask
curl http://localhost:5000/status/test
```

**Indicateurs de succès** :
- ✅ SDK : "Server running on port 4000"
- ✅ TTK : "Received callback response 200 OK"
- ✅ Flask : Réponse HTTP sur le port 5000

---

## 🚀 Utilisation

### 1. Préparation du fichier CSV

**Format requis** :

```csv
type_id,valeur_id,nom_complet,montant,devise
PERSONAL_ID,2291234567,Jean Dupont,5000,XOF
PERSONAL_ID,2299876543,Marie Martin,10000,XOF
```

**Règles de validation** :
- `type_id` : Doit être "PERSONAL_ID"
- `valeur_id` : 10 chiffres exactement
- `montant` : Nombre positif
- `devise` : "XOF" uniquement
- `nom_complet` : Texte libre

### 2. Envoi via API

#### Transfert bulk (CSV complet)

```bash
curl -X POST http://localhost:5000/transfer-bulk \
  -F "file=@payment_list.csv"
```

**Réponse** : Fichier ZIP contenant :
- `rapport.pdf` : Statistiques visuelles
- `erreurs.csv` : Liste des transactions échouées

#### Transfert unique

```bash
curl -X POST http://localhost:5000/transfer-single \
  -H "Content-Type: application/json" \
  -d '{
    "id": "2291234567",
    "montant": 5000
  }'
```

**Réponse JSON** :
```json
{
  "status": "PROCESSED",
  "details": {
    "transfer_id": "uuid...",
    "id_value": "2291234567",
    "amount": 5000,
    "status": "SUCCESS"
  }
}
```

### 3. Consultation de l'interface TTK

Ouvrir dans un navigateur : `http://localhost:6060`

**Fonctionnalités** :
- Visualisation des requêtes FSPIOP
- Monitoring en temps réel
- Logs détaillés
- Configuration des règles de simulation

---

## 🔌 API et endpoints

### Endpoints Flask (Port 5000)

#### POST /transfer-bulk

**Description** : Traite un fichier CSV de paiements en masse

**Paramètres** :
- `file` (multipart/form-data) : Fichier CSV

**Réponse** : 
- **200 OK** : Fichier ZIP (rapport.pdf + erreurs.csv)
- **400 Bad Request** : Fichier manquant ou invalide
- **500 Internal Server Error** : Erreur de traitement

**Exemple** :
```python
import requests

files = {'file': open('payments.csv', 'rb')}
response = requests.post('http://localhost:5000/transfer-bulk', files=files)

with open('report.zip', 'wb') as f:
    f.write(response.content)
```

#### POST /transfer-single

**Description** : Effectue un transfert unique

**Body JSON** :
```json
{
  "id": "2291234567",
  "montant": 5000
}
```

**Réponse JSON** :
```json
{
  "status": "PROCESSED",
  "details": {
    "transfer_id": "abc-123",
    "id_value": "2291234567",
    "amount": 5000,
    "status": "SUCCESS"
  }
}
```

#### PUT /bulkQuotes/{bulk_id}

**Description** : Callback pour les devis bulk (utilisé par le SDK)

**Body** : Résultats des quotes individuels

#### PUT /bulkTransfers/{bulk_id}

**Description** : Callback pour les transferts bulk (utilisé par le SDK)

**Body** : Résultats des transferts individuels

### Endpoints SDK (Port 4001)

#### POST /bulkQuotes

**Description** : Demande de devis pour un lot de transferts

**Payload** :
```json
{
  "homeTransactionId": "uuid",
  "bulkQuoteId": "uuid",
  "from": {
    "idType": "MSISDN",
    "idValue": "22912345678",
    "fspId": "itk-load-test-dfsp"
  },
  "individualQuotes": [...]
}
```

#### POST /bulkTransfers

**Description** : Exécution d'un lot de transferts

**Payload** :
```json
{
  "homeTransactionId": "uuid",
  "bulkTransferId": "uuid",
  "bulkQuoteId": "uuid",
  "from": {...},
  "individualTransfers": [...]
}
```

---

## 📊 Flux de données

### Cycle de vie d'un transfert bulk

#### Phase 1 : Ingestion et validation

```
1. Client upload CSV
2. Flask lit avec Pandas
3. Validation ligne par ligne :
   - type_id = "PERSONAL_ID" ?
   - valeur_id = 10 chiffres ?
   - montant > 0 ?
   - devise = "XOF" ?
4. Séparation :
   - correct_rows → traitement
   - uncorrect_rows → rapport d'erreurs
```

#### Phase 2 : Batching

```
1. Calcul du nombre de lots :
   num_bulks = ceil(total / 1000)
   
2. Pour chaque lot :
   - Génération bulk_quote_id
   - Génération bulk_transfer_id
   - Création de N individual_quotes
```

#### Phase 3 : Accord (Quote)

```
1. Flask → SDK : POST /bulkQuotes
2. SDK → TTK : Requêtes FSPIOP individuelles
3. TTK calcule les frais et conditions
4. TTK → SDK : Réponses
5. SDK → Flask : 
   - Option A : 200 OK + JSON (synchrone)
   - Option B : 202 Accepted + Callback ultérieur
6. Flask attend ou traite immédiatement
```

#### Phase 4 : Exécution (Transfer)

```
1. Flask extrait ilpPacket et condition des quotes
2. Flask → SDK : POST /bulkTransfers
3. SDK → TTK : Requêtes FSPIOP
4. TTK exécute les transferts
5. TTK → SDK : Confirmations
6. SDK → Flask : PUT /bulkTransfers/{id}
7. Flask stocke les résultats
```

#### Phase 5 : Reporting

```
1. Agrégation des résultats :
   - Nombre de succès
   - Nombre d'échecs
   - Montant total
   
2. Génération PDF avec ReportLab :
   - Tableau récapitulatif
   - Graphiques
   
3. Génération CSV des erreurs

4. Compression en ZIP

5. Envoi au client
```

### Gestion des callbacks

Le système supporte deux modes :

**Mode synchrone** (préféré) :
```python
response = requests.post(f'{SDK_URL}/bulkQuotes', json=payload)
if response.status_code == 200:
    data = response.json()
    # Traitement immédiat
```

**Mode asynchrone** :
```python
response = requests.post(f'{SDK_URL}/bulkQuotes', json=payload)
if response.status_code == 202:
    # Attente du callback
    for _ in range(30):
        if bulk_quote_id in callback_results:
            data = callback_results[bulk_quote_id]
            break
        time.sleep(1)
```

---

## ⚙️ Configuration

### Variables d'environnement Flask (.env)

```bash
# Supabase (optionnel)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJxxx...

# SDK URL (si différent du défaut)
SDK_URL=http://localhost:4001
```

### Configuration SDK (mojaloop-connector-load-test.env)

**Endpoints critiques** :
```bash
PEER_ENDPOINT=ml-testing-toolkit:4040
BACKEND_ENDPOINT=http://backend:5000
```

**Identité DFSP** :
```bash
DFSP_ID=itk-load-test-dfsp
```

**Cache** :
```bash
CACHE_URL=redis://redis:6379
```

**Comportement** :
```bash
AUTO_ACCEPT_QUOTES=true
AUTO_ACCEPT_PARTY=true
USE_QUOTE_SOURCE_FSP_AS_TRANSFER_PAYEE_FSP=true
```

**Sécurité (désactivée pour dev)** :
```bash
INBOUND_MUTUAL_TLS_ENABLED=false
OUTBOUND_MUTUAL_TLS_ENABLED=false
VALIDATE_INBOUND_JWS=false
JWS_SIGN=false
```

### Configuration Docker Compose

**Réseau** :
```yaml
networks:
  ml-sdk-ttk-net:
    driver: bridge
```

**Accès à l'hôte** (pour callbacks) :
```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

**Health checks** :
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:4001"]
  timeout: 20s
  retries: 10
  start_period: 40s
  interval: 30s
```

---

## 🧪 Tests et validation

### Tests automatisés fournis

#### 1. Test bulk local

```bash
python run_bulk_test.py
```

**Ce qu'il fait** :
- Démarre Flask automatiquement
- Envoie `resources/payment_list.csv`
- Attend la réponse
- Sauvegarde le rapport ZIP
- Arrête Flask

#### 2. Test VM distante

```bash
python test_remote_vm.py
```

**Configuration** :
```python
SERVER_URL = "http://20.199.136.163:5000"
```

**Ce qu'il fait** :
- Lit les 100 premières lignes du CSV
- Envoie à un serveur distant
- Mesure le temps de réponse
- Sauvegarde le rapport

### Tests manuels

#### Test de santé

```bash
# Vérifier que Flask répond
curl http://localhost:5000/status/test

# Vérifier que le SDK répond
curl http://localhost:4001/health

# Vérifier que le TTK répond
curl http://localhost:4040/api/health
```

#### Test de transfert unique

```bash
curl -X POST http://localhost:5000/transfer-single \
  -H "Content-Type: application/json" \
  -d '{"id": "2291234567", "montant": 1000}'
```

#### Test de transfert bulk minimal

```bash
# Créer un CSV de test avec 10 lignes
echo "type_id,valeur_id,nom_complet,montant,devise" > test.csv
for i in {1..10}; do
  echo "PERSONAL_ID,229123456$i,Test $i,1000,XOF" >> test.csv
done

# Envoyer
curl -X POST http://localhost:5000/transfer-bulk \
  -F "file=@test.csv" \
  -o result.zip
```

### Validation des logs

#### Logs SDK (aucune erreur attendue)

```bash
docker logs back-end-mojaloop-connector-load-test-1 --tail 50 | grep -i error
# Résultat attendu : vide
```

#### Logs TTK (vérifier les callbacks)

```bash
docker logs back-end-ml-testing-toolkit-1 --tail 50 | grep "200 OK"
# Résultat attendu : plusieurs lignes "Received callback response 200 OK"
```

#### Logs Flask

```bash
tail -f server.log | grep "CALLBACK"
# Résultat attendu :
# 💬 QUOTE CALLBACK REÇU pour bulk ...
# 📞 TRANSFER CALLBACK REÇU pour bulk ...
```

---

## 🔍 Dépannage

### Problème : "Payload too large"

**Symptôme** :
```
HTTP 413 Request Entity Too Large
```

**Cause** : Le lot dépasse la taille maximale du SDK

**Solution** :
```python
# Dans server.py, ligne ~XX
transfer_results = process_bulk_transfers(
    correct_rows, 
    callback_results, 
    transfers_per_bulk=100  # Réduire de 1000 à 100
)
```

### Problème : "Heap out of memory"

**Symptôme** :
```
FATAL ERROR: Reached heap limit Allocation failed
```

**Cause** : Node.js manque de mémoire

**Solution** :
```yaml
# Dans docker-compose.yml
ml-testing-toolkit:
  environment:
    - NODE_OPTIONS=--max-old-space-size=8192  # Augmenter à 8GB
```

### Problème : Callbacks non reçus

**Symptôme** :
```
Timeout waiting for bulkQuote data
```

**Diagnostic** :
```bash
# Vérifier que le SDK peut joindre Flask
docker exec back-end-mojaloop-connector-load-test-1 \
  curl http://backend:5000/status/test
```

**Solution** :
```yaml
# Vérifier dans docker-compose.yml
mojaloop-connector-load-test:
  environment:
    - BACKEND_ENDPOINT=http://backend:5000  # Nom du service, pas localhost
```

### Problème : Connection refused

**Symptôme** :
```
requests.exceptions.ConnectionError: Connection refused
```

**Causes possibles** :
1. Le service n'est pas démarré
2. Le port n'est pas exposé
3. Le firewall bloque

**Solutions** :
```bash
# 1. Vérifier que tous les services sont up
docker-compose ps

# 2. Vérifier les ports
netstat -tuln | grep -E '4001|5000|4040'

# 3. Redémarrer les services
docker-compose restart
```

### Problème : Supabase insert failed

**Symptôme** :
```
⚠️ Erreur insertion single_transfers: ...
```

**Cause** : Variables d'environnement manquantes ou table inexistante

**Solution** :
```bash
# 1. Vérifier le .env
cat .env | grep SUPABASE

# 2. Créer la table dans Supabase
CREATE TABLE single_transfers (
  id SERIAL PRIMARY KEY,
  transfer_id TEXT,
  payee_id_value TEXT,
  amount NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Problème : CSV encoding error

**Symptôme** :
```
UnicodeDecodeError: 'utf-8' codec can't decode
```

**Solution** :
```python
# Dans server.py, modifier :
df = pd.read_csv(file, encoding='utf-8-sig')  # Ajouter -sig
```

---

## 📚 Ressources supplémentaires

### Documentation MojaLoop

- [FSPIOP API Specification](https://docs.mojaloop.io/api/)
- [SDK Scheme Adapter](https://github.com/mojaloop/sdk-scheme-adapter)
- [Testing Toolkit](https://github.com/mojaloop/ml-testing-toolkit)

### Fichiers de configuration TTK

Le dossier `configs/ttk/spec_files/` contient :
- `api_definitions/` : Spécifications OpenAPI
- `rules_callback/` : Règles de callbacks
- `rules_response/` : Templates de réponses
- `rules_validation/` : Règles de validation

### Scripts utiles

- `start_system.ps1` : Démarrage automatique (Windows)
- `run_bulk_test.py` : Test local complet
- `test_remote_vm.py` : Test serveur distant

---

## 🎓 Concepts clés

### Qu'est-ce que FSPIOP ?

**Financial Services Interoperability Protocol** : Protocole standardisé par MojaLoop pour l'interopérabilité des paiements.

**Caractéristiques** :
- Basé sur REST/HTTP
- Signatures JWS pour la sécurité
- Callbacks asynchrones
- Support des transferts bulk

### Qu'est-ce qu'un DFSP ?

**Digital Financial Service Provider** : Fournisseur de services financiers numériques (banque, opérateur mobile money, etc.)

Dans ce projet :
- **Payer DFSP** : `itk-load-test-dfsp` (émetteur)
- **Payee DFSP** : `testingtoolkitdfsp` (destinataire simulé)

### Qu'est-ce qu'un bulk transfer ?

Un **transfert groupé** qui permet d'envoyer plusieurs paiements en une seule requête.

**Avantages** :
- Réduction de la latence réseau
- Optimisation des ressources
- Traitement atomique

**Phases** :
1. **Discovery** : Résolution des identifiants
2. **Agreement** : Négociation des frais (bulkQuotes)
3. **Transfer** : Exécution (bulkTransfers)

---

## 📞 Support

Pour toute question ou problème :

1. Vérifier les logs : `docker-compose logs -f`
2. Consulter cette documentation
3. Vérifier les issues GitHub du projet
4. Contacter l'équipe de développement

---

**Version** : 1.0.0  
**Dernière mise à jour** : 5 décembre 2025  
**Licence** : [À définir]
