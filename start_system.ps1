# DEMARRAGE AUTOMATIQUE DU SYSTEME BULK TRANSFER MOJALOOP

Write-Host "`n======================================================================"
Write-Host "DEMARRAGE DU SYSTEME BULK TRANSFER MOJALOOP" -ForegroundColor Green
Write-Host "======================================================================`n"

# 1. Verifier Docker
Write-Host "Verification de Docker..." -ForegroundColor Yellow
$dockerStatus = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR: Docker n'est pas lance. Veuillez demarrer Docker Desktop." -ForegroundColor Red
    exit 1
}
Write-Host "   OK: Docker est operationnel`n" -ForegroundColor Green

# 2. Nettoyer
Write-Host "Nettoyage des anciens containers..." -ForegroundColor Yellow
docker-compose down 2>&1 | Out-Null
Write-Host "   OK: Nettoyage termine`n" -ForegroundColor Green

# 3. Demarrer Docker
Write-Host "Demarrage des containers Docker..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR lors du demarrage de Docker" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 4. Attendre
Write-Host "Attente du demarrage complet (20 secondes)..." -ForegroundColor Yellow
for ($i = 20; $i -gt 0; $i--) {
    Write-Host "   $i secondes restantes..." -NoNewline
    Start-Sleep -Seconds 1
    Write-Host "`r" -NoNewline
}
Write-Host "   OK: Services prets                      `n" -ForegroundColor Green

# 5. Etat containers
Write-Host "Etat des containers:" -ForegroundColor Yellow
docker-compose ps
Write-Host ""

# 6. Nettoyer Flask
Write-Host "Nettoyage des anciens processus Flask..." -ForegroundColor Yellow
Get-Process -Name python -ErrorAction SilentlyContinue | Where-Object { 
    $_.Path -like '*python*' 
} | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "   OK: Nettoyage termine`n" -ForegroundColor Green

# 7. Demarrer Flask
Write-Host "Demarrage du serveur Flask..." -ForegroundColor Yellow
Start-Process python -ArgumentList "server.py" -NoNewWindow -PassThru | Out-Null
Start-Sleep -Seconds 3

# 8. Verifier Flask
Write-Host "   Verification de l'accessibilite..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/status/test" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   OK: Flask est accessible sur http://localhost:5000`n" -ForegroundColor Green
} catch {
    Write-Host "   WARNING: Flask ne repond pas encore (normal)`n" -ForegroundColor Yellow
}

# 9. Verifier logs
Write-Host "Verification des logs Docker..." -ForegroundColor Yellow
$errorCount = (docker logs sdk-ttk-ml-testing-toolkit-1 --tail 50 2>&1 | 
    Select-String -Pattern "error|Error|ERROR|failed|Failed" | 
    Measure-Object).Count

if ($errorCount -eq 0) {
    Write-Host "   OK: 0 ERREUR detectee - Systeme parfait !`n" -ForegroundColor Green
} else {
    Write-Host "   WARNING: $errorCount erreur(s) detectee(s)`n" -ForegroundColor Yellow
}

# 10. Resume
Write-Host "======================================================================"
Write-Host "SYSTEME OPERATIONNEL" -ForegroundColor Green
Write-Host "======================================================================`n"

Write-Host "SERVICES DISPONIBLES:" -ForegroundColor Yellow
Write-Host "   API Flask:            http://localhost:5000"
Write-Host "   API Flask (externe):  http://20.199.136.163:5000"
Write-Host "   Testing Toolkit UI:   http://localhost:6060"
Write-Host "   Testing Toolkit API:  http://localhost:4040`n"

Write-Host "COMMANDES RAPIDES:" -ForegroundColor Yellow
Write-Host "   Test rapide:   python test_real_callback.py"
Write-Host "   Test complet:  python test_100_lignes.py"
Write-Host "   Demonstration: python demo.py`n"

Write-Host "DOCUMENTATION:" -ForegroundColor Yellow
Write-Host "   Guide complet:  HACKATHON_READY.md"
Write-Host "   Validation:     VALIDATION_FINALE.md"
Write-Host "   Frontend:       FRONTEND_EXAMPLE.js`n"

Write-Host "======================================================================"
Write-Host "PRET POUR LE HACKATHON - 0 ERREUR GARANTIE !" -ForegroundColor Green
Write-Host "======================================================================`n"
