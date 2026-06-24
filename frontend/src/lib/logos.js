/* Logo resolution.
 *
 * Order: locally cached logo (from /public/logos, populated by a one-time fetch
 * script from each company's own website) → Brandfetch CDN by domain → monogram.
 * Local logos are always best — sharp, fast, no third-party dependency.
 */

import LOGO_MANIFEST from "../../public/logos/manifest.json";

const CLIENT_ID = import.meta.env.VITE_BRANDFETCH_CLIENT_ID;

// Seeded ticker → primary domain for the most-traded JSE names. Mirrors the
// `website` column in the DB (this is the pre-deploy / fallback copy).
export const COMPANY_DOMAINS = {
  NPN: "naspers.com", PRX: "prosus.com", SOL: "sasol.com", FSR: "firstrand.co.za",
  SBK: "standardbank.com", ABG: "absa.africa", NED: "nedbank.co.za", CPI: "capitecbank.co.za",
  MTN: "mtn.com", VOD: "vodacom.co.za", SHP: "shoprite.co.za", WHL: "woolworthsholdings.co.za",
  BVT: "bidvest.com", BID: "bidcorpgroup.com", BTI: "bat.com", AGL: "angloamerican.com",
  BHP: "bhp.com", GLN: "glencore.com", IMP: "implats.co.za", AMS: "angloamericanplatinum.com",
  SSW: "sibanyestillwater.com", GFI: "goldfields.com", ANG: "anglogoldashanti.com",
  HAR: "harmony.co.za", EXX: "exxaro.com", KIO: "angloamericankumba.com", ARI: "arm.co.za",
  NHM: "northam.co.za", CFR: "richemont.com", NRP: "nepirockcastle.com", GRT: "growthpoint.co.za",
  RDF: "redefine.co.za", DSY: "discovery.co.za", SLM: "sanlam.com", OMU: "oldmutual.com",
  MTM: "momentummetropolitan.co.za", MNP: "mondigroup.com", REM: "remgro.com", RNI: "reinet.com",
  INL: "investec.com", INP: "investec.com", QLT: "quilter.com", PPH: "pepkor.co.za",
  AVI: "avi.co.za", TBS: "tigerbrands.com", CLS: "clicksgroup.co.za", TFG: "tfglimited.co.za",
  MRP: "mrpricegroup.com", TRU: "truworths.co.za", DCP: "dischem.co.za", SPP: "spar.co.za",
  PIK: "pnp.co.za", TKG: "telkom.co.za", ARL: "astralfoods.com", SNV: "santova.com",
  KAP: "kap.co.za", WBO: "wbho.co.za",
  // Expanded coverage (#1)
  APN: "aspenpharma.com", NTC: "netcare.co.za", LHC: "lifehealthcare.co.za", ADH: "advtech.co.za",
  CML: "coronation.com", KST: "psg.co.za", MCG: "multichoice.com", PPC: "ppc.africa",
  SAP: "sappi.com", ATT: "attacq.co.za", HYP: "hyprop.co.za", VKE: "vukile.co.za",
  TGA: "thungela.com", RBX: "raubex.com", MUR: "murrob.com", AFE: "aeci.co.za",
  AFT: "afrimat.co.za", BAW: "barloworld.com", SUI: "suninternational.com", TSG: "tsogosun.com",
  HCI: "hci.co.za", EQU: "equites.co.za", OUT: "outsurance.co.za", ITE: "italtile.co.za",
  CAT: "caxton.co.za", BLU: "bluelabeltelecoms.com", DTC: "datatec.com", EOH: "eoh.co.za",
  RLO: "reunert.com", GND: "grindrod.com", RES: "resilient.co.za", ACL: "arcelormittalsa.com",
  MTA: "metair.co.za", DRD: "drdgold.com", PAN: "panafricanresources.com", SGL: "supergroup.co.za",
  SAC: "sacorporatefund.co.za", NY1: "ninetyone.com",
};

// `fallback=transparent` makes Brandfetch return a 1x1 transparent pixel when
// they don't have the logo, instead of their default "B" lettermark placeholder.
// CompanyLogo detects the 1px image and falls back to a monogram.
const buildUrl = (dom) =>
  `https://cdn.brandfetch.io/${dom}/w/80/h/80?c=${CLIENT_ID}&fallback=transparent`;

/** Direct Brandfetch logo URL for marquee / brand-wall use (by domain). */
export function brandfetchUrl(domain, size = 128) {
  if (!CLIENT_ID || !domain) return null;
  return `https://cdn.brandfetch.io/${domain}/w/${size}/h/${size}?c=${CLIENT_ID}&fallback=transparent`;
}

/** Ordered logo URLs to try: local file → Brandfetch → (none → monogram). */
export function logoSources(ticker, domain) {
  if (!ticker) return [];
  const t = String(ticker).toUpperCase();
  const out = [];
  // 1. Locally cached logo (best — sharp, fast, no external dependency)
  const ext = LOGO_MANIFEST[t];
  if (ext) out.push(`/logos/${t}.${ext}`);
  // 2. Brandfetch by domain (covers companies we couldn't scrape directly)
  const dom = domain || COMPANY_DOMAINS[t];
  if (CLIENT_ID && dom) out.push(buildUrl(dom));
  return out;
}
