import type { AircraftState } from "./sim/types.ts";
import { advance, createState, setFault } from "./sim/engine.ts";
export const sections = [
  [
    "overview",
    "Sistem genel görünümü",
    "SYSTEM OVERVIEW",
    "Kaynağı aç. Akışı izle. Sonucu gör.",
  ],
  [
    "fundamentals",
    "Bleed air temelleri",
    "BLEED AIR FUNDAMENTALS",
    "Basınçlı havanın enerji yolculuğu.",
  ],
  [
    "engine",
    "Engine bleed lab",
    "ENGINE BLEED LAB",
    "Kompresörden manifolda: basınç ve sıcaklık.",
  ],
  [
    "manifold",
    "Pnömatik manifold",
    "PNEUMATIC MANIFOLD LAB",
    "İki taraf, ortak bir kapasite dengesi.",
  ],
  [
    "packs",
    "Pack / air conditioning",
    "PACK / AIR CONDITIONING LAB",
    "Sıcak bleed air, kontrollü kabin havasına dönüşür.",
  ],
  [
    "acm",
    "Air cycle machine",
    "AIR CYCLE MACHINE LAB",
    "Sıkıştır. Isıyı at. Genişlet.",
  ],
  [
    "distribution",
    "Kabin hava dağıtımı",
    "CABIN AIR DISTRIBUTION",
    "Taze hava, recirculation ve üç sıcaklık bölgesi.",
  ],
  [
    "pressure",
    "Basınçlandırma",
    "PRESSURIZATION LAB",
    "Uçak yükselirken kabin neden aynı hızda yükselmez?",
  ],
  [
    "outflow",
    "Outflow valve",
    "OUTFLOW VALVE LAB",
    "Havanın çıkışını değiştir, kabin irtifasını izle.",
  ],
  [
    "flight",
    "Uçuş simülatörü",
    "CLIMB / CRUISE / DESCENT",
    "Kalkıştan inişe aynı basınç kontrol döngüsü.",
  ],
  [
    "failures",
    "Arıza laboratuvarı",
    "ABNORMAL & FAILURE LAB",
    "Bir arıza, birbirine bağlı birçok sonuç.",
  ],
  [
    "troubleshooting",
    "Arıza teşhisi",
    "TROUBLESHOOTING",
    "Ölç. Karşılaştır. Kanıta dayalı teşhis koy.",
  ],
  [
    "labs",
    "Rehberli deneyler",
    "GUIDED EXPERIMENTS",
    "15 deneyle görünmeyen süreçleri keşfet.",
  ],
  [
    "free",
    "Serbest deney",
    "FREE EXPERIMENT",
    "Kaynaklardan kaçaklara bütün kontroller elinde.",
  ],
  [
    "components",
    "Bileşen kütüphanesi",
    "COMPONENT EXPLORER",
    "Her parçanın girişini, çıkışını ve etkisini incele.",
  ],
  [
    "quiz",
    "Quiz / challenge",
    "QUIZ & CHALLENGE MODE",
    "Önce tahmin et. Sonra sistemi çalıştır.",
  ],
] as const;
export type PageId = (typeof sections)[number][0];
export const components = [
  [
    "Engine Bleed Port",
    "Kompresör kademesinden pnömatik hava alır.",
    "Motor gücü / kompresör havası",
    "Sıcak ve basınçlı bleed air",
    "RPM arttıkça kaynak basıncı ve kapasitesi artar.",
    "Bleed kaybı",
    "İlgili manifold ve pack alternatif kaynağa ihtiyaç duyar.",
  ],
  [
    "PRSOV",
    "Basıncı regüle eder, gerektiğinde kaynağı kapatır.",
    "Bleed basıncı / aç-kapat komutu",
    "Regüle pnömatik besleme",
    "Valf gerçek konumu komutu zamanla izler.",
    "Stuck open / closed / regulation fail",
    "Akış kesilebilir veya bağımsız aşırı basınç koruması devreye girer.",
  ],
  [
    "Precooler",
    "Bleed air ısısını ayrı soğutma havasına aktarır.",
    "Sıcak bleed + soğutma havası",
    "Daha düşük bleed sıcaklığı",
    "Soğutma etkinliği ve fan air açıklığı ile sıcaklık düşer.",
    "Ineffective precooler",
    "Yüksek sıcaklık bleed korumasını kapatabilir.",
  ],
  [
    "Fan Air Valve",
    "Precooler soğutma havasını ayarlar.",
    "Fan havası / açıklık",
    "Precooler soğutma debisi",
    "Açılması sıcak bleed çıkışını soğutur.",
    "Kısıtlı açıklık",
    "Azalan ısı atımı downstream sıcaklığı yükseltir.",
  ],
  [
    "Check Valve",
    "Havanın yalnız ileri yönde akmasına izin verir.",
    "Kaynak ve manifold basıncı",
    "İleri akış veya kapalı yol",
    "Manifold basıncı kaynağı geçtiğinde geri akış durur.",
    "Mekanik sızdırma (bu modelde sağlam kabul edilir)",
    "Burada tek yönlü mantık bütün kaynak girişlerinde uygulanır.",
  ],
  [
    "Pneumatic Manifold",
    "Kaynak havasını tüketicilere dağıtır.",
    "Kaynak kapasitesi / tüketici talebi",
    "Pack ve temsilî anti-ice / starter akışı",
    "Basınç kapasite ile talebin denge noktasında oluşur.",
    "Duct leak / düşük besleme",
    "Pack debisi ve basınçlandırma marjı azalır.",
  ],
  [
    "Isolation Valve",
    "Sol ve sağ manifoldu bağlar veya ayırır.",
    "Öğrenci komutu / leak protection",
    "Crossbleed yolu",
    "Net akış ihtiyacı olan tarafa gider.",
    "Stuck open / closed",
    "Arızalı taraf ayrılamaz veya sağlam kaynak karşı packe ulaşamaz.",
  ],
  [
    "Pack Valve",
    "Pack girişindeki pnömatik akışı kontrol eder.",
    "Pack modu / koruma",
    "Pack giriş debisi",
    "AUTO ve HIGH farklı debi ister.",
    "Stuck open / closed",
    "Komut ile gerçek akış farklılaşabilir.",
  ],
  [
    "Heat Exchanger",
    "Süreç havasının ısısını ram air akımına atar.",
    "Sıcak süreç havası + dış soğutma akışı",
    "Soğuyan süreç havası",
    "Akışlar birbirine karışmaz.",
    "Ram air blocked",
    "Soğutma zayıflar; pack çıkışı ısınır.",
  ],
  [
    "ACM Compressor",
    "Türbin şaftından iş alıp süreç havasını sıkıştırır.",
    "Primary HX çıkışı / şaft işi",
    "Yüksek basınç ve sıcaklık",
    "Sıkıştırma sıcaklığı yükseltir.",
    "Compressor fail",
    "Genişleme için kullanılabilir basınç oranı azalır.",
  ],
  [
    "ACM Turbine",
    "Genişleyen havadan iş çeker.",
    "Secondary HX çıkışı",
    "Soğuk hava + şaft işi",
    "Genleşme ve iş çıkışı hava sıcaklığını düşürür.",
    "Turbine fail",
    "Soğutma kaybolur, bağlı kompresör dönmez.",
  ],
  [
    "Ram Air Door",
    "Eşanjöre dış soğutma havası erişimini ayarlar.",
    "Uçuş hızı / yer fanı / açıklık",
    "Isı atımı",
    "Uçuşta hız; yerde fan soğutmayı destekler.",
    "Blokaj / kapalı konum",
    "Pack sıcaklığı yükselir.",
  ],
  [
    "Mix Manifold",
    "Taze pack havasını kabinden dönen havayla karıştırır.",
    "Pack 1 + Pack 2 + recirculation",
    "Karma hava",
    "Karışım sıcaklığı debiyle ağırlıklandırılır.",
    "Bir packin kaybı",
    "Taze hava azalır; karışım sıcaklığı değişir.",
  ],
  [
    "Recirculation Fan",
    "Filtrelenmiş kabin havasını yeniden dağıtır.",
    "Kabin havası / fan komutu",
    "Kapalı devre hava debisi",
    "Havayı yeniden kullanarak taze hava talebini azaltır.",
    "Fan kapalı",
    "Taze pack talebi artar; kabine yeni kütle ekleyen bir kaynak değildir.",
  ],
  [
    "Temperature Controller",
    "Pack bypass ve zone trim talebini oluşturur.",
    "Seçilen / ölçülen sıcaklık",
    "Sıcaklık komutu",
    "Kabin ısıl ataleti nedeniyle yanıt zaman alır.",
    "Sensor bias / controller fail",
    "Aşırı sıcak ya da aşırı soğuk besleme oluşabilir.",
  ],
  [
    "Cabin Pressure Controller",
    "Kabin irtifa programını outflow komutuna çevirir.",
    "Uçuş fazı / kabin basıncı / iniş yüksekliği",
    "Outflow komutu",
    "Konforlu kabin hızını ve ΔP marjını gözetir.",
    "Auto controller fail",
    "Son komut donar; manuel kontrol kullanılabilir.",
  ],
  [
    "Outflow Valve",
    "Kontrollü kabin egzozunu ayarlar.",
    "Basınç farkı / açıklık",
    "Kabin dışına veya negatif farkta içeri akış",
    "Açıklık ve basınç farkı debiyi belirler.",
    "Stuck / actuator / sensor",
    "Basınç kontrolü bozulabilir ya da yalnız gösterge yanlış olabilir.",
  ],
  [
    "Positive Relief Valve",
    "Aşırı pozitif basınç farkını sınırlar.",
    "Cabin pressure − outside pressure",
    "Dışarı relief akışı",
    "Seçili pozitif eşik aşıldığında açılır.",
    "Bu modelde bağımsız ve sağlam",
    "Outflow kapalıyken sınırsız basınç birikimini engeller.",
  ],
  [
    "Negative Relief Valve",
    "Aşırı negatif basınç farkını sınırlar.",
    "Outside pressure − cabin pressure",
    "Kabin içine relief akışı",
    "Dış basınç seçili farkı aştığında açılır.",
    "Bu modelde bağımsız ve sağlam",
    "Dış basıncın gövdeyi içeri yüklemesini sınırlar.",
  ],
  [
    "Duct Leak Detector",
    "Sıcak duct çevresindeki ısınmayı algılar.",
    "Yerel çevre sıcaklığı",
    "Leak uyarısı / kapatma komutu",
    "Kaçak gelişir, dedektör ısınır, koruma etkinleşir.",
    "Duct leak",
    "İlgili bleed kapanır ve sağlam isolation valfi iki tarafı ayırır.",
  ],
];
export interface Lab {
  title: string;
  objective: string;
  initial: string;
  task: string;
  experiment: string;
  observe: string;
  question: string;
  result: string;
  setup: () => AircraftState;
  success: (s: AircraftState, baseline: AircraftState) => boolean;
}
const configure = (
  preset: "normal" | "ground" | "cruise",
  fn?: (s: AircraftState) => void,
) => {
  const s = createState(preset);
  fn?.(s);
  return s;
};
export const labs: Lab[] = [
  {
    title: "Normal çift motor beslemesi",
    objective: "İki bağımsız pnömatik tarafı kur.",
    initial: "Yerde; motorlar ve bleed kapalı.",
    task: "İki motoru MEDIUM yap, iki bleed valfini aç.",
    experiment: "Isolation kapalıyken her packin kendi kaynağını izle.",
    observe: "Sol/sağ basınç ve pack debisi.",
    question: "Isolation kapalıyken Pack 1 hangi kaynaktan beslenir?",
    result: "Her iki manifold > 25 psi; iki pack > 0,5 kg/s.",
    setup: () => createState("ground"),
    success: (s) =>
      s.manifold.every((p) => p > 25) &&
      s.packs.every((p) => p.flow > 0.5) &&
      s.isolation < 0.01,
  },
  {
    title: "Yerde APU ile pack",
    objective: "Motor çalıştırmadan iki packe hava sağla.",
    initial: "Yerde; bütün kaynaklar kapalı.",
    task: "APU MASTER, START ve BLEED aç. Isolation aç.",
    experiment: "APU RPM kullanılabilir eşiğine gelene kadar izle.",
    observe: "APU devreye girme süresi, crossbleed ve iki pack.",
    question: "APU soldayken sağ packe hangi valf yol açar?",
    result: "APU akışı ve iki pack debisi oluşur.",
    setup: () => createState("ground"),
    success: (s) =>
      s.sources[2].flow > 0.5 &&
      s.packs.every((p) => p.flow > 0.45) &&
      s.controls.engine.every((x) => x === 0),
  },
  {
    title: "Tek bleed kaynağı",
    objective: "Bir kaynakla iki tarafı besle.",
    initial: "ENG 1 bleed kayıp; isolation kapalı.",
    task: "Isolation aç; gerekiyorsa ENG 2 gücünü artır.",
    experiment: "ENG 2 yükünü çift kaynak durumuyla karşılaştır.",
    observe: "Sağdan sola net crossflow.",
    question: "Tek kaynağın kapasitesi neden önemlidir?",
    result: "Pack 1 sağ kaynaktan en az 0,45 kg/s alır.",
    setup: () => configure("normal", (s) => setFault(s, "bleed_fail_0", true)),
    success: (s) => s.crossflow < -0.4 && s.packs.every((p) => p.flow > 0.45),
  },
  {
    title: "Isolation valfi",
    objective: "Crossbleed yolunun fiziksel sınırını gör.",
    initial: "ENG 1 kayıp; isolation açık.",
    task: "Önce akış oluşmasını bekle; sonra isolation kapat.",
    experiment: "Valf kapanırken Pack 1 yolunun kesilmesini izle.",
    observe: "Pack 1 sıfır debi; Pack 2 çalışır.",
    question: "Sağ basınç normal olsa da sol neden kaybolur?",
    result: "Sol pack < 0,01; sağ pack > 0,4 kg/s.",
    setup: () =>
      configure("normal", (s) => {
        setFault(s, "bleed_fail_0", true);
        s.controls.isolation = true;
        advance(s, 10);
      }),
    success: (s) =>
      s.packs[0].flow < 0.01 && s.packs[1].flow > 0.4 && s.isolation < 0.01,
  },
  {
    title: "Ram air ile soğutma",
    objective: "Soğutma havasının pack üzerindeki etkisini ölç.",
    initial: "Yerde, ram-air kapısı %25 ve fan kapalı.",
    task: "Soğutma fanını aç ve ram-air kapısını tam aç.",
    experiment: "Primary / secondary HX sıcaklıklarını karşılaştır.",
    observe: "ACM soğuk uç sıcaklığı düşer.",
    question: "Ram air kabine giren süreç havasına karışır mı?",
    result: "Pack 1 cold-end sıcaklığı en az 10 °C düşer.",
    setup: () =>
      configure("normal", (s) => {
        s.controls.ramDoor = 0.25;
        s.controls.coolingFan = false;
        advance(s, 5);
      }),
    success: (s, b) =>
      s.packs[0].coldTemp < b.packs[0].coldTemp - 10 && s.packs[0].flow > 0.1,
  },
  {
    title: "ACM enerji dönüşümü",
    objective: "Sıkıştırma ve genişlemeyi ayır.",
    initial: "Normal çalışan iki pack.",
    task: "ACM ekranında compressor ve turbine aşamalarını incele.",
    experiment: "Hızı 250 kt yap; uçuş modunu seç.",
    observe: "Compressor sıcaklığı artırır; turbine azaltır.",
    question: "Soğuma için klasik soğutucu akışkan gerekir mi?",
    result: "Uçuşta; compressor ΔT pozitif, turbine ΔT negatif.",
    setup: () => createState(),
    success: (s) =>
      !s.controls.ground &&
      s.controls.airspeed >= 250 &&
      s.packs[0].stages[2].temperature > s.packs[0].stages[1].temperature &&
      s.packs[0].stages[4].temperature < s.packs[0].stages[3].temperature,
  },
  {
    title: "Recirculation etkisi",
    objective: "Taze hava ile yeniden dolaşımı ayır.",
    initial: "İki recirculation fanı açık.",
    task: "İki fanı da kapat.",
    experiment: "Toplam pack talebindeki artışı izle.",
    observe: "Recirculation debisi sıfır; fresh-air talebi artar.",
    question: "Recirculation neden kabine net yeni kütle eklemez?",
    result: "Taze hava talebi başlangıca göre en az %25 artar.",
    setup: () => createState(),
    success: (s, b) =>
      s.recircFlow === 0 &&
      s.demand[0] + s.demand[1] > (b.demand[0] + b.demand[1]) * 1.25,
  },
  {
    title: "Sıcak kabini soğut",
    objective: "Isıl ataleti gözle.",
    initial: "Kabin 34 °C; normal kaynaklar.",
    task: "Hedefleri 22 °C yap. Fan ve iki packi çalıştır.",
    experiment: "30× hızla birkaç dakika izle.",
    observe: "Sıcaklık bir anda değil zamanla düşer.",
    question: "Yolcu yükü denge sıcaklığını nasıl etkiler?",
    result: "Ortalama kabin sıcaklığı 30 °C altına iner.",
    setup: () =>
      configure("normal", (s) => {
        s.zoneTemps = [34, 34, 34];
      }),
    success: (s) => s.zoneTemps.every((t) => t < 30),
  },
  {
    title: "Tam uçuş basınç programı",
    objective: "Kalkış, tırmanış, seyir ve inişi bağla.",
    initial: "Yerde normal uçak.",
    task: "Uçuş simülatöründe START FLIGHT; 30× kullan.",
    experiment: "Dört eşzamanlı eğriyi takip et.",
    observe: "İnişte kabin dış basınca yaklaşır.",
    question: "Kabin eğrisi uçak eğrisinden neden farklıdır?",
    result: "Uçuş tamamlanır; yerde |ΔP| < 0,1 psi.",
    setup: () => createState(),
    success: (s) =>
      s.flightElapsed > 120 &&
      !s.flightRunning &&
      s.phase === "GROUND" &&
      Math.abs(s.delta) < 0.1,
  },
  {
    title: "Manuel basınçlandırma",
    objective: "Outflow ile kabin basıncını yönet.",
    initial: "35.000 ft / 8.000 ft kabin; MANUAL.",
    task: "Valfi küçük adımlarla ayarla; kabin hızını sakinleştir.",
    experiment: "Açma ve kapamanın işaretini gözle.",
    observe: "Net kütle akışı ile cabin rate ters işaretlidir.",
    question: "Outflow daha çok açılırsa basınç ne olur?",
    result: "30 saniye sonra kabin < 9.000 ft, |rate| < 500, ΔP < limit.",
    setup: () =>
      configure("cruise", (s) => {
        s.controls.pressureMode = "MANUAL";
        s.controls.manualOutflow = 0.4;
      }),
    success: (s) =>
      s.time > 30 &&
      s.cabinAltitude < 9000 &&
      Math.abs(s.cabinRate) < 500 &&
      s.delta < s.controls.positiveLimit,
  },
  {
    title: "Bir pack kaybı",
    objective: "Pack kaybının kabin girişine etkisini gör.",
    initial: "Normal seyir.",
    task: "PACK 1 valve stuck closed arızası ekle.",
    experiment: "Arıza ve pressure ekranlarında aynı debiyi karşılaştır.",
    observe: "Taze kabin girişi azalır; AUTO outflow kısılır.",
    question: "Tek pack ile basınç korunması hangi koşullara bağlı?",
    result: "Pack 1 sıfır, giriş başlangıcın %70 altında.",
    setup: () => createState("cruise"),
    success: (s, b) => s.packs[0].flow < 0.01 && s.inflow < b.inflow * 0.7,
  },
  {
    title: "Bleed duct leak",
    objective: "Algılama ve koruma sırasını izle.",
    initial: "Normal çift kaynak.",
    task: "Sol duct leak ekle; olayları adımla.",
    experiment: "Yerel sıcaklık → dedektör → kapatma zinciri.",
    observe: "Bleed koruması, isolation ve Pack 1.",
    question: "Aktif bir duct kaçağına crossbleed açmak neden uygun değildir?",
    result: "Sol kaynak koruması etkin; isolation kapalı.",
    setup: () => createState(),
    success: (s) =>
      s.faults.includes("duct_leak_0") &&
      s.sources[0].protected &&
      s.isolation < 0.01,
  },
  {
    title: "Outflow stuck open",
    objective: "Basınç kaybının çıkış yolunu belirle.",
    initial: "Normal seyir.",
    task: "Outflow stuck open arızası ekle.",
    experiment: "30× ile basınç ve cabin rate izle.",
    observe: "Giriş normal olsa da kabin irtifası yükselir.",
    question: "Packs açıkken neden basınç kaybolabilir?",
    result: "Kabin irtifası 10.000 ft üstüne çıkar.",
    setup: () => createState("cruise"),
    success: (s) =>
      s.faults.includes("outflow_open") && s.cabinAltitude > 10000,
  },
  {
    title: "Pozitif relief",
    objective: "Aşırı basınç korumasını gözle.",
    initial: "Normal seyir.",
    task: "Outflow stuck closed arızası ekle.",
    experiment: "ΔP sınıra ulaşana kadar izle.",
    observe: "Outflow kapalıyken ayrı relief yolu akmaya başlar.",
    question: "Relief valfi normal outflow kontrolünün yerine mi geçer?",
    result: "Pozitif relief debisi > 0,1 kg/s; ΔP sınıra yakın.",
    setup: () => createState("cruise"),
    success: (s) =>
      s.positiveFlow > 0.1 && s.delta < s.controls.positiveLimit + 0.2,
  },
  {
    title: "Yavaş dekompresyon",
    objective: "Pack beslemesi ile kaçağı karşılaştır.",
    initial: "Seyir; kaçak alanı sıfır.",
    task: "Kaçak alanını artır; packlerin yetmediği noktayı bul.",
    experiment: "Giriş, çıkış ve net kütleyi birlikte oku.",
    observe: "Outflow kapansa bile yeterince büyük kaçak irtifayı yükseltir.",
    question: "Küçük bir kaçağı controller nasıl telafi eder?",
    result: "Kaçak ≥ 100 cm² ve cabin rate > +100 ft/min.",
    setup: () => createState("cruise"),
    success: (s) => s.controls.leakArea >= 100 && s.cabinRate > 100,
  },
];
export interface DiagnosticCase {
  title: string;
  brief: string;
  fault: string;
  diagnosis: string;
  reason: string;
  preset: "normal" | "cruise";
  setup?: (s: AircraftState) => void;
}
export const cases: DiagnosticCase[] = [
  {
    title: "Pack 1 sessiz",
    brief:
      "Sol pack hava vermiyor, sağ pack normal. Önce giriş basıncı ile valf konumunu karşılaştır.",
    fault: "pack_closed_0",
    diagnosis: "Pack 1 valve stuck closed",
    reason:
      "Normal sol manifold basıncına rağmen açık komutlu valf kapalı ve gerçek debi sıfır.",
    preset: "normal",
  },
  {
    title: "Sol tarafta düşük basınç",
    brief: "Sol manifold basıncı düşük. Motor ve sağ manifold çalışıyor.",
    fault: "prsov_closed_0",
    diagnosis: "ENG 1 PRSOV stuck closed",
    reason: "Kompresör basıncı var; PRSOV komutu açık, gerçek konumu kapalı.",
    preset: "normal",
  },
  {
    title: "İki packte düşük debi",
    brief: "İki pack HIGH seçili. Ortak kaynak yükünü ve toplam talebi incele.",
    fault: "none",
    diagnosis: "Ortak kaynak kapasitesi yetersiz",
    reason:
      "Tek düşük güçlü kaynak, iki HIGH pack ve temsilî anti-ice talebini karşılamıyor.",
    preset: "normal",
    setup: (s) => {
      s.controls.engine = [30, 0];
      s.controls.isolation = true;
      s.controls.pack = ["HIGH", "HIGH"];
      s.controls.demand = 1.8;
      s.controls.antiIce = true;
    },
  },
  {
    title: "Seyirde yavaş irtifa artışı",
    brief:
      "Kabin irtifası yükseliyor. Kontrollü egzoz ve kaçak debisini karşılaştır.",
    fault: "cabin_leak",
    diagnosis: "Kabin kaçağı",
    reason:
      "Ek kaçak akışı var; giriş ile egzoz dengesi ilk anda bozulur. AUTO küçük kaçağı telafi edebilir.",
    preset: "cruise",
  },
  {
    title: "Hızlı kabin tırmanışı",
    brief: "Kabin basıncı hızlı düşüyor. Packler hâlâ besliyor.",
    fault: "rapid_leak",
    diagnosis: "Büyük kabin kaçağı",
    reason:
      "Büyük kaçak akışı, normal pack girişini aşar; outflow kapanması tek başına yetmez.",
    preset: "cruise",
  },
  {
    title: "Yüksek ΔP",
    brief: "Diferansiyel basınç artıyor. Outflow ve relief yolunu incele.",
    fault: "outflow_closed",
    diagnosis: "Outflow stuck closed",
    reason:
      "Açma komutuna rağmen outflow kapalı; artan kütle pozitif relief gerektirir.",
    preset: "cruise",
  },
  {
    title: "Çalışan pack, sıcak kabin",
    brief:
      "Pack girişleri normal. Sıcaklık hedefi ile pack çıkışını karşılaştır.",
    fault: "temp_controller_0",
    diagnosis: "Pack 1 temperature controller fail",
    reason:
      "Hedef düşükken pack sıcak hava üretmeyi sürdürüyor; kontrol komutu 42 °C konumunda donmuş.",
    preset: "normal",
  },
  {
    title: "Yetersiz pack soğutması",
    brief:
      "Pack 1 çıkışı sıcak, ram-air kapısı açık. ACM şaftını ve eşanjörü incele.",
    fault: "turbine_0",
    diagnosis: "Pack 1 ACM turbine fail",
    reason: "Türbin genişleme soğutması yok; şaft RPM sıfır ve soğuk uç sıcak.",
    preset: "normal",
  },
  {
    title: "Sol duct çevresi sıcak",
    brief:
      "Sol tarafta sıcaklık ve kaynak davranışı değişiyor. Leak detector ölçümünü al.",
    fault: "duct_leak_0",
    diagnosis: "Sol bleed duct leak",
    reason:
      "Duct çevresi ısınır, dedektör uyarısı kaynağı ve isolation yolunu korumaya alır.",
    preset: "normal",
  },
  {
    title: "Tek kaynak iki packe yetmiyor",
    brief:
      "Crossbleed açık; sol kaynak devre dışı. Sağ kaynak kapasitesini talebe göre değerlendir.",
    fault: "bleed_fail_0",
    diagnosis: "Tek kaynakta fazla pnömatik talep",
    reason:
      "Düşük güçte tek kaynak; yüksek pack talebi manifold basıncını düşürüyor.",
    preset: "normal",
    setup: (s) => {
      s.controls.engine[1] = 30;
      s.controls.isolation = true;
      s.controls.pack = ["HIGH", "HIGH"];
      s.controls.demand = 1.6;
    },
  },
  {
    title: "Komut ve gösterge uyuşmuyor",
    brief:
      "Outflow komutu değişiyor fakat panelde açıklık sabit. Bağımsız konum ölçümü al.",
    fault: "outflow_sensor",
    diagnosis: "Outflow position sensor fail",
    reason:
      "Gösterge %73 değerinde donmuş; bağımsız gerçek konum ve debi değişiyor.",
    preset: "cruise",
  },
  {
    title: "Kabin altimetresi şüpheli",
    brief:
      "Kabin irtifa göstergesi yüksek fakat bağımsız basınç ölçümü kararlı.",
    fault: "cabin_alt_sensor",
    diagnosis: "Cabin altitude indication fail",
    reason:
      "Basınçtan türetilen referans irtifa ile gösterge arasında +4.000 ft sapma var.",
    preset: "cruise",
  },
];
export function loadCase(index: number): AircraftState {
  const item = cases[index],
    s = createState(item.preset);
  item.setup?.(s);
  if (item.fault !== "none") setFault(s, item.fault, true, true);
  advance(s, item.fault === "cabin_leak" ? 3 : 12);
  s.events = s.events.filter((e) => e.kind !== "action");
  return s;
}
export interface Question {
  category: string;
  type: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}
