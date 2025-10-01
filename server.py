import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient

load_dotenv()  # load variables from .env if present

MONGO_URI = os.environ.get('MONGO_URI')
DB_NAME = os.environ.get('DB_NAME', 'disaster_relief')

app = Flask(__name__)
CORS(app)

client = None
db = None

if MONGO_URI:
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"ok": True}), 200

@app.route('/api/camps', methods=['POST'])
def create_camp():
    if not db:
        return jsonify({"error": "Server not configured with MONGO_URI"}), 500
    data = request.get_json(force=True, silent=True) or {}
    required = [
        'campName','campType','maxCapacity','contactPhone','campAddress',
        'district','city','createdBy','amenities','lat','lng'
    ]
    missing = [k for k in required if k not in data or data[k] in (None, '', [])]
    if missing:
        return jsonify({"error": "Missing fields", "fields": missing}), 400

    doc = {
        'name': data['campName'],
        'type': data['campType'],
        'maxCapacity': int(data['maxCapacity']),
        'contactPhone': data['contactPhone'],
        'address': data['campAddress'],
        'district': data['district'],
        'city': data['city'],
        'amenities': data.get('amenities', []),
        'location': { 'type': 'Point', 'coordinates': [ float(data['lng']), float(data['lat']) ] },
        'createdBy': data['createdBy']
    }

    res = db.camps.insert_one(doc)
    return jsonify({"ok": True, "id": str(res.inserted_id)}), 201

if __name__ == '__main__':
    port = int(os.environ.get('PORT', '8000'))
    app.run(host='0.0.0.0', port=port)


