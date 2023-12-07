#!/usr/bin/env python3
import os, argparse, string, random, datetime
from flask import Flask, request, url_for, send_from_directory, send_file

# commandline arguments
parser = argparse.ArgumentParser()
parser.add_argument("destination", help="path to store uploads in")
parser.add_argument("-p", dest="prefix", help="path prefix in route", default="/diffusion/")
parser.add_argument("-H", dest="host", help="hostname in returned url", default="")
args = parser.parse_args()

# generate randomized filename with date prefix
def randname(ext = "png", n = 12):
    now = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    rand = ''.join(random.SystemRandom().choice(string.ascii_letters + string.digits) for _ in range(n))
    return f"{now}-{rand}.{ext}"

app = Flask(__name__)

@app.route(args.prefix, methods=["GET", "POST"])
def diffusion():

    # get random gallery index
    if request.method == "GET":
        return send_file("index.html")

    # upload new file
    if request.method == "POST":
        # check if file is present
        if "file" not in request.files:
            return "file is missing", 400
        file = request.files["file"]
        # check if file is image/png
        if file.content_type != "image/png":
            return "file must be image/png", 400
        # generate random name and save
        name = randname()
        file.save(os.path.join(args.destination, name))
        return { "link": args.host + url_for("specific", name=name) }

@app.route(args.prefix + "<name>")
def specific(name):
    return send_from_directory(args.destination, name)

@app.route(args.prefix + "random.png")
def randomimage():
    files = list(map(lambda f: f.name, filter(lambda e: e.is_file(), os.scandir(args.destination))))
    return send_from_directory(args.destination, random.SystemRandom().choice(files))

app.run(port=8000)