from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from playwright.sync_api import Page, expect, sync_playwright

BASE = 'http://127.0.0.1:3025/'
OUT = Path(__file__).resolve().parent.parent / 'test-results'
OUT.mkdir(exist_ok=True)
receipts: list[dict[str, Any]] = []
errors: list[str] = []


def record(name: str, **data: Any) -> None:
    receipts.append({'name': name, 'passed': True, **data})
    print(f'PASS {name}', flush=True)


def snap(page: Page) -> dict[str, Any]:
    return page.evaluate('window.__labSnapshot()')


def pause(page: Page) -> None:
    control = page.get_by_role('button', name='Simülasyonu duraklat', exact=True)
    if control.count():
        control.click()


def go(page: Page, name: str) -> None:
    if page.viewport_size and page.viewport_size['width'] <= 760:
        page.get_by_role('button', name='Menüyü aç', exact=True).click()
    page.locator('nav').get_by_role('button', name=name, exact=True).click()


def step(page: Page, times: int = 1) -> None:
    for _ in range(times):
        page.get_by_role('button', name='Bir saniye ilerlet', exact=True).click()


def range_to(page: Page, name: str, value: float) -> None:
    slider = page.get_by_role('slider', name=name, exact=True)
    slider.fill(str(value))
    slider.dispatch_event('input')
    slider.dispatch_event('change')


