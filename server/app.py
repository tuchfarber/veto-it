import os
import time
import uuid

import couchdb
from flask import Flask, jsonify, request

app = Flask(__name__)

db_username = os.environ.get("COUCHDB_USER")
db_password = os.environ.get("COUCHDB_PASSWORD")

couch = couchdb.Server(f"https://{db_username}:{db_password}@localhost:5984")

if 'vetoit' in couch:
    db = couch['vetoit']
else:
    db = couch.create('vetoit')


# class LocalCouchDB:
#     def __init__(self):
#         self.data = {}

#     def save(self, datum):
#         key = str(uuid.uuid4())
#         self.data[key] = datum
#         return (key, None)

#     def __contains__(self, key):
#         return key in self.data.keys()

#     def __getitem__(self, key):
#         return self.data.get(key)

#     def delete(self, key):
#         del self.data[key]

# db = LocalCouchDB()

@app.route("/create", methods=["POST"])
def create():
    body = request.get_json()
    d_key = str(uuid.uuid4())
    data = {
        "gps": body["gps"],
        "init_km": body["init_km"],
        "del_ids": body["del_ids"],
        "d_key": d_key,
        "expires": int(time.time()) + 3600,
    }
    (d_id, _) = db.save(data)
    print(db.data)
    return jsonify({"d_id": d_id, "d_key": d_key})


@app.route("/retrieve/<d_id>/<d_key>", methods=["GET"])
def retrieve(d_id, d_key):
    if d_id in db:
        record = db[d_id]
        if record["expires"] < int(time.time()):
            db.delete(record)
            return {"status": "Error", "status_text": "Item has expired"}
        if d_key == record["d_key"]:
            return {"gps": record["gps"], "init_km": record["init_km"], "del_ids": record["del_ids"]}
        else:
            return {"status": "Error", "status_text": "Provided key invalid"}
    else:
        return jsonify({"status": "Error", "status_text": "Document does not exist"})

@app.route("/veto/<d_id>/<d_key>", methods=["POST"])
def veto(d_id, d_key):
    body = request.json
    if d_id in db:
        record = db[d_id]
        if record["expires"] < int(time.time()):
            db.delete(record)
            return jsonify({"status": "Error", "status_text": "Item has expired"})
        if d_key == record["d_key"]:
            unique_dels = list(set(body["del_ids"] + record["del_ids"]))
            record["del_ids"] = unique_dels
            db[record["_id"]] = record
            return jsonify({"status": "Success", "status_text": "Document successfully updated"})
        else:
            return jsonify({"status": "Error", "status_text": "Provided key invalid"})
    else:
        return jsonify({"status": "Error", "status_text": "Document does not exist"})
