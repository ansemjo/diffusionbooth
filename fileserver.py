import os, argparse, uuid
from flask import Flask, flash, request, redirect, url_for, send_from_directory
from werkzeug.utils import secure_filename

# commandline arguments
parser = argparse.ArgumentParser()
parser.add_argument("destination", help="path to store uploads in")
args = parser.parse_args()

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = args.destination

@app.route("/diffusion", methods=["POST"])
def upload_file():
    # check if file is present
    if "file" not in request.files:
        return "file is missing", 400
    file = request.files["file"]
    # check if file is image/png
    if file.content_type != "image/png":
        return "file must be image/png", 400
    # generate random name and save
    name = str(uuid.uuid4()) + ".png"
    file.save(os.path.join(app.config["UPLOAD_FOLDER"], name))
    return { "link": url_for("download", name=name) }

@app.route("/diffusion/<name>")
def download(name):
    return send_from_directory(app.config["UPLOAD_FOLDER"], name)

app.run(port=8000)