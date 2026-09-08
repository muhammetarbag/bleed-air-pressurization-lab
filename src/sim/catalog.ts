export interface Fault {
  id: string;
  label: string;
  group: string;
  symptom: string;
}
const sideFaults = [
  ["bleed_fail", "Bleed kaybı", "Kaynak basıncı ve debisi kaybolur."],
  [
    "prsov_closed",
    "PRSOV stuck closed",
    "Aç komutuna rağmen valf kapalı; ilgili kaynak debisi sıfır.",
  ],
  [
    "prsov_open",
    "PRSOV stuck open",
    "Kapat komutuna rağmen valf açık kalır; yüksek güçte basınç koruması devreye girer.",
  ],
  [
    "regulation",
    "Pressure regulation fail",
    "Regüle basınç yükselir; aşırı basınç koruması kaynağı keser.",
  ],
  [
    "precooler",
    "Precooler ineffective",
    "Soğutma azalır; yüksek çıkış sıcaklığı koruma kapatmasına yol açar.",
  ],
  [
    "duct_leak",
    "Bleed duct leak",
    "Duct çevresi ısınır; dedektör, kaynak ve isolation korumasını tetikler.",
  ],
  [
    "bleed_pressure_sensor",
    "Bleed pressure sensor fail",
    "Gösterge basıncı kaybolur; bağımsız referans ölçümü kullanılabilir.",
  ],
  [
    "bleed_temp_sensor",
    "Bleed temperature sensor fail",
    "Gösterge sıcaklığı kaybolur; fiziksel akış sürer.",
  ],
  [
    "pack_closed",
    "Pack valve stuck closed",
    "Valf açılamaz; pack debisi sıfırdır.",
  ],
  [
    "pack_open",
    "Pack valve stuck open",
    "OFF komutuna rağmen valf açık kalır.",
  ],
  [
    "pack_overheat",
    "Pack overheat",
    "Pack çıkışı ısınır; bağımsız koruma beslemeyi kapatır.",
  ],
  [
    "compressor",
    "ACM compressor fail",
    "Basınç yükseltme kaybolur; türbin soğutma yeteneği azalır.",
  ],
  [
    "turbine",
    "ACM turbine fail",
    "Genişlemeden iş üretimi ve soğutma kaybolur.",
  ],
  [
    "ram_blocked",
    "Ram air inlet blocked",
    "Eşanjör ısı atımı azalır; pack sıcaklığı yükselir.",
  ],
  [
    "pack_temp_sensor",
    "Pack temperature sensor bias",
    "Gösterge +18 °C sapar; sıcaklık kontrolü havayı gereğinden fazla soğutur.",
  ],
  [
    "pack_flow_sensor",
    "Pack flow sensor fail",
    "Debi göstergesi 0 okur; gerçek hava beslemesi sürer.",
  ],
  [
    "temp_controller",
    "Temperature controller fail",
    "Pack bypass sıcaklık komutu 42 °C konumunda donar.",
  ],
] as const;
export const faults: Fault[] = [
  ...[0, 1].flatMap((i) =>
    sideFaults.map(([id, label, symptom]) => ({
      id: `${id}_${i}`,
      label: `${i + 1} · ${label}`,
      group:
        id.startsWith("pack") ||
        ["compressor", "turbine", "ram_blocked", "temp_controller"].includes(id)
          ? "Pack / ACM"
          : "Bleed / duct",
      symptom,
    })),
  ),
  ...[
    [
      "iso_open",
      "Isolation stuck open",
      "İki taraf ayrılmaz; duct leak karşı tarafa erişebilir.",
    ],
    [
      "iso_closed",
      "Isolation stuck closed",
      "Karşı kaynak pack beslemesini devralamaz.",
    ],
    ["apu_fail", "APU bleed fail", "APU pnömatik kaynağı kaybolur."],
    [
      "auto_fail",
      "Auto pressure controller fail",
      "Outflow komutu son değerinde kalır; MANUAL kullanılabilir.",
    ],
    [
      "outflow_open",
      "Outflow stuck open",
      "Kabin havası yüksek debiyle çıkar; basınçlandırma zayıflar.",
    ],
    [
      "outflow_closed",
      "Outflow stuck closed",
      "Outflow kapanır; pozitif relief devreye girebilir.",
    ],
    [
      "outflow_actuator",
      "Outflow actuator fail",
      "Valf gerçek konumu donar; komut değişebilir.",
    ],
    [
      "outflow_sensor",
      "Outflow position sensor fail",
      "Gösterge %73 konumunda donar; gerçek valf hareket eder.",
    ],
    [
      "cabin_pressure_sensor",
      "Cabin pressure sensor fail",
      "Ana basınç okuması kaybolur; AUTO yedek sensöre geçer.",
    ],
    [
      "cabin_alt_sensor",
      "Cabin altitude indication fail",
      "Kabin irtifa göstergesi +4.000 ft sapar.",
    ],
    [
      "delta_sensor",
      "Differential pressure sensor fail",
      "ΔP göstergesi +2 psi sapar.",
    ],
    ["cabin_leak", "Cabin slow leak", "İlave 12 cm² kaçak açılır."],
    ["rapid_leak", "Cabin rapid leak", "İlave 300 cm² kaçak açılır."],
  ].map(([id, label, symptom]) => ({
    id,
    label,
    group: "Pressure / shared",
    symptom,
  })),
];
export const faultIds = new Set(faults.map((f) => f.id));
export const faultLabel = (id: string) =>
  faults.find((f) => f.id === id)?.label ?? id;
