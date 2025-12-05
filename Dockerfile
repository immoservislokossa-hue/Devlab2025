FROM python:3.9-slim

WORKDIR /app

# Installation des dépendances système pour ReportLab (si nécessaire)
# RUN apt-get update && apt-get install -y libgl1-mesa-glx

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Le port 5000 sera exposé
EXPOSE 5000

# Lancement du serveur
CMD ["python", "server.py"]
