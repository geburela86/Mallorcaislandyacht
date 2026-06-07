/** @typedef {{ iso: string, dial: string, flag: string, names: Record<string, string>, nationalLength?: number[], nationalPattern?: RegExp }} PhoneCountry */

/** Shown right after Spain in the country selector. */
export const PHONE_COUNTRY_PRIORITY = [
  "GB", "DE", "FR", "IT", "CH", "PT", "NL", "BE", "AT", "IE",
  "SE", "NO", "DK", "FI", "PL", "US", "CA", "AU", "NZ",
  "GR", "HR", "MT", "CY", "MC", "AD", "LU", "LI", "GI",
  "MA", "TN", "DZ", "EG", "AE", "SA", "QA", "IL", "TR",
  "RU", "UA", "CZ", "SK", "HU", "RO", "BG", "RS", "SI",
  "MX", "BR", "AR", "CO", "CL", "SG", "HK", "JP", "CN", "IN",
];

/** @type {PhoneCountry[]} */
export const PHONE_COUNTRIES = [
  { iso: "ES", dial: "34", flag: "🇪🇸", names: { en: "Spain", es: "España", de: "Spanien", fr: "Espagne", sv: "Spanien" }, nationalLength: [9], nationalPattern: /^[67]\d{8}$/ },
  { iso: "GB", dial: "44", flag: "🇬🇧", names: { en: "United Kingdom", es: "Reino Unido", de: "Vereinigtes Königreich", fr: "Royaume-Uni", sv: "Storbritannien" }, nationalLength: [10], nationalPattern: /^7\d{9}$/ },
  { iso: "DE", dial: "49", flag: "🇩🇪", names: { en: "Germany", es: "Alemania", de: "Deutschland", fr: "Allemagne", sv: "Tyskland" }, nationalLength: [10, 11], nationalPattern: /^1[5-7]\d{8,9}$/ },
  { iso: "FR", dial: "33", flag: "🇫🇷", names: { en: "France", es: "Francia", de: "Frankreich", fr: "France", sv: "Frankrike" }, nationalLength: [9], nationalPattern: /^[67]\d{8}$/ },
  { iso: "IT", dial: "39", flag: "🇮🇹", names: { en: "Italy", es: "Italia", de: "Italien", fr: "Italie", sv: "Italien" }, nationalLength: [9, 10], nationalPattern: /^3\d{8,9}$/ },
  { iso: "PT", dial: "351", flag: "🇵🇹", names: { en: "Portugal", es: "Portugal", de: "Portugal", fr: "Portugal", sv: "Portugal" }, nationalLength: [9], nationalPattern: /^9\d{8}$/ },
  { iso: "NL", dial: "31", flag: "🇳🇱", names: { en: "Netherlands", es: "Países Bajos", de: "Niederlande", fr: "Pays-Bas", sv: "Nederländerna" }, nationalLength: [9], nationalPattern: /^6\d{8}$/ },
  { iso: "BE", dial: "32", flag: "🇧🇪", names: { en: "Belgium", es: "Bélgica", de: "Belgien", fr: "Belgique", sv: "Belgien" }, nationalLength: [9], nationalPattern: /^4\d{8}$/ },
  { iso: "CH", dial: "41", flag: "🇨🇭", names: { en: "Switzerland", es: "Suiza", de: "Schweiz", fr: "Suisse", sv: "Schweiz" }, nationalLength: [9], nationalPattern: /^7[5-9]\d{7}$/ },
  { iso: "AT", dial: "43", flag: "🇦🇹", names: { en: "Austria", es: "Austria", de: "Österreich", fr: "Autriche", sv: "Österrike" }, nationalLength: [10, 11], nationalPattern: /^6\d{9,10}$/ },
  { iso: "IE", dial: "353", flag: "🇮🇪", names: { en: "Ireland", es: "Irlanda", de: "Irland", fr: "Irlande", sv: "Irland" }, nationalLength: [9], nationalPattern: /^8[3-9]\d{7}$/ },
  { iso: "SE", dial: "46", flag: "🇸🇪", names: { en: "Sweden", es: "Suecia", de: "Schweden", fr: "Suède", sv: "Sverige" }, nationalLength: [9], nationalPattern: /^7\d{8}$/ },
  { iso: "NO", dial: "47", flag: "🇳🇴", names: { en: "Norway", es: "Noruega", de: "Norwegen", fr: "Norvège", sv: "Norge" }, nationalLength: [8], nationalPattern: /^[49]\d{7}$/ },
  { iso: "DK", dial: "45", flag: "🇩🇰", names: { en: "Denmark", es: "Dinamarca", de: "Dänemark", fr: "Danemark", sv: "Danmark" }, nationalLength: [8], nationalPattern: /^[2-9]\d{7}$/ },
  { iso: "FI", dial: "358", flag: "🇫🇮", names: { en: "Finland", es: "Finlandia", de: "Finnland", fr: "Finlande", sv: "Finland" }, nationalLength: [9, 10], nationalPattern: /^4\d{8,9}$/ },
  { iso: "PL", dial: "48", flag: "🇵🇱", names: { en: "Poland", es: "Polonia", de: "Polen", fr: "Pologne", sv: "Polen" }, nationalLength: [9], nationalPattern: /^[5-8]\d{8}$/ },
  { iso: "GR", dial: "30", flag: "🇬🇷", names: { en: "Greece", es: "Grecia", de: "Griechenland", fr: "Grèce", sv: "Grekland" }, nationalLength: [10] },
  { iso: "HR", dial: "385", flag: "🇭🇷", names: { en: "Croatia", es: "Croacia", de: "Kroatien", fr: "Croatie", sv: "Kroatien" }, nationalLength: [8, 9] },
  { iso: "MT", dial: "356", flag: "🇲🇹", names: { en: "Malta", es: "Malta", de: "Malta", fr: "Malte", sv: "Malta" }, nationalLength: [8] },
  { iso: "CY", dial: "357", flag: "🇨🇾", names: { en: "Cyprus", es: "Chipre", de: "Zypern", fr: "Chypre", sv: "Cypern" }, nationalLength: [8] },
  { iso: "LU", dial: "352", flag: "🇱🇺", names: { en: "Luxembourg", es: "Luxemburgo", de: "Luxemburg", fr: "Luxembourg", sv: "Luxemburg" }, nationalLength: [9] },
  { iso: "MC", dial: "377", flag: "🇲🇨", names: { en: "Monaco", es: "Mónaco", de: "Monaco", fr: "Monaco", sv: "Monaco" }, nationalLength: [8, 9] },
  { iso: "AD", dial: "376", flag: "🇦🇩", names: { en: "Andorra", es: "Andorra", de: "Andorra", fr: "Andorre", sv: "Andorra" }, nationalLength: [6] },
  { iso: "LI", dial: "423", flag: "🇱🇮", names: { en: "Liechtenstein", es: "Liechtenstein", de: "Liechtenstein", fr: "Liechtenstein", sv: "Liechtenstein" }, nationalLength: [7] },
  { iso: "GI", dial: "350", flag: "🇬🇮", names: { en: "Gibraltar", es: "Gibraltar", de: "Gibraltar", fr: "Gibraltar", sv: "Gibraltar" }, nationalLength: [8] },
  { iso: "IS", dial: "354", flag: "🇮🇸", names: { en: "Iceland", es: "Islandia", de: "Island", fr: "Islande", sv: "Island" }, nationalLength: [7] },
  { iso: "CZ", dial: "420", flag: "🇨🇿", names: { en: "Czechia", es: "Chequia", de: "Tschechien", fr: "Tchéquie", sv: "Tjeckien" }, nationalLength: [9] },
  { iso: "SK", dial: "421", flag: "🇸🇰", names: { en: "Slovakia", es: "Eslovaquia", de: "Slowakei", fr: "Slovaquie", sv: "Slovakien" }, nationalLength: [9] },
  { iso: "HU", dial: "36", flag: "🇭🇺", names: { en: "Hungary", es: "Hungría", de: "Ungarn", fr: "Hongrie", sv: "Ungern" }, nationalLength: [9] },
  { iso: "RO", dial: "40", flag: "🇷🇴", names: { en: "Romania", es: "Rumanía", de: "Rumänien", fr: "Roumanie", sv: "Rumänien" }, nationalLength: [9] },
  { iso: "BG", dial: "359", flag: "🇧🇬", names: { en: "Bulgaria", es: "Bulgaria", de: "Bulgarien", fr: "Bulgarie", sv: "Bulgarien" }, nationalLength: [8, 9] },
  { iso: "RS", dial: "381", flag: "🇷🇸", names: { en: "Serbia", es: "Serbia", de: "Serbien", fr: "Serbie", sv: "Serbien" }, nationalLength: [8, 9] },
  { iso: "SI", dial: "386", flag: "🇸🇮", names: { en: "Slovenia", es: "Eslovenia", de: "Slowenien", fr: "Slovénie", sv: "Slovenien" }, nationalLength: [8] },
  { iso: "BA", dial: "387", flag: "🇧🇦", names: { en: "Bosnia and Herzegovina", es: "Bosnia y Herzegovina", de: "Bosnien und Herzegowina", fr: "Bosnie-Herzégovine", sv: "Bosnien och Hercegovina" }, nationalLength: [8, 9] },
  { iso: "AL", dial: "355", flag: "🇦🇱", names: { en: "Albania", es: "Albania", de: "Albanien", fr: "Albanie", sv: "Albanien" }, nationalLength: [9] },
  { iso: "MK", dial: "389", flag: "🇲🇰", names: { en: "North Macedonia", es: "Macedonia del Norte", de: "Nordmazedonien", fr: "Macédoine du Nord", sv: "Nordmakedonien" }, nationalLength: [8] },
  { iso: "EE", dial: "372", flag: "🇪🇪", names: { en: "Estonia", es: "Estonia", de: "Estland", fr: "Estonie", sv: "Estland" }, nationalLength: [7, 8] },
  { iso: "LV", dial: "371", flag: "🇱🇻", names: { en: "Latvia", es: "Letonia", de: "Lettland", fr: "Lettonie", sv: "Lettland" }, nationalLength: [8] },
  { iso: "LT", dial: "370", flag: "🇱🇹", names: { en: "Lithuania", es: "Lituania", de: "Litauen", fr: "Lituanie", sv: "Litauen" }, nationalLength: [8] },
  { iso: "UA", dial: "380", flag: "🇺🇦", names: { en: "Ukraine", es: "Ucrania", de: "Ukraine", fr: "Ukraine", sv: "Ukraina" }, nationalLength: [9] },
  { iso: "RU", dial: "7", flag: "🇷🇺", names: { en: "Russia", es: "Rusia", de: "Russland", fr: "Russie", sv: "Ryssland" }, nationalLength: [10] },
  { iso: "TR", dial: "90", flag: "🇹🇷", names: { en: "Turkey", es: "Turquía", de: "Türkei", fr: "Turquie", sv: "Turkiet" }, nationalLength: [10] },
  { iso: "IL", dial: "972", flag: "🇮🇱", names: { en: "Israel", es: "Israel", de: "Israel", fr: "Israël", sv: "Israel" }, nationalLength: [9] },
  { iso: "MA", dial: "212", flag: "🇲🇦", names: { en: "Morocco", es: "Marruecos", de: "Marokko", fr: "Maroc", sv: "Marocko" }, nationalLength: [9] },
  { iso: "TN", dial: "216", flag: "🇹🇳", names: { en: "Tunisia", es: "Túnez", de: "Tunesien", fr: "Tunisie", sv: "Tunisien" }, nationalLength: [8] },
  { iso: "DZ", dial: "213", flag: "🇩🇿", names: { en: "Algeria", es: "Argelia", de: "Algerien", fr: "Algérie", sv: "Algeriet" }, nationalLength: [9] },
  { iso: "EG", dial: "20", flag: "🇪🇬", names: { en: "Egypt", es: "Egipto", de: "Ägypten", fr: "Égypte", sv: "Egypten" }, nationalLength: [10] },
  { iso: "AE", dial: "971", flag: "🇦🇪", names: { en: "United Arab Emirates", es: "Emiratos Árabes Unidos", de: "Vereinigte Arabische Emirate", fr: "Émirats arabes unis", sv: "Förenade Arabemiraten" }, nationalLength: [9] },
  { iso: "SA", dial: "966", flag: "🇸🇦", names: { en: "Saudi Arabia", es: "Arabia Saudita", de: "Saudi-Arabien", fr: "Arabie saoudite", sv: "Saudiarabien" }, nationalLength: [9] },
  { iso: "QA", dial: "974", flag: "🇶🇦", names: { en: "Qatar", es: "Catar", de: "Katar", fr: "Qatar", sv: "Qatar" }, nationalLength: [8] },
  { iso: "KW", dial: "965", flag: "🇰🇼", names: { en: "Kuwait", es: "Kuwait", de: "Kuwait", fr: "Koweït", sv: "Kuwait" }, nationalLength: [8] },
  { iso: "BH", dial: "973", flag: "🇧🇭", names: { en: "Bahrain", es: "Baréin", de: "Bahrain", fr: "Bahreïn", sv: "Bahrain" }, nationalLength: [8] },
  { iso: "OM", dial: "968", flag: "🇴🇲", names: { en: "Oman", es: "Omán", de: "Oman", fr: "Oman", sv: "Oman" }, nationalLength: [8] },
  { iso: "US", dial: "1", flag: "🇺🇸", names: { en: "United States", es: "Estados Unidos", de: "USA", fr: "États-Unis", sv: "USA" }, nationalLength: [10], nationalPattern: /^[2-9]\d{9}$/ },
  { iso: "CA", dial: "1", flag: "🇨🇦", names: { en: "Canada", es: "Canadá", de: "Kanada", fr: "Canada", sv: "Kanada" }, nationalLength: [10], nationalPattern: /^[2-9]\d{9}$/ },
  { iso: "MX", dial: "52", flag: "🇲🇽", names: { en: "Mexico", es: "México", de: "Mexiko", fr: "Mexique", sv: "Mexiko" }, nationalLength: [10], nationalPattern: /^1?\d{10}$/ },
  { iso: "BR", dial: "55", flag: "🇧🇷", names: { en: "Brazil", es: "Brasil", de: "Brasilien", fr: "Brésil", sv: "Brasilien" }, nationalLength: [10, 11] },
  { iso: "AR", dial: "54", flag: "🇦🇷", names: { en: "Argentina", es: "Argentina", de: "Argentinien", fr: "Argentine", sv: "Argentina" }, nationalLength: [10, 11] },
  { iso: "CL", dial: "56", flag: "🇨🇱", names: { en: "Chile", es: "Chile", de: "Chile", fr: "Chili", sv: "Chile" }, nationalLength: [9] },
  { iso: "CO", dial: "57", flag: "🇨🇴", names: { en: "Colombia", es: "Colombia", de: "Kolumbien", fr: "Colombie", sv: "Colombia" }, nationalLength: [10] },
  { iso: "PE", dial: "51", flag: "🇵🇪", names: { en: "Peru", es: "Perú", de: "Peru", fr: "Pérou", sv: "Peru" }, nationalLength: [9] },
  { iso: "VE", dial: "58", flag: "🇻🇪", names: { en: "Venezuela", es: "Venezuela", de: "Venezuela", fr: "Venezuela", sv: "Venezuela" }, nationalLength: [10] },
  { iso: "EC", dial: "593", flag: "🇪🇨", names: { en: "Ecuador", es: "Ecuador", de: "Ecuador", fr: "Équateur", sv: "Ecuador" }, nationalLength: [9] },
  { iso: "UY", dial: "598", flag: "🇺🇾", names: { en: "Uruguay", es: "Uruguay", de: "Uruguay", fr: "Uruguay", sv: "Uruguay" }, nationalLength: [8, 9] },
  { iso: "CR", dial: "506", flag: "🇨🇷", names: { en: "Costa Rica", es: "Costa Rica", de: "Costa Rica", fr: "Costa Rica", sv: "Costa Rica" }, nationalLength: [8] },
  { iso: "PA", dial: "507", flag: "🇵🇦", names: { en: "Panama", es: "Panamá", de: "Panama", fr: "Panama", sv: "Panama" }, nationalLength: [8] },
  { iso: "DO", dial: "1", flag: "🇩🇴", names: { en: "Dominican Republic", es: "República Dominicana", de: "Dominikanische Republik", fr: "République dominicaine", sv: "Dominikanska republiken" }, nationalLength: [10] },
  { iso: "PR", dial: "1", flag: "🇵🇷", names: { en: "Puerto Rico", es: "Puerto Rico", de: "Puerto Rico", fr: "Porto Rico", sv: "Puerto Rico" }, nationalLength: [10] },
  { iso: "ZA", dial: "27", flag: "🇿🇦", names: { en: "South Africa", es: "Sudáfrica", de: "Südafrika", fr: "Afrique du Sud", sv: "Sydafrika" }, nationalLength: [9] },
  { iso: "NG", dial: "234", flag: "🇳🇬", names: { en: "Nigeria", es: "Nigeria", de: "Nigeria", fr: "Nigeria", sv: "Nigeria" }, nationalLength: [10] },
  { iso: "AU", dial: "61", flag: "🇦🇺", names: { en: "Australia", es: "Australia", de: "Australien", fr: "Australie", sv: "Australien" }, nationalLength: [9] },
  { iso: "NZ", dial: "64", flag: "🇳🇿", names: { en: "New Zealand", es: "Nueva Zelanda", de: "Neuseeland", fr: "Nouvelle-Zélande", sv: "Nya Zeeland" }, nationalLength: [8, 9, 10] },
  { iso: "SG", dial: "65", flag: "🇸🇬", names: { en: "Singapore", es: "Singapur", de: "Singapur", fr: "Singapour", sv: "Singapore" }, nationalLength: [8] },
  { iso: "HK", dial: "852", flag: "🇭🇰", names: { en: "Hong Kong", es: "Hong Kong", de: "Hongkong", fr: "Hong Kong", sv: "Hongkong" }, nationalLength: [8] },
  { iso: "JP", dial: "81", flag: "🇯🇵", names: { en: "Japan", es: "Japón", de: "Japan", fr: "Japon", sv: "Japan" }, nationalLength: [10] },
  { iso: "KR", dial: "82", flag: "🇰🇷", names: { en: "South Korea", es: "Corea del Sur", de: "Südkorea", fr: "Corée du Sud", sv: "Sydkorea" }, nationalLength: [9, 10] },
  { iso: "CN", dial: "86", flag: "🇨🇳", names: { en: "China", es: "China", de: "China", fr: "Chine", sv: "Kina" }, nationalLength: [11] },
  { iso: "TW", dial: "886", flag: "🇹🇼", names: { en: "Taiwan", es: "Taiwán", de: "Taiwan", fr: "Taïwan", sv: "Taiwan" }, nationalLength: [9] },
  { iso: "IN", dial: "91", flag: "🇮🇳", names: { en: "India", es: "India", de: "Indien", fr: "Inde", sv: "Indien" }, nationalLength: [10] },
  { iso: "TH", dial: "66", flag: "🇹🇭", names: { en: "Thailand", es: "Tailandia", de: "Thailand", fr: "Thaïlande", sv: "Thailand" }, nationalLength: [9] },
  { iso: "MY", dial: "60", flag: "🇲🇾", names: { en: "Malaysia", es: "Malasia", de: "Malaysia", fr: "Malaisie", sv: "Malaysia" }, nationalLength: [9, 10] },
  { iso: "ID", dial: "62", flag: "🇮🇩", names: { en: "Indonesia", es: "Indonesia", de: "Indonesien", fr: "Indonésie", sv: "Indonesien" }, nationalLength: [9, 10, 11] },
  { iso: "PH", dial: "63", flag: "🇵🇭", names: { en: "Philippines", es: "Filipinas", de: "Philippinen", fr: "Philippines", sv: "Filippinerna" }, nationalLength: [10] },
  { iso: "VN", dial: "84", flag: "🇻🇳", names: { en: "Vietnam", es: "Vietnam", de: "Vietnam", fr: "Viêt Nam", sv: "Vietnam" }, nationalLength: [9, 10] },
];

