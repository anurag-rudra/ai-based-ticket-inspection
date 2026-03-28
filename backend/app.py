from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from ticket_hygiene import analyse_all

app = Flask(__name__)
CORS(app, origins=["http://localhost:8000", "http://127.0.0.1:8000"])
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "input_data")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.route("/api/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"success": False, "message": "No file provided"}), 400
    f = request.files["file"]
    if f.filename == "":
        return jsonify({"success": False, "message": "Empty filename"}), 400

    filename = os.path.basename(f.filename)
    target = os.path.join(UPLOAD_DIR, filename)
    f.save(target)
    # TODO: parse/process CSV/XLSX (pandas, etc)
    return jsonify({"success": True, "filename": filename})

@app.route("/api/scan", methods=["POST"])
def scan():
    try:
        data = request.get_json() or {}
        filename = data.get("filename", "incident_event_log.csv")
        
        # Check if file is in upload directory
        csv_path = os.path.join(UPLOAD_DIR, filename)
        if not os.path.exists(csv_path):
            # Fall back to parent directory if not found in upload dir
            csv_path = os.path.join(os.path.dirname(UPLOAD_DIR), filename)
        
        if not os.path.exists(csv_path):
            return jsonify({"success": False, "message": f"File not found: {filename}"}), 404
        
        # Analyze all tickets
        results = analyse_all(csv_path)
        
        return jsonify({
            "success": True,
            "filename": filename,
            "results": results
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)