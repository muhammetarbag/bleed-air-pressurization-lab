# Validation — Bleed Air & Pressurization Lab

Tarih: 2026-09-08. Son kaynaklar ve bunlardan üretilmiş `dist/` üzerinde doğrulandı.

## Sonuç

**PASS — yerel uygulama ve GitHub Pages'e uygun statik paket.** Uzak GitHub repository, Actions çalıştırması veya public Pages yayını bu teslim kapsamında yapılmadı; yayın başarısı iddia edilmez.

| Kontrol | Sonuç | Kanıt |
| --- | --- | --- |
| Model / içerik | PASS | `npm test`: 137 test, 137 passed, 0 failed / skipped |
| TypeScript | PASS | `npm run build` içindeki `tsc --noEmit`; ayrıca bağımsız `npm run typecheck` |
| Format | PASS | `npm run format:check` |
| Üretim build | PASS | `npm run build`; 28 statik dosya |
| Masaüstü / mobil kabul | PASS | `tests/browser_check.py`: 22 senaryo grubu |
| Bütün bölümler | PASS | 16 / 16 bölüm hem 1536 px hem 390 px genişlikte açıldı |
| Kontroller | PASS | Serbest deneyde 27 slider min / max / restore ve 15 switch aç / kapat; diğer bölüm akışları ayrıca test edildi |
| JavaScript | PASS | Geliştirme ve üretim tarayıcı kontrollerinde 0 page error / console error |
| GitHub Pages alt yolu | PASS | Üretim paketi `/bleed-air-pressurization-lab/` altında HTTP üzerinden çalıştırıldı |
| Statik dosyalar | PASS | 28 / 28 dosya HTTP 200, indirilen baytlar yerel `dist/` ile aynı; SHA-256 manifest kaydedildi |
| Üretim izolasyonu | PASS | Development-only `__labSnapshot` üretim kodunda ve `window` nesnesinde yok |
| Harici çalışma zamanı bağımlılığı | PASS | Üretim sayfasının bütün kaynak istekleri yerel uygulama alt yolundan; fontlar dahil |
| Üretim bağımlılık denetimi | PASS | `npm audit --omit=dev --json`: bilinen 0 vulnerability; bu tam güvenlik incelemesi değildir |
| Yeni dosya whitespace | PASS | 21 yazılmış kaynak / test / yapılandırma dosyasına `git diff --no-index --check /dev/null <file>` uygulandı |

## Fizik ve mantık kanıtı

- Atmosfer bağıntısı ve tersi −1.000 ila 43.000 ft aralığındaki referans noktalarda round-trip doğrulandı; 11 km geçişi süreklidir.
- Pnömatik kaynak debileri ile gerçek tüketim toplamı 1e-6 kg/s toleransında dengeli; tek yönlü kaynak check valfleri ters beslemeyi keser.
- Engine / APU / ground cart kullanılabilirliği, spool zamanı, bleed kapaması, crossbleed yönü, isolation stuck open / closed ve kaynak kapasite sınırı doğrulandı.
- Closed pack valve / OFF akışı keser; stuck-open pack komuta rağmen akar; bağımsız overheat protection gerçek akışı kapatabilir.
- Precooler sıcaklık gelişimi, duct leak algılama gecikmesi ve koruma kilitleri gerçek durum geçişi üretir. Stuck-open isolation arızalı tarafa karşı kaynak yükünü taşıyabilir.
- ACM compressor basınç / sıcaklığı artırır; turbine azaltır. Ram-air etkinliği, ground fan, inlet basıncı, demand ve iki farklı ACM arızası karşılaştırıldı.
- Recirculation kapandığında fresh-air talebi artar; kabine net kütle olarak sayılmaz. Üç bölge ısıl yük ve akışla zaman içinde değişir.
- Cabin pressure, net kütle integralinden; cabin altitude aynı atmosfer bağıntısının tersinden; ΔP iki mutlak basınçtan hesaplanır. Tek adımlık kütle–basınç ilişkisi sayısal olarak kontrol edildi.
- MANUAL outflow yönü, AUTO cruise regülasyonu, cabin schedule, positive / negative relief, hacim etkisi, yavaş / hızlı kaçak ve iki pack kaybı doğrulandı.
- Normal tam uçuş: **2.899,4 s**, bütün fazlar tamamlandı. En yüksek |cabin rate| **499,95 ft/min**, en yüksek ΔP **7,458 psi**, en yüksek cabin altitude **8.000,68 ft**, iniş sonrası ΔP **0,039 psi**.
- Ek uçuş matrisi: departure / destination / cruise değerleri `2500 / 5000 / 35000`, `7000 / 1000 / 43000`, `0 / 7000 / 20000` ft. Her profil tamamlandı, iniş ΔP < 0,12 psi kaldı.
- 47 arızanın her biri ve birleşik uç durum, NaN / Infinity / negatif kaynak debisi olmadan sınandı. Gerçek ve indicated değerlerin ayrı davranışı doğrulandı.
- 15 rehberli deneyin tamamı fizik motorundaki kontrollerle hedefe ulaştı. 12 teşhis vakası başlangıcı, 3 tahmin deneyi ve sıcak-kabin challenge çözümü doğrulandı.
- Artan kaçak challenge'ı 3 s ve 0,1 s ilerletme gruplarıyla aynı basıncı, aynı son kaçak alanını ve aynı puanı verdi. Bitiş 120 / 180 s gibi kesin simülasyon zamanı sınırında durur.

