from flask import Flask, request, jsonify, send_file, Response, stream_with_context
from flask_cors import CORS
import os
import json
import tempfile
import io
from chatbot_core import load_knowledge_base, process_csv_upload, generate_ai_response

app = Flask(__name__)
CORS(app)

# Load Knowledge Base once at startup
KB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'knowledge_base.json')
KNOWLEDGE_BASE = load_knowledge_base(KB_PATH)
KB_STR = json.dumps(KNOWLEDGE_BASE, indent=2, ensure_ascii=False)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "chatbot-backend"}), 200

@app.route('/chat', methods=['POST'])
def chat():
    """
    Handles text and audio inputs.
    Expects multipart/form-data:
    - 'message': (Optional) Text message
    - 'file': (Optional) Audio file
    """
    message = request.form.get('message', '')
    file = request.files.get('file')
    
    temp_path = None
    
    try:
        if file:
            # Save audio file temporarily
            fd, temp_path = tempfile.mkstemp(suffix=os.path.splitext(file.filename)[1])
            os.close(fd)
            file.save(temp_path)
        
        # Generate response (Streaming)
        def generate():
            try:
                response_stream = generate_ai_response(message, KB_STR, media_path=temp_path, stream=True)
                for chunk in response_stream:
                    yield chunk.text
            except Exception as e:
                yield f"Erreur: {str(e)}"
            finally:
                # Cleanup temp file
                if temp_path and os.path.exists(temp_path):
                    os.remove(temp_path)

        return Response(stream_with_context(generate()), mimetype='text/plain')

    except Exception as e:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({"error": str(e)}), 500

@app.route('/upload-csv', methods=['POST'])
def upload_csv_route():
    """
    Handles CSV uploads for load testing.
    Proxies to the external load test server.
    """
    file = request.files.get('file')
    if not file:
        return jsonify({"error": "No file provided"}), 400
    
    if not file.filename.lower().endswith('.csv'):
        return jsonify({"error": "File must be a CSV"}), 400

    temp_path = None
    try:
        fd, temp_path = tempfile.mkstemp(suffix='.csv')
        os.close(fd)
        file.save(temp_path)
        
        content, result_name_or_error = process_csv_upload(temp_path)
        
        if content:
            # It's a success, content is the ZIP bytes
            # Send directly from memory
            return send_file(
                io.BytesIO(content),
                mimetype='application/zip',
                as_attachment=True,
                download_name='rapport_resultat.zip'
            )
        else:
            return jsonify({"error": result_name_or_error}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == '__main__':
    # Running on port 5001 as requested (different from 5000)
    # Disable Flask debug mode for deployments. Use a production WSGI server (gunicorn/uvicorn) in production.
    app.run(host='0.0.0.0', port=5001, debug=False)
