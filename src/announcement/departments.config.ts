export const DEPARTMENT_URLS = {
  siirtUniversitesi: 'https://siirt.edu.tr/',
  bilgisayarMuhendisligi: 'https://bilgisayar.siirt.edu.tr/',
  elektrikElektronikMuhendisligi: 'https://eem.siirt.edu.tr/',
  gidaMuhendisligi: 'https://gida.siirt.edu.tr/',
  insaatMuhendisligi: 'https://insaatmuh.siirt.edu.tr/',
  kimyaMuhendisligi: 'https://kimyamuhendisligi.siirt.edu.tr/',
  makineMuhendisligi: 'https://makine.siirt.edu.tr/',
  egitimBilimleri: 'https://egitimbilimleri.siirt.edu.tr/',
  matematikVeFenBilimleri: 'https://mfbeb.siirt.edu.tr/',
  temelEgitim: 'https://temelegitim.siirt.edu.tr/',
  turkceVeSosyalBilimlerEgitimi: 'https://sbteb.siirt.edu.tr/',
  yabanciDillerEgitimi: 'https://yabancidil.siirt.edu.tr/',
  biyoloji: 'https://biyoloji.siirt.edu.tr/',
  cografya: 'https://cografya.siirt.edu.tr/',
  kimya: 'https://kimya.siirt.edu.tr/',
  matematik: 'https://matematik.siirt.edu.tr/',
  sosyoloji: 'https://sosyoloji.siirt.edu.tr/',
  psikoloji: 'https://psikoloji.siirt.edu.tr/',
  tarih: 'https://tarih.siirt.edu.tr/',
  turkDiliVeEdebiyati: 'https://turkdili.siirt.edu.tr/',
  mutercimTercumanlik: 'https://mutercimtercuman.siirt.edu.tr/',

  // Diğer bölümler...
} as const;

export type DepartmentKeys = keyof typeof DEPARTMENT_URLS;
