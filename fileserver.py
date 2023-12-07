#!/usr/bin/env python3
import os, argparse, string, random, datetime
from flask import Flask, request, url_for, send_from_directory

# commandline arguments
parser = argparse.ArgumentParser()
parser.add_argument("destination", help="path to store uploads in")
parser.add_argument("-p", dest="prefix", help="path prefix in route", default="/diffusion")
parser.add_argument("-H", dest="host", help="hostname in returned url", default="")
args = parser.parse_args()

# generate randomized filename with date prefix
def randnow(ext = "png", n = 12):
    now = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    rand = ''.join(random.SystemRandom().choice(string.ascii_letters + string.digits) for _ in range(n))
    return f"{now}-{rand}.{ext}"

app = Flask(__name__)

@app.route(args.prefix, methods=["POST"])
def upload_file():
    # check if file is present
    if "file" not in request.files:
        return "file is missing", 400
    file = request.files["file"]
    # check if file is image/png
    if file.content_type != "image/png":
        return "file must be image/png", 400
    # generate random name and save
    name = randnow()
    file.save(os.path.join(args.destination, name))
    return { "link": args.host + url_for("download", name=name) }

@app.route(args.prefix + "/<name>")
def download(name):
    return send_from_directory(args.destination, name)

app.run(port=8000)