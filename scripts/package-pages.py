"""Build the Pages artifact without dropping Apple's hidden .well-known path."""
import json
from pathlib import Path
import subprocess
import sys
import tarfile


def package(source, output):
    source, output = Path(source).resolve(), Path(output).resolve()
    if output.is_relative_to(source):
        raise ValueError("Pages archive must be outside the source directory")
    subprocess.run([
        "tar", "--dereference", "--hard-dereference", "--directory", str(source),
        "-cf", str(output), "--exclude=.git", "--exclude=.github", ".",
    ], check=True)
    try:
        with tarfile.open(output) as archive:
            for path in ("index.html", "CNAME", ".nojekyll", ".well-known/apple-app-site-association"):
                member = archive.getmember("./" + path)
                if not member.isfile():
                    raise ValueError(f"Required Pages file is not a regular file: {path}")
            with archive.extractfile("./.well-known/apple-app-site-association") as stream:
                association = json.load(stream)
            details = association["applinks"]["details"]
            if not any("67WMYG23VK.fr.crossrun.app" in item.get("appIDs", [])
                       and item.get("components") for item in details):
                raise ValueError("Missing CrossRun iOS association or URL components")
            if archive.extractfile("./CNAME").read().decode().strip() != "crossrunapp.fr":
                raise ValueError("Unexpected Pages domain")
    except Exception:
        output.unlink(missing_ok=True)
        raise
    print("Pages archive verified: AASA, .nojekyll, domain and homepage included")


if __name__ == "__main__":
    package(sys.argv[1], sys.argv[2])