const q = (
  category: string,
  type: string,
  question: string,
  options: string[],
  correct: number,
  explanation: string,
): Question => ({ category, type, question, options, correct, explanation });
export const questions: Question[] = [
  q(
    "Bleed",
    "Çoktan seçmeli",
    "Bleed air hangi hava akımını tanımlar?",
    [
      "Kompresör kademesinden alınan sıcak, basınçlı hava",
      "Sadece türbin egzozu",
      "Kabin egzoz havası",
      "Yalnız ram air",
    ],
    0,
    "Bleed port, kompresör havasının bir kısmını pnömatik sisteme ayırır.",
  ),
  q(
    "Bleed",
    "Tahmin",
    "Motor gücü artırılırsa bu modelde kaynak nasıl değişir?",
    [
      "Basınç her zaman sıfır olur",
      "Basınç, sıcaklık ve kapasite genel olarak artar",
      "Yalnız cabin altitude artar",
      "Check valve ters akar",
    ],
    1,
    "RPM kaynak başıncı, sıcaklığı ve sonlu debi kapasitesini etkiler.",
  ),
  q(
    "Bleed",
    "Bileşen tanı",
    "Hangi bileşen bleed basıncını regüle eder ve kapatır?",
    ["Recirculation fan", "Water separator", "PRSOV", "Outflow valve"],
    2,
    "PRSOV pnömatik besleme tarafındadır; outflow kabin egzozundadır.",
  ),
  q(
    "Bleed",
    "Valf eylemi",
    "Precooler çıkışı aşırı ısınıyorsa ilk model etkisi hangisidir?",
    [
      "Kabin hemen 0 ft olur",
      "APU RPM kendiliğinden artar",
      "Pack debisi sonsuzlaşır",
      "Bleed sıcaklık koruması kaynağı kapatabilir",
    ],
    3,
    "Koruma sıcaklık gelişimine bağlıdır; downstream pack kaynağını kaybedebilir.",
  ),
  q(
    "Manifold",
    "Akışı izle",
    "ENG 1 kayıp, ENG 2 normal, isolation açık. Pack 1 yolu nedir?",
    [
      "ENG 2 → right → isolation → left → Pack 1",
      "ENG 1 → Pack 1, valflerden bağımsız",
      "Kabin → engine compressor",
      "Ram air → left manifold",
    ],
    0,
    "Crossbleed sağlam kaynağı diğer tarafa bağlar; kapasite yine sınırlıdır.",
  ),
  q(
    "Manifold",
    "Tahmin",
    "Aynı durumda isolation kapanırsa Pack 1?",
    [
      "Daha soğuk olur",
      "Normal pnömatik beslemesini kaybeder",
      "APU otomatik çalışır",
      "Sağ manifold tamamen boşalır",
    ],
    1,
    "Kapalı isolation, sağ kaynağın sol packe erişimini keser.",
  ),
  q(
    "Manifold",
    "Grafik yorumla",
    "Talep 1,3 → 2,7 kg/s, tek kaynak kapasitesi 1,5 kg/s. Basınç eğrisinden ne beklersin?",
    [
      "Sürekli artış",
      "Kesin olarak değişmez",
      "Düşüş ve düşük debi",
      "Negatif mutlak basınç",
    ],
    2,
    "Sonlu kapasite aşılınca basınç ve sağlanan akış azalır.",
  ),
  q(
    "Manifold",
    "Bileşen tanı",
    "Manifoldun kaynağa geri hava basmasını ne engeller?",
    ["Pack bypass", "Ram air door", "Cabin rate limiter", "Check valve"],
    3,
    "Kaynak check valve yalnız yeterli ileri basınç farkında geçirir.",
  ),
  q(
    "APU",
    "Valf eylemi",
    "Yerde motorlar kapalıyken sağ packi APU ile beslemek için?",
    [
      "APU hazır + bleed açık + isolation açık + pack açık",
      "Yalnız recirculation aç",
      "Yalnız outflow kapat",
      "Yalnız dış elektrik bağla",
    ],
    0,
    "APU soldan besler; sağ tarafa açık bir pnömatik yol gerekir.",
  ),
  q(
    "APU",
    "Çoktan seçmeli",
    "Ground pneumatic air cart ne sağlar?",
    [
      "Yalnız elektrik",
      "Harici basınçlı hava",
      "Sadece soğutucu gaz",
      "Kabin irtifa sinyali",
    ],
    1,
    "Harici pnömatik hava elektrik external power ile aynı şey değildir.",
  ),
  q(
    "Pack",
    "Bileşen tanı",
    "Packin temel görevi nedir?",
    [
      "Yalnız ΔP ölçmek",
      "Dış havayı hiçbir işlem yapmadan dağıtmak",
      "Pnömatik havayı soğutup koşullandırmak",
      "Kabin irtifasını bağımsız ayarlamak",
    ],
    2,
    "Pack koşullandırılmış hava sağlar; cabin pressure giriş-çıkış dengesiyle belirlenir.",
  ),
  q(
    "Pack",
    "Tahmin",
    "HIGH pack modu kaynakta neyi artırır?",
    [
      "Kaynak sayısını",
      "Check valve yönünü",
      "Kabin hacmini",
      "İstenen mass flow",
    ],
    3,
    "HIGH daha fazla debi talep eder; kapasite yetmezse talebin tamamı sağlanamaz.",
  ),
  q(
    "ACM",
    "Grafik yorumla",
    "Sıcaklık dizisi 160 → 60 → 94 → 45 → −20 °C. 60 → 94 aşaması?",
    ["ACM compressor", "Turbine", "Primary heat exchanger", "Mix manifold"],
    0,
    "Kompresör havaya iş verir: basınç ve sıcaklık yükselir.",
  ),
  q(
    "ACM",
    "Tahmin",
    "Türbin genişlemesi havayı neden soğutur?",
    [
      "Havaya ısı ekler",
      "Havadan iş alınır ve basınç düşer",
      "Basınç her zaman artar",
      "Kabin hacmi genişler",
    ],
    1,
    "ACM türbininde genleşme ve şaft işi çıkışı entalpi azalmasıyla ilişkilidir.",
  ),
  q(
    "ACM",
    "Çoktan seçmeli",
    "Bu air cycle sisteminde soğutma için ne kullanılır?",
    [
      "Sadece buz",
      "Soğutucu akışkanın buharlaşması zorunludur",
      "Havanın sıkıştırılması, ısı atımı ve genişlemesi",
      "Motor yakıtının kabinde buharlaşması",
    ],
    2,
    "Air cycle klasik vapor cycle refrigerant devresinden farklıdır.",
  ),
  q(
    "ACM",
    "Tahmin",
    "Ram air akışı azalırsa, diğer koşullar sabitken?",
    [
      "HX soğutması artar",
      "Kabin basıncı zorunlu sıfır olur",
      "Kompresör ters döner",
      "Isı atımı azalır; cold-end sıcaklığı yükselir",
    ],
    3,
    "Bypass kontrolü bir süre hedefi koruyabilir; soğutma marjı yine azalır.",
  ),
  q(
    "Ram air",
    "Valf eylemi",
    "Yerde düşük hızda eşanjör soğutmasına ne yardım eder?",
    [
      "Açık ram-air door ve cooling fan",
      "Kapalı bütün pack valfleri",
      "Kabin reliefini kilitlemek",
      "Airspeed göstergesini değiştirmek",
    ],
    0,
    "Yer fanı düşük dış akışta eşanjöre soğutma havası sağlar.",
  ),
  q(
    "Dağıtım",
    "Akışı izle",
    "Recirculation yolu hangisidir?",
    [
      "APU → turbine exhaust",
      "Cabin → filter → fan → mix manifold",
      "Outside → relief → engine",
      "Pack → fuel tank",
    ],
    1,
    "Bu kapalı bir yeniden dolaşım yoludur; net taze kütle kaynağı değildir.",
  ),
  q(
    "Dağıtım",
    "Tahmin",
    "İki recirculation fanı kapatılınca bu modelde?",
    [
      "Taze hava talebi azalır",
      "Kabin hacmi artar",
      "Taze pack hava talebi artar",
      "Outflow gerçek konumu anında %100 olur",
    ],
    2,
    "Yeniden kullanılan hava azalınca taze hava ihtiyacı artırılır.",
  ),
  q(
    "Isıl model",
    "Tahmin",
    "Seçilen sıcaklık düşürüldüğünde kabin neden anında soğumaz?",
    [
      "Slayt geçişi beklendiği için",
      "Basınç her zaman sabit olduğu için",
      "Hava akışı önemsiz olduğu için",
      "Kabin ısıl kütlesi ve ısı yükü nedeniyle",
    ],
    3,
    "Isıl model, hava ile taşınan ısı ve çevre/yolcu yüklerini zamana entegre eder.",
  ),
  q(
    "Isıl model",
    "Çoktan seçmeli",
    "Yolcu sayısı artırılırsa ne değişir?",
    [
      "Kabin ısı yükü artar",
      "Manifold yönü tersine döner",
      "Kabin hacmi sıfıra iner",
      "Pack valfi otomatik arızalanır",
    ],
    0,
    "Yolcuların temsilî duyulur ısı yükü kabin enerji dengesine eklenir.",
  ),
  q(
    "Basınç",
    "Çoktan seçmeli",
    "Kabin basıncını belirleyen temel denge?",
    [
      "Yalnız aircraft altitude",
      "Giren ve çıkan hava kütlesi",
      "Yalnız pack sıcaklığı",
      "Rastgele cabin altitude",
    ],
    1,
    "Sabit hacimli ideal gaz yaklaşımında net kütle basıncı zamanla değiştirir.",
  ),
  q(
    "Basınç",
    "Bileşen tanı",
    "Normal basınç kontrolünün ana elemanı?",
    [
      "Engine RPM göstergesi",
      "Recirculation filtresi",
      "Outflow valve",
      "Water separator",
    ],
    2,
    "Controller kabinden çıkan akışı outflow açıklığı ile yönetir.",
  ),
  q(
    "Basınç",
    "Tahmin",
    "Sabit girişte outflow daha çok açılırsa?",
    [
      "Basınç kesin yükselir",
      "Cabin altitude mutlaka azalır",
      "Net kütle değişmez",
      "Pozitif ΔP varsa çıkış artar; basınç düşme eğilimindedir",
    ],
    3,
    "Akış, açıklık ve basınç farkına bağlıdır.",
  ),
  q(
    "Basınç",
    "Tahmin",
    "Sabit girişte outflow kısılırsa?",
    [
      "Kütle birikimi ve basınç artışı eğilimi",
      "Dış basınç artar",
      "Pack sıcaklığı zorunlu 0 °C",
      "Uçak irtifası azalır",
    ],
    0,
    "Çıkış azalırken giriş sürerse kabin basıncı yükselir.",
  ),
  q(
    "Atmosfer",
    "Grafik yorumla",
    "Aircraft altitude 0 → 35.000 ft. Outside pressure?",
    ["Artar", "Azalır", "Kabin basıncına zorla eşitlenir", "Negatif olur"],
    1,
    "Standart atmosferde yükseldikçe üzerinizdeki hava sütunu azalır.",
  ),
  q(
    "Atmosfer",
    "Çoktan seçmeli",
    "Cabin altitude nasıl hesaplanır?",
    [
      "Aircraft altitude ile aynıdır",
      "Bağımsız bir animasyondur",
      "Kabin basıncının atmosfer modelindeki eşdeğer irtifasıdır",
      "Outflow açıklığına eşittir",
    ],
    2,
    "Aynı basınç–irtifa dönüşümü dış ortam ve kabin için kullanılır.",
  ),
  q(
    "ΔP",
    "Hesapla",
    "Cabin 75 kPa, outside 25 kPa. ΔP nedir?",
    ["100 kPa", "−50 kPa", "3 kPa", "50 kPa"],
    3,
    "ΔP = cabin pressure − outside pressure.",
  ),
  q(
    "Kabin hızı",
    "Grafik yorumla",
    "Cabin altitude 60 saniyede 6.000 → 6.500 ft. Ortalama rate?",
    ["+500 ft/min", "−500 ft/min", "+50 ft/min", "0 ft/min"],
    0,
    "Pozitif kabin hızı, eşdeğer kabin irtifasının artmasıdır.",
  ),
  q(
    "Kontrol",
    "Tahmin",
    "AUTO controller comfort rate sınırını neden kullanır?",
    [
      "Motor verimini ölçmek",
      "Kabin basınç değişimini yumuşatmak",
      "Kabin hacmini ölçmek",
      "Kaynak debisini sonsuz yapmak",
    ],
    1,
    "Referans kabin irtifası hız sınırlı değişir; fiziksel arızalar bu konfor hedefini aşabilir.",
  ),
  q(
    "Kontrol",
    "Valf eylemi",
    "AUTO controller arızasında bu laboratuvarda ne kullanılabilir?",
    [
      "Quiz reset",
      "Yalnız recirculation",
      "MANUAL outflow kontrolü",
      "Check valve yönünü ters çevirme",
    ],
    2,
    "Manuel kontrol farklı bir komut yolu sağlar; mekanik valf sıkışmasını gidermez.",
  ),
  q(
    "Relief",
    "Tahmin",
    "Outflow stuck closed ve pack girişi sürüyor. Son koruma?",
    [
      "Negative relief dışarı açılır",
      "Kabin sonsuz basınçlanır",
      "APU otomatik söner",
      "Positive relief dışarı akış sağlar",
    ],
    3,
    "Pozitif relief seçili ΔP eşiğinde açılır; eşiğin az üzerinde denge kurar.",
  ),
  q(
    "Relief",
    "Akışı izle",
    "Negatif relief hangi yönde hava geçirir?",
    [
      "Outside → cabin",
      "Cabin → outside, her zaman",
      "Pack → APU",
      "Left → right",
    ],
    0,
    "Dış basınç kabini aştığında içeri hava alarak negatif farkı sınırlar.",
  ),
  q(
    "Relief",
    "Tahmin",
    "Hızlı alçalış sırasında negatif ΔP neden oluşabilir?",
    [
      "Dış basınç azalır",
      "Dış basınç kabin basıncından daha hızlı yükselir",
      "Motor basıncı eksi olur",
      "Cabin altitude yalnız yukarı gider",
    ],
    1,
    "Dış ortam yeniden basınçlanırken kabin geride kalabilir.",
  ),
  q(
    "Kaçak",
    "Tahmin",
    "Aynı basınç farkında leak area büyürse?",
    [
      "Kaçak debisi azalır",
      "Hiç değişmez",
      "Kaçak debisi artar",
      "Recirculation taze hava üretir",
    ],
    2,
    "Orifis yaklaşımında diğer koşullar sabitken debi alanla orantılıdır.",
  ),
  q(
    "Kaçak",
    "Teşhis",
    "Outflow tam kapalı, packler çalışıyor, kabin yükseliyor. Olası neden?",
    [
      "Kabin fazla ısıl kütleye sahip",
      "Gösterge mutlaka doğru",
      "Daha fazla kapatma mümkündür",
      "Kaçak debisi taze girişten büyük",
    ],
    3,
    "Controller kalan çıkış yolunu kapatamazsa basınç kaybını durduramaz.",
  ),
  q(
    "Arıza",
    "Teşhis",
    "Pack flow göstergesi 0, bağımsız gerçek debi 0,65 kg/s. Olası arıza?",
    [
      "Pack flow sensor",
      "Pack valve stuck closed",
      "Her iki motor OFF",
      "Isolation stuck closed zorunludur",
    ],
    0,
    "Gösterge arızası gerçek akış kaybından bağımsızdır.",
  ),
  q(
    "Arıza",
    "Teşhis",
    "PRSOV açık komutlu, gerçek konum kapalı, compressor pressure normal. Teşhis?",
    [
      "Outflow sensor",
      "PRSOV stuck closed",
      "Kabin kaçağı",
      "Ram air fanı kapalı",
    ],
    1,
    "Yukarıda kaynak var; fiziksel valf yolunu açamıyor.",
  ),
  q(
    "Arıza",
    "Valf eylemi",
    "Sol duct leak algılandı. Sağlam isolation mantığı?",
    [
      "İki tarafı bağlamak zorundadır",
      "Yalnız sıcaklığı gizler",
      "İlgili kaynağı keser, tarafları ayırır",
      "Pack HIGH zorunlu",
    ],
    2,
    "Aktif sıcak hava kaçağına alternatif kaynak taşımamak için izolasyon gerekir.",
  ),
  q(
    "Arıza",
    "Teşhis",
    "Outflow gösterge %73 sabit, bağımsız konum hareket ediyor. Teşhis?",
    [
      "Valf stuck closed",
      "Her iki pack kapalı",
      "Leak detector fail",
      "Position sensor fail",
    ],
    3,
    "Command, actual ve indicated konumlarını ayrı karşılaştırmak gerekir.",
  ),
  q(
    "Uçuş",
    "Grafik yorumla",
    "Tırmanış grafiğinde uçak 35.000, kabin 8.000 ft civarında. Ne gösterir?",
    [
      "Basınçlı kabinin dış ortamdan daha yüksek basınçta olduğunu",
      "Kabin grafiğinin yanlış olması gerektiğini",
      "Kabin fiziksel olarak uçaktan ayrıldığını",
      "ΔP sıfır olduğunu",
    ],
    0,
    "Cabin altitude fiziksel yükseklik değil basınca karşılık gelen irtifadır.",
  ),
  q(
    "Model",
    "Çoktan seçmeli",
    "Bu laboratuvardaki limitler nasıl yorumlanmalı?",
    [
      "Bütün uçakların onaylı bakım verisi",
      "Genel, ayarlanabilir eğitim varsayımları",
      "Belirli bir Airbusın tam mantığı",
      "Operasyon talimatı",
    ],
    1,
    "Gerçek mimari ve limitler uçak tipine göre değişir; burada nedensel eğitim modeli kullanılır.",
  ),
];
export const sources = [
  {
    title: "FAA · Aviation Maintenance Technician Handbook — Airframe",
    url: "https://www.faa.gov/regulations_policies/handbooks_manuals/aviation",
    note: "Cabin Environmental Control Systems: pnömatik besleme, air cycle ve basınç kontrolünün temel mimarisi.",
  },
  {
    title: "NASA Glenn · Earth Atmosphere Equation",
    url: "https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/earth-atmosphere-equation-english/",
    note: "İrtifa arttıkça basıncın azalması ve parçalı atmosfer yaklaşımı.",
  },
  {
    title: "FAA · Airframe Handbook, pressurization valves",
    url: "https://www.faa.gov/documentlibrary/media/advisory_circular/ac_65-15a.pdf",
    note: "Outflow, positive relief ve negative relief işlevleri için tarihsel temel referans.",
  },
];
export const predictions = [
  {
    title: "Tek kaynak, açık crossbleed",
    prompt:
      "ENG 1 bleed kaybolacak. ENG 2 MEDIUM, isolation OPEN. Pack 1 ne yapar?",
    options: [
      "Sağ kaynaktan hava alır",
      "Kaynak kapasitesinden bağımsız sonsuz debi verir",
      "Kapalı isolation içinden hava alır",
    ],
    correct: 0,
    setup: () =>
      configure("normal", (s) => {
        s.controls.isolation = true;
        setFault(s, "bleed_fail_0", true);
      }),
    result: (s: AircraftState) =>
      `Pack 1 ${s.packs[0].flow.toFixed(2)} kg/s; sağdan sola ${Math.max(0, -s.crossflow).toFixed(2)} kg/s.`,
  },
  {
    title: "Outflow daha açık",
    prompt: "Seyirde outflow MANUAL %85 açıklığa gelecek. İlk basınç tepkisi?",
    options: [
      "Basınç düşer, kabin irtifası artar",
      "Basınç yükselir",
      "Dış basınç anında kabine eşitlenir",
    ],
    correct: 0,
    setup: () =>
      configure("cruise", (s) => {
        s.controls.pressureMode = "MANUAL";
        s.controls.manualOutflow = 0.85;
      }),
    result: (s: AircraftState) =>
      `Kabin ${s.cabinAltitude.toFixed(0)} ft, rate ${s.cabinRate.toFixed(0)} ft/min, ΔP ${s.delta.toFixed(2)} psi.`,
  },
  {
    title: "Recirculation kaybı",
    prompt: "İki recirculation fanı kapanacak. Taze pack talebi?",
    options: ["Artar", "Sıfır olur", "Kabin hacmine eşit olur"],
    correct: 0,
    setup: () =>
      configure("normal", (s) => {
        s.controls.recirc = [false, false];
      }),
    result: (s: AircraftState) =>
      `Taze talep ${(s.demand[0] + s.demand[1]).toFixed(2)} kg/s; recirculation ${s.recircFlow.toFixed(2)} kg/s.`,
  },
];
export function challengeSetup(id: number): AircraftState {
  const s = createState(id === 1 ? "ground" : "cruise");
  if (id === 0) {
    s.controls.pressureMode = "MANUAL";
    setFault(s, "auto_fail", true);
    s.controls.altitudeTarget = 39000;
    s.controls.manualOutflow = 0.5;
  }
  if (id === 1) {
    s.zoneTemps = [34, 34, 34];
    s.controls.passengers = 220;
    s.controls.oatOffset = 25;
    s.controls.coolingFan = false;
    setFault(s, "pack_closed_0", true);
  }
  if (id === 2) {
    setFault(s, "duct_leak_1", true, true);
    s.events = [];
  }
  if (id === 3) s.controls.leakArea = 10;
  s.challenge = {
    id,
    duration: challenges[id].duration,
    elapsed: 0,
    good: 0,
    active: true,
    decision: "",
    score: null,
  };
  return s;
}
export const challenges = [
  {
    title: "Uçağı basınçlandır",
    description:
      "AUTO arızalı, uçak tırmanıyor. 120 saniye boyunca kabin < 9.000 ft, |rate| < 600 ft/min ve ΔP limit altında tut.",
    duration: 120,
  },
  {
    title: "Kabini serin tut",
    description:
      "Sıcak gün, 220 yolcu, bir pack arızalı. APU, sağlam pack, fan ve recirculation ile 10 dakika sonunda kabini 28 °C altına getir.",
    duration: 600,
  },
  {
    title: "Kaçağı bul ve izole et",
    description:
      "Gizli duct kaçağının tarafını ölçerek belirle. 90 saniye içinde doğru teşhis koy ve kaçağın pnömatik beslemesini kes.",
    duration: 90,
  },
  {
    title: "Basıncı koru",
    description:
      "180 saniyede kaçak 10 → 100 cm² büyür. Kabini 10.000 ft altında tut; sonunda packlerin yetip yetmediğini ölçümle değerlendir.",
    duration: 180,
  },
];