def no_overflow(page: Page, name: str) -> None:
    sizes = page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')
    assert sizes['scroll'] <= sizes['width'], (name, sizes)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1536, 'height': 1100}, device_scale_factor=1)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
    pause(page)
    expect(page.get_by_role('heading', name='BLEED AIR & PRESSURIZATION LAB', exact=True)).to_be_visible()
    original = snap(page)['time']
    page.wait_for_timeout(250)
    assert snap(page)['time'] == original
    step(page)
    assert abs(snap(page)['time'] - original - 1) < 1e-6
    record('load / pause / single-step')

    names = page.locator('nav button').all_text_contents()
    for name in names:
        go(page, name)
        expect(page.locator('main h1')).to_be_visible()
        assert page.locator('main .panel:visible').count() > 0
        no_overflow(page, name)
    record('all 16 desktop sections render', sections=len(names))

    go(page, 'Sistem genel görünümü')
    page.get_by_role('button', name='GROUND', exact=True).click()
    pause(page)
    step(page, 2)
    s = snap(page)
    assert s['inflow'] == 0
    assert page.locator('[data-flow-id="engine-0"] .flow').count() == 0
    assert page.locator('[data-flow-id="pack-in-0"] .flow').count() == 0
    record('no phantom source / pack airflow')

    for name in ['APU MASTER', 'APU START', 'APU BLEED', 'ISOLATION VALVE']:
        page.get_by_role('switch', name=name, exact=True).click()
    step(page, 16)
    s = snap(page)
    assert s['sources'][2]['flow'] > 1.2
    assert all(pack['flow'] > .5 for pack in s['packs'])
    assert float(page.locator('[data-flow-id="crossbleed"]').get_attribute('data-flow') or '0') > 0
    record('APU spool / both pack paths / crossbleed')

    page.get_by_role('button', name='Crossbleed deneyini başlat', exact=True).click()
    pause(page)
    step(page, 4)
    s = snap(page)
    assert s['crossflow'] < -.4
    expect(page.locator('.trace-routes')).to_contain_text('ENG 2')
    assert page.locator('[data-flow-id="crossbleed"] .flow.reverse').count() == 1
    assert page.locator('[data-flow-id="right-source-segment"] .flow.reverse').count() == 1
    page.get_by_role('switch', name='ISOLATION VALVE', exact=True).click()
    step(page, 3)
    assert snap(page)['packs'][0]['flow'] == 0
    expect(page.locator('.trace-routes')).to_contain_text('Geçerli taze hava yolu yok')
    record('trace direction / isolation cuts path')

    page.get_by_role('button', name='Pack 1 neden', exact=True).click()
    expect(page.get_by_role('dialog')).to_contain_text('Pack', ignore_case=True)
    page.keyboard.press('Tab')
    assert page.evaluate('document.querySelector("[role=dialog]").contains(document.activeElement)')
    page.keyboard.press('Escape')
    expect(page.get_by_role('dialog')).to_have_count(0)
    record('live WHY dialog / keyboard')

    page.get_by_role('button', name='NORMAL', exact=True).click()
    pause(page)
    go(page, 'Serbest deney')
    sliders = page.locator('input[type=range]:visible')
    count = sliders.count()
    for i in range(count):
        slider = sliders.nth(i)
        old = slider.input_value()
        minimum, maximum = slider.get_attribute('min'), slider.get_attribute('max')
        label = slider.get_attribute('aria-label')
        for value in [minimum, maximum, old]:
            slider.fill(str(value))
            slider.dispatch_event('input')
            slider.dispatch_event('change')
        assert slider.input_value() == old, label
    switches = page.get_by_role('switch')
    for i in range(switches.count()):
        switch = switches.nth(i)
        old = switch.get_attribute('aria-checked')
        switch.click()
        assert switch.get_attribute('aria-checked') != old
        switch.click()
        assert switch.get_attribute('aria-checked') == old
    record('every free-experiment slider and switch', sliders=count, switches=switches.count())

    page.get_by_role('button', name='CRUISE', exact=True).click()
    pause(page)
    go(page, 'Outflow valve')
    initial = snap(page)['cabinAltitude']
    range_to(page, 'Manual outflow valve', 85)
    step(page, 5)
    s = snap(page)
    assert s['controls']['pressureMode'] == 'MANUAL'
    assert s['cabinAltitude'] > initial + 100
    assert s['outflowPosition'] > .8
    record('manual valve changes actual cabin pressure')

    go(page, 'Arıza laboratuvarı')
    page.get_by_role('button', name='CRUISE', exact=True).click()
    pause(page)
    page.get_by_role('textbox', name='Arıza ara', exact=True).fill('1 · Pack valve stuck closed')
    page.locator('.fault-card').click()
    step(page, 3)
    assert snap(page)['packs'][0]['flow'] == 0
    go(page, 'Pack / air conditioning')
    assert snap(page)['packs'][0]['flow'] == 0
    expect(page.locator('.status-rows')).to_contain_text('PACK OFF')
    go(page, 'Basınçlandırma')
    assert snap(page)['inflow'] < .7
    record('fault propagation across pack / pressure pages')

    go(page, 'Arıza laboratuvarı')
    page.get_by_role('button', name='Clear failures / rearm', exact=True).click()
    step(page, 4)
    assert snap(page)['faults'] == []
    assert snap(page)['inflow'] > 1.2
    with page.expect_download() as download:
        page.get_by_role('button', name='Dışa aktar', exact=True).click()
    event_data = json.loads(Path(download.value.path()).read_text())
    assert event_data and event_data[-1]['time'] <= snap(page)['time']
    record('clear / restore / event export')

    go(page, 'Rehberli deneyler')
    page.get_by_role('button', name='Başlangıç koşulunu yükle', exact=True).click()
    pause(page)
    page.get_by_role('button', name='Kontrollere git →', exact=True).click()
    for i in [1, 2]:
        page.get_by_role('button', name=f'Engine {i} MED', exact=True).click()
        page.get_by_role('switch', name=f'ENG {i} BLEED', exact=True).click()
    step(page, 10)
    page.get_by_role('button', name='Göreve dön →', exact=True).click()
    page.get_by_role('button', name='Sonucu ölç', exact=True).click()
    expect(page.get_by_role('status')).to_contain_text('Hedef gerçek sistem ölçümleriyle sağlandı')
    record('guided lab real measurement completion')

    go(page, 'Arıza teşhisi')
    page.get_by_role('button', name='Vakayı başlat', exact=True).click()
    pause(page)
    assert page.get_by_role('button', name='Teşhisi doğrula', exact=True).is_disabled()
    page.get_by_role('button', name='Inspect Valve', exact=True).click()
    page.get_by_role('button', name='Check Pressure', exact=True).click()
    page.get_by_role('combobox', name='Teşhis seçimi', exact=True).select_option(label='Pack 1 valve stuck closed')
    page.get_by_role('button', name='Teşhisi doğrula', exact=True).click()
    expect(page.get_by_role('status')).to_contain_text('Doğru')
    record('hidden diagnosis / measurements / correct answer')

    go(page, 'Quiz / challenge')
    page.get_by_role('button', name='Sorular', exact=True).click()
    page.locator('.answer-list button').first.click()
    expect(page.get_by_role('status')).to_contain_text('Doğru')
    assert page.locator('.answer-list button').first.is_disabled()
    page.get_by_role('button', name='Sonraki soru →', exact=True).click()
    expect(page.locator('.question')).to_contain_text('Motor gücü')
    page.get_by_role('button', name='Önce tahmin et', exact=True).click()
    assert page.get_by_role('button', name='Tahmini kilitle ve 20 s çalıştır', exact=True).is_disabled()
    page.get_by_role('button', name='Sağ kaynaktan hava alır', exact=True).click()
    page.get_by_role('button', name='Tahmini kilitle ve 20 s çalıştır', exact=True).click()
    expect(page.get_by_role('status')).to_contain_text('Tahminin doğru')
    assert snap(page)['time'] > 19.99
    record('quiz feedback / locked answer / prediction-before-run')

    page.get_by_role('button', name='Canlı challenge', exact=True).click()
    page.get_by_role('button', name='Challenge başlat', exact=True).click()
    page.get_by_role('button', name='Hız 30x', exact=True).click()
    page.wait_for_timeout(4500)
    expect(page.get_by_role('status')).to_contain_text('/100')
    expect(page.get_by_role('button', name='Simülasyonu başlat', exact=True)).to_be_visible()
    record('live challenge duration / score / automatic pause')

    go(page, 'Uçuş simülatörü')
    page.get_by_role('button', name='NORMAL', exact=True).click()
    pause(page)
    page.get_by_role('button', name='START FLIGHT', exact=True).click()
    page.wait_for_timeout(1200)
    assert snap(page)['phase'] == 'CLIMB'
    pause(page)
    assert page.locator('.graph-grid-layout .graph').count() == 4
    page.get_by_role('button', name='Profili durdur', exact=True).click()
    assert not snap(page)['flightRunning']
    record('flight phases / four synchronized plots / stop')

    page.get_by_role('combobox', name='Öğrenme seviyesi', exact=True).select_option('MAINTENANCE')
    go(page, 'Sistem genel görünümü')
    expect(page.get_by_role('heading', name='Actual / indicated', exact=True)).to_be_visible()
    page.get_by_role('combobox', name='Öğrenme seviyesi', exact=True).select_option('BASIC')
    assert 'level-basic' in (page.locator('.app').get_attribute('class') or '')
    expect(page.locator('.basic-synoptic')).to_be_visible()
    assert page.locator('.basic-synoptic .cooler').count() == 0
    page.get_by_role('combobox', name='Öğrenme seviyesi', exact=True).select_option('ENGINEERING')
    record('three learning levels')

    page.get_by_role('button', name='NORMAL', exact=True).click()
    pause(page)
    page.screenshot(path=str(OUT/'overview-desktop.png'), full_page=True, animations="disabled")
    go(page, 'Air cycle machine')
    page.screenshot(path=str(OUT/'acm-desktop.png'), full_page=True, animations="disabled")
    page.get_by_role('button', name='CRUISE', exact=True).click()
    pause(page)
    go(page, 'Basınçlandırma')
    page.screenshot(path=str(OUT/'pressure-desktop.png'), full_page=True, animations="disabled")

    go(page, 'Bileşen kütüphanesi')
    page.get_by_role('textbox', name='Bileşen ara', exact=True).fill('Check Valve')
    page.locator('.lesson-list:visible button').click()
    expect(page.locator('.lesson-copy:visible')).to_contain_text('geri akış')
    record('component search and detailed one-way explanation')

    go(page, 'Quiz / challenge')
    page.get_by_role('button', name='Canlı challenge', exact=True).click()
    page.get_by_role('button', name='Challenge başlat', exact=True).click()
    page.get_by_role('button', name='Sistem kontrolleri →', exact=True).click()
    expect(page.locator('.training-dock')).to_be_visible()
    page.get_by_role('button', name='NORMAL', exact=True).click()
    expect(page.locator('.training-dock')).to_have_count(0)
    pause(page)
    record('global reset cancels active training run')

    page.set_viewport_size({'width': 390, 'height': 844})
    for name in names:
        go(page, name)
        expect(page.locator('main h1')).to_be_visible()
        no_overflow(page, f'mobile {name}')
    record('all 16 mobile sections fit 390px', sections=len(names))
    go(page, 'Sistem genel görünümü')
    page.screenshot(path=str(OUT/'overview-mobile.png'), full_page=True, animations="disabled")
    assert page.locator('.synoptic').evaluate('(el)=>el.parentElement.scrollWidth>el.parentElement.clientWidth')
    page.locator('.synoptic').evaluate('(el)=>el.parentElement.scrollLeft=300')
    assert page.locator('.synoptic').evaluate('(el)=>el.parentElement.scrollLeft') > 0
    record('mobile schematic horizontal pan')
    go(page, 'Air cycle machine')
    page.screenshot(path=str(OUT/'acm-mobile.png'), full_page=True, animations="disabled")
    go(page, 'Basınçlandırma')
    page.screenshot(path=str(OUT/'pressure-mobile.png'), full_page=True, animations="disabled")

    page.emulate_media(reduced_motion='reduce')
    go(page, 'Sistem genel görünümü')
    assert page.locator('.flow').first.evaluate('(el)=>getComputedStyle(el).animationName') == 'none'
    record('reduced motion respected')
    assert not errors, errors
    record('zero page / console errors')
    browser.close()

(OUT/'browser-report.json').write_text(json.dumps({'checks':receipts,'errors':errors}, ensure_ascii=False, indent=2))
print(f'{len(receipts)} browser checks passed', flush=True)