export const DEFAULT_PHONE_COUNTRY_ISO = "ES";

const byIso = new Map(PHONE_COUNTRIES.map((c) => [c.iso, c]));
const NANP_PARSE_ORDER = ["US", "CA", "DO", "PR"];

function compareForE164Parse(a, b) {
  if (b.dial.length !== a.dial.length) return b.dial.length - a.dial.length;
  if (a.dial === "1" && b.dial === "1") {
    const ra = NANP_PARSE_ORDER.indexOf(a.iso);
    const rb = NANP_PARSE_ORDER.indexOf(b.iso);
    const ia = ra === -1 ? 99 : ra;
    const ib = rb === -1 ? 99 : rb;
    if (ia !== ib) return ia - ib;
  }
  return a.iso.localeCompare(b.iso);
}

const byDialDesc = [...PHONE_COUNTRIES].sort(compareForE164Parse);
const priorityRank = new Map(PHONE_COUNTRY_PRIORITY.map((iso, i) => [iso, i]));

export function getCountryByIso(iso) {
  return byIso.get(String(iso ?? "").trim().toUpperCase()) ?? null;
}

export function getCountryLabel(country, lang = "en") {
  if (!country) return "";
  const key = String(lang || "en").slice(0, 2).toLowerCase();
  return country.names[key] || country.names.en || country.iso;
}

export function sortedCountriesForLang(lang = "en") {
  const key = String(lang || "en").slice(0, 2).toLowerCase();
  const list = [...PHONE_COUNTRIES];
  list.sort((a, b) => {
    if (a.iso === DEFAULT_PHONE_COUNTRY_ISO) return -1;
    if (b.iso === DEFAULT_PHONE_COUNTRY_ISO) return 1;
    const pa = priorityRank.has(a.iso) ? priorityRank.get(a.iso) : 9999;
    const pb = priorityRank.has(b.iso) ? priorityRank.get(b.iso) : 9999;
    if (pa !== pb) return pa - pb;
    return getCountryLabel(a, key).localeCompare(getCountryLabel(b, key), key);
  });
  return list;
}

/** @param {string} e164 @returns {{ iso: string, national: string } | null} */
export function parseE164ToCountryParts(e164) {
  const raw = String(e164 ?? "").trim();
  if (!raw.startsWith("+")) return null;
  const all = raw.slice(1).replace(/\D/g, "");
  if (!all) return null;
  for (const c of byDialDesc) {
    if (!all.startsWith(c.dial)) continue;
    const national = all.slice(c.dial.length);
    if (!national) continue;
    return { iso: c.iso, national };
  }
  return null;
}
