"""Run with: python -m unittest discover -s backend/tests -p test_spa_static.py"""
import sys
import tempfile
import unittest
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from spa_static import SPAStaticFiles


class SPARoutingTests(unittest.TestCase):
    def test_deep_links_and_real_404s(self):
        with tempfile.TemporaryDirectory() as directory:
            build = Path(directory)
            (build / "index.html").write_text("<html>SPA entry</html>")
            (build / "static").mkdir()
            (build / "static" / "app.js").write_text("/* real asset */")
            app = FastAPI()

            @app.get("/api/health")
            def health():
                return {"status": "ok"}

            app.mount("/", SPAStaticFiles(directory=directory, html=True))
            with TestClient(app) as client:
                for path in ("/", "/services", "/services/dental", "/appointment",
                             "/about", "/dogs", "/cats", "/critters", "/admin/login",
                             "/portal/pets/example", "/404"):
                    with self.subTest(path=path):
                        response = client.get(path)
                        self.assertEqual(response.status_code, 200)
                        self.assertIn("SPA entry", response.text)
                for path in ("/api", "/api/missing", "/api/missing.json",
                             "/static/missing.js", "/images/missing.webp",
                             "/images/missing", "/missing.css", "/services/missing.js"):
                    with self.subTest(path=path):
                        self.assertEqual(client.get(path).status_code, 404)
                self.assertEqual(client.get("/api/health").json(), {"status": "ok"})
                self.assertEqual(client.get("/static/app.js").text, "/* real asset */")
                self.assertEqual(client.head("/appointment").status_code, 200)
                self.assertEqual(client.post("/appointment").status_code, 405)


if __name__ == "__main__":
    unittest.main()
