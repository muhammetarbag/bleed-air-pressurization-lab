from __future__ import annotations

import hashlib
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse
from urllib.request import urlopen
from typing import Any

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
OUT = ROOT / 'test-results'
PREFIX = '/bleed-air-pressurization-lab/'
OUT.mkdir(exist_ok=True)


class ArtifactHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(DIST), **kwargs)

    def translate_path(self, path: str) -> str:
        resource = unquote(urlparse(path).path)
        if not resource.startswith(PREFIX):
            return str(DIST / '__not_found__')
        relative = resource.removeprefix(PREFIX)
        target = (DIST / relative).resolve()
        return str(target) if target.is_relative_to(DIST) else str(DIST / '__not_found__')

    def log_message(self, fmt: str, *args: Any) -> None:
        pass


assert (DIST / 'index.html').is_file(), 'Run npm run build first'
files = sorted(p for p in DIST.rglob('*') if p.is_file())
for item in files:
    assert not item.name.startswith('.env')
    assert item.suffix not in {'.map', '.ts', '.tsx', '.py', '.toml'}
for asset in (DIST / 'assets').glob('*.js'):
    code = asset.read_text()
    assert '__labSnapshot' not in code, 'Development-only hook leaked into production'
for source in (ROOT / 'src').rglob('*'):
    if source.suffix in {'.ts', '.tsx'}:
        assert 'Math.random' not in source.read_text(), str(source)

server = ThreadingHTTPServer(('127.0.0.1', 0), ArtifactHandler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
base = f'http://127.0.0.1:{server.server_port}{PREFIX}'
errors: list[str] = []
responses: list[dict[str, Any]] = []
try:
    manifest: dict[str, str] = {}
    for item in files:
        relative = item.relative_to(DIST).as_posix()
        with urlopen(base + relative, timeout=10) as response:
            data = response.read()
            assert response.status == 200
        assert data == item.read_bytes(), relative
        manifest[relative] = hashlib.sha256(data).hexdigest()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1536, 'height': 1000})
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
        page.on('response', lambda response: responses.append({'url': response.url, 'status': response.status}))
        page.goto(base)
        page.wait_for_load_state('networkidle')
        expect(page.get_by_role('heading', name='BLEED AIR & PRESSURIZATION LAB', exact=True)).to_be_visible()
        page.get_by_role('button', name='Simülasyonu duraklat', exact=True).click()
        assert page.evaluate('typeof window.__labSnapshot') == 'undefined'
        sections = page.locator('nav button').all_text_contents()
        for name in sections:
            page.locator('nav').get_by_role('button', name=name, exact=True).click()
            expect(page.locator('main h1')).to_be_visible()
        page.locator('nav').get_by_role('button', name='Sistem genel görünümü', exact=True).click()
        page.get_by_role('button', name='Crossbleed deneyini başlat', exact=True).click()
        page.get_by_role('button', name='Simülasyonu duraklat', exact=True).click()
        for _ in range(5):
            page.get_by_role('button', name='Bir saniye ilerlet', exact=True).click()
        expect(page.locator('.trace-routes')).to_contain_text('ENG 2')
        assert float(page.locator('[data-flow-id="crossbleed"]').get_attribute('data-flow') or '0') < -.4
        page.get_by_role('button', name='NORMAL', exact=True).click()
        page.get_by_role('button', name='Simülasyonu duraklat', exact=True).click()
        page.screenshot(path=str(OUT/'production-preview.png'), full_page=False, animations='disabled')
        page.set_viewport_size({'width':390,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT/'production-mobile.png'), full_page=False, animations='disabled')
        assert not errors, errors
        assert all(response['status'] < 400 for response in responses), responses
        assert all(response['url'].startswith(base) for response in responses), 'External runtime resource requested'
        browser.close()
    report = {
        'status':'PASS', 'prefix':PREFIX, 'asset_count':len(files), 'all_asset_bytes_match':True,
        'sections_rendered':len(sections), 'mobile_width':390, 'console_errors':errors,
        'development_hook_in_production':False, 'requests':responses, 'sha256':manifest,
    }
    (OUT/'production-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps({k:v for k,v in report.items() if k not in {'requests','sha256'}}, ensure_ascii=False, indent=2))
finally:
    server.shutdown()
    server.server_close()
    thread.join(timeout=5)