## Tarayıcı kapsamı

Yükleme, duraklatma / tek adım, 16 bölüm, geçersiz yolda akış olmaması, APU ve crossbleed, yönlü trace, keyboard / WHY dialog, 27 slider ve 15 switch, manuel outflow, sayfalar arası ortak arıza, clear / rearm, JSON event export, gerçek ölçümlü rehberli deney, gizli teşhis, quiz / prediction, süreli challenge puanı, uçuş fazı ve dört grafik, BASIC / ENGINEERING / MAINTENANCE, component search, global reset, mobil yatay şema kaydırma, reduced motion ve console kontrolleri yapıldı.

Üretim paketinde ayrıca 16 bölüm, gerçek crossbleed etkileşimi, mobil taşma, asset yanıtları ve geliştirme test yüzeyinin kaldırılması doğrulandı. Görsel inceleme için masaüstü, mobil, ACM ve basınçlandırma ekranları kaydedildi. Tam sayfa mobil ekran görüntülerinde menü geçiş animasyonu sabitlenerek yanlış ara-kare görüntüsü önlendi.

## Kanıt dosyaları

- `test-results/model-tests.txt`
- `test-results/browser-report.json`
- `test-results/production-report.json` — 28 çıktı dosyasının SHA-256 değerleri dahil
- `test-results/dependency-audit.json`
- `test-results/build.txt`
- `test-results/source-manifest.json` — doğrulanan kaynak dosyaları
- `test-results/overview-desktop.png`, `overview-mobile.png`
- `test-results/acm-desktop.png`, `acm-mobile.png`
- `test-results/pressure-desktop.png`, `pressure-mobile.png`
- `test-results/production-preview.png`, `production-mobile.png`

Tek ajanla geliştirildi. Gözlenen yerel araçlar: Node.js v26.8.1; Playwright 1.62.0 / Chromium. Tarayıcı testleri mevcut komşu `radio-navigation-lab/.venv/bin/python` ortamından çalıştırıldı; o ortamda değişiklik yapılmadı. Bağımsız kurulum `requirements-test.txt` içinde tanımlıdır.

## Model sınırları

Bu testler uygulamanın tanımlı eğitim modelini doğrular; gerçek uçak kalibrasyonu veya üretici doğrulaması değildir. Ağ yarı statik; kısmi isolation direnci, gerçek motor çalıştırma sekansı ve nem / water separation fiziği modellenmez. Basınç modeli izotermal kabul kullanır; kabin ısıl bölgeleri ayrı enerji dengeleridir. Kaynak kapasiteleri, koruma eşikleri, relief ve ACM oranları temsilîdir. Ayrıntılı varsayımlar `README.md` ve uygulamanın model / kaynaklar bölümünde bulunur.
