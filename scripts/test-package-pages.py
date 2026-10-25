import importlib.util
import json
from pathlib import Path
import tarfile
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("package_pages", Path(__file__).with_name("package-pages.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PagesPackageTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "site"
        self.root.mkdir()
        self.output = self.root.parent / "artifact.tar"
        for path, content in {
            "index.html": "CrossRun", "CNAME": "crossrunapp.fr\n", ".nojekyll": "",
            ".well-known/apple-app-site-association": json.dumps({"applinks": {"details": [{
                "appIDs": ["67WMYG23VK.fr.crossrun.app"], "components": [{"/": "/groups*"}]
            }]}}),
            ".git/config": "excluded", ".github/workflows/pages.yml": "excluded",
            "assets/logo.svg": "preserved", "strava/callback/index.html": "preserved",
        }.items():
            target = self.root / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content)

    def test_preserves_hidden_association_assets_and_callback(self):
        module.package(self.root, self.output)
        with tarfile.open(self.output) as archive:
            names = archive.getnames()
            self.assertIn("./.well-known/apple-app-site-association", names)
            self.assertIn("./.nojekyll", names)
            self.assertIn("./assets/logo.svg", names)
            self.assertIn("./strava/callback/index.html", names)
            self.assertFalse(any("/.git" in name for name in names))

    def test_missing_association_rejects_archive(self):
        (self.root / ".well-known/apple-app-site-association").unlink()
        with self.assertRaises(KeyError):
            module.package(self.root, self.output)
        self.assertFalse(self.output.exists())

    def test_wrong_application_rejects_archive(self):
        (self.root / ".well-known/apple-app-site-association").write_text('{"applinks":{"details":[]}}')
        with self.assertRaises(ValueError):
            module.package(self.root, self.output)
        self.assertFalse(self.output.exists())

    def test_output_inside_source_rejected(self):
        with self.assertRaises(ValueError):
            module.package(self.root, self.root / "artifact.tar")


if __name__ == "__main__":
    unittest.main()
