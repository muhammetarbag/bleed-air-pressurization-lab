# Bleed Air & Pressurization Lab

ATA 21 / ATA 36 için Türkçe, etkileşimli, genel çift motorlu uçak eğitim laboratuvarı. React + TypeScript + SVG; backend ve çalışma zamanında harici servis gerektirmez. Fontlar yerel paketlenir.

## Çalıştırma

```sh
npm ci
npm run dev
```

Yerel adres: http://127.0.0.1:3025/ . Üretim çıktısı `npm run build` ile `dist/` altında oluşur. `npm run preview` üretim çıktısını aynı portta sunar; önce geliştirme sunucusunu durdurun.

Canlı sürüm: [Bleed Air &amp; Pressurization Lab](https://muhammetarbag.github.io/bleed-air-pressurization-lab/)

## Öğrenme alanları

16 bölüm aynı `AircraftState` nesnesini kullanır: sistem sinoptiği, bleed temelleri, engine / precooler, manifold / crossbleed, pack / ram air, ACM, üç kabin bölgesi, basınçlandırma, manuel outflow, tam uçuş, arızalar, teşhis, 15 rehberli deney, serbest deney, 20 bileşen ve 42 sorulu quiz. Ayrıca üç tahmin deneyi ve dört süreli challenge bulunur. BASIC görünüm ana kaynak, pack, kabin ve outflow bloklarını sadeleştirir; ENGINEERING ayrıntılı sinoptiği, MAINTENANCE actual / indicated ölçümlerini gösterir. Artan kaçak ve challenge puanı fizik alt adımlarında hesaplanır; ekran yenilemesine bağlı değildir.

Kaynak, pack, isolation ve outflow hareketleri; kütle, sıcaklık ve uçuş profili ortak motor tarafından hesaplanır. Sayfa değişimi sistemi sıfırlamaz. Global reset ve hazır senaryo yükleme, aktif eğitim görevini sonlandırır; quiz cevapları ve tamamlanan deneylerin listesi sekme açık kaldığı sürece korunur. Kalıcı kullanıcı hesabı veya sunucu kaydı yoktur.

`PAUSE`, `STEP +1 s`, 1× / 2× / 5× / 10× / 30× kontrolleri bütün modeli etkiler. Arızalar farklı semptomlar üretir. Teşhis vakasında arıza adı gizlenir; en az iki ölçümden sonra teşhis doğrulanır. Ölçüm defteri ölçüm anını kaydeder. `WHY?` canlı değerleri açıklar; `TRACE AIRFLOW` yalnız geçerli besleme yollarını gösterir.

## Model

- Atmosfer: standart troposfer bağıntısı, 11 km üzerinde sürekli izotermal katman; aynı bağıntının tersi cabin altitude verir. Basınçlar modelde Pa, manifold gösteriminde yerel dış basınca göre gauge psi, ACM aşamalarında absolute kPa.
- Pnömatik ağ: her kaynak sonlu debi–basınç karakteristiğine sahiptir. Kaynak check valfleri ters akışı keser. Basınç, açık kaynak ve tüketici eğrilerinin denge noktasında bulunur. Isolation açıkken iki taraf ortak basınç düğümü kabul edilir; valfin kısmi açıklık direnci modellenmez. Stuck open / closed ve duct leak koruması fiziksel yolu etkiler.
- Kaynaklar: motor RPM, ham basınç/sıcaklık ve kapasiteyi etkiler. PRSOV ve precooler regülasyonu temsilîdir. APU hazır olma süresi, 15.000 ft altı bleed sınırı ve yerde external pneumatic air varsayımları uçak tipine özgü değildir. Starter ve anti-ice yalnız temsilî yüklerdir; gerçek motor çalıştırma sırası modellenmez.
- ACM: iki ısı değiştirici, basınç oranlı kompresör, türbin genişlemesi ve sıcaklık bypass kontrolü. Ram air süreç havasına karışmaz. Water separator aşaması kavramsaldır; nem / buz / su ayrışması hesaplanmaz. Gösterilen RPM normalize eğitim değeridir.
- Isıl bölgeler: hava ile taşınan ısı, temsilî yolcu yükü, güneş/çevre yükü, dış sıcaklık, ısıl kütle ve zone trim. Recirculation debisi net taze kütle sayılmaz; dönüş karışımı bölge debileriyle ağırlıklandırılır.
- Basınç: `dP/dt = R*T/V * netMassFlow`. Basınç modeli 295 K izotermal gazdır; kabin ısıl bölge modeliyle tek bir yüksek doğruluklu gaz enerji çözümü oluşturmaz. Outflow ve kaçaklarda yönlü, sıkışabilir orifis akışı; kritik oran altında choked flow. Etkin outflow alanı `0.075 * opening² m²`, doğal kaçak 2 cm². Kapalı outflow, ayrı kaçak ve relief yollarını kapatmaz.
- AUTO: faz / departure / destination / cruise schedule, cabin rate sınırı, ΔP marjı, kütle dengesi feedforward ve referans basınç hatası. Seçili konfor sınırı bir kontrol hedefidir; yetersiz kaynak, hızlı çevre değişimi veya arıza altında garanti değildir. Manuel altitude / airspeed girişi otomatik uçuş profilini durdurur.
- Relief: ayarlanabilir pozitif ve negatif ΔP eşiklerinin üzerinde kademeli açıklık, gerçek kütle transferi. Pozitif relief normal regülatör değildir. Negatif ΔP altında açık outflow ve kaçaklar da içeri akabilir.
- Sensörler: actual / indicated ayrıdır. Pack sıcaklık sapması sıcaklık kontrolünü de etkiler. Cabin pressure sensörü kaybında AUTO, modellenen sağlam yedek sensörü kullanır. Mekanik sıkışma, actuator freeze ve position indication failure ayrı davranır.
- Koruma: duct sıcaklığı, bleed sıcaklığı/basıncı ve pack overheat ayrı koruma üretir. Stuck-open ana valfin upstream bağımsız koruması akışı kesebilir. Koruma kilitlidir; arıza giderilip sistem soğuduktan sonra `Clear failures / rearm` kullanılmalıdır.
- Zaman: ≤0,1 s alt adım; valf ve termal yanıtlar zamana bağlıdır. Ağ dengesi yarı statiktir. Fiziksel eşitlemeyi aşan sayısal kütle transferi sınırlanır; finite olmayan kontrol girdileri güvenli aralığa alınır.
- Grafikler gerçek model örnekleridir. Uzun oturumlarda örnekler seyreltilerek tüm zaman aralığı korunur. Olay kaydı en fazla 300 gerçek kontrol / durum geçişi tutar ve JSON indirilebilir.

Bu basitleştirmeler eğitim amacıyla seçilmiştir; CFD, üretici yazılımı, sertifikasyon veya bakım verisi değildir. Kabin noktaları kavramsal yoğunluk gösterimidir. Gerçek operasyon / bakım için kullanılamaz.

## Kaynaklar

- [FAA Aviation Handbooks & Manuals — AMT Airframe, Cabin Environmental Control Systems](https://www.faa.gov/regulations_policies/handbooks_manuals/aviation)
- [FAA Airframe Handbook — pressurization valves](https://www.faa.gov/documentlibrary/media/advisory_circular/ac_65-15a.pdf): outflow ve relief işlevlerine ilişkin tarihsel temel kaynak.
- [NASA Glenn — Earth Atmosphere Equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/earth-atmosphere-equation-english/): atmosferin irtifa–basınç ilişkisi. Kod, açıklanan parçalı yaklaşımın SI sabitleriyle standart atmosfer uygulamasıdır; kaynak örnek sayılarının birebir kopyası değildir.

## Doğrulama

```sh
npm test
npm run typecheck
npm run format:check
npm run build
```

Tarayıcı kabul testleri Python Playwright kullanır. Ayrı test ortamı kurulumu:

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements-test.txt
.venv/bin/python -m playwright install chromium
.venv/bin/python tests/browser_check.py
.venv/bin/python tests/production_check.py
```

`browser_check.py` sırasında `npm run dev` açık olmalıdır. `production_check.py`, son `dist/` paketini geçici bir HTTP sunucusuyla `/bleed-air-pressurization-lab/` alt yolunda bağımsız doğrular. Test raporu ve masaüstü / mobil görüntüler `test-results/` altına yazılır. Geliştirme derlemesi, testler için yalnız okuma yapan `window.__labSnapshot` sağlar; üretim paketinde yer almaz.

## GitHub Pages

`vite.config.ts` içinde `base: './'` kullanılır; uygulama herhangi bir repository alt yolundan sunulabilir. `.github/workflows/pages.yml`, `main` push veya manuel tetikleme ile test, format, TypeScript kontrolü ve build sonrası `dist/` yayımlar. PR çalıştırmaları yalnız doğrular.

Yayın için repository GitHub Pages kaynağı `GitHub Actions` olarak yapılandırılmıştır. `main` push çalışması test, format, TypeScript kontrolü ve build sonrasında `dist/` artifact'ini yayımlar. Canlı repository: [muhammetarbag/bleed-air-pressurization-lab](https://github.com/muhammetarbag/bleed-air-pressurization-lab). Son başarılı Pages çalışması: [Actions run](https://github.com/muhammetarbag/bleed-air-pressurization-lab/actions).

## Dosyalar

- `src/sim/types.ts`: ortak veri sözleşmesi.
- `src/sim/engine.ts`: atmosfer, kaynak, ağ, pack, ısıl, basınç, uçuş ve olay motoru.
- `src/sim/catalog.ts`: 47 arıza tanımı.
- `src/sim/training.ts`: fizik alt adımlarında challenge zamanlaması ve puanlama.
- `src/content.ts`: deneyler, vakalar, bileşenler, sorular ve challenge başlangıçları.
- `src/components/Visuals.tsx`: gerçek debiye bağlı SVG ve grafikler.
- `src/components/Controls.tsx`: ortak erişilebilir kontroller.
- `src/components/Learning.tsx`: ölçümle tamamlanan öğrenme akışları.
- `src/App.tsx`: ortak motorun yaşam döngüsü ve 16 bölüm.
