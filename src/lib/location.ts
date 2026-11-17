/**
 * Does a job's location satisfy a user's location filter?
 *
 * Boards write the same place many ways ("New York, NY", "NYC", "Brooklyn",
 * "Hybrid - Manhattan") and regions not at all ("San Francisco, CA" is in the
 * United States but never says so). A plain substring test missed both, so
 * the filter resolves to a set of aliases, or to a region test.
 */

const METROS: Record<string, string[]> = {
  "new york": ["new york", "nyc", "brooklyn", "manhattan", "queens", "bronx", "long island city", "jersey city", "hoboken"],
  "san francisco": ["san francisco", "sf", "bay area", "south san francisco", "oakland", "palo alto", "menlo park", "mountain view", "san mateo", "redwood city"],
  "los angeles": ["los angeles", "santa monica", "culver city", "playa vista", "el segundo", "venice, ca"],
  "washington dc": ["washington, dc", "washington dc", "washington, d.c.", "washington d.c.", "d.c.", "arlington, va"],
  "seattle": ["seattle", "bellevue", "redmond", "kirkland"],
  "boston": ["boston", "cambridge, ma", "somerville"],
  "london": ["london"],
};
const METRO_KEYS: Record<string, string> = {
  nyc: "new york", "new york city": "new york", "new york, ny": "new york",
  sf: "san francisco", "bay area": "san francisco", "sf bay area": "san francisco",
  la: "los angeles", dc: "washington dc", "washington, dc": "washington dc", "washington d.c.": "washington dc",
};

const US_STATES =
  "AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC";
const US_STATE_ABBR = new RegExp(`(?:,|\\s)\\s*(?:${US_STATES})\\b(?!\\.)`);
const US_WORDS = /\b(?:united states|usa|u\.s\.a?\.?|us|america|north america|amer)\b/i;
const US_STATE_NAMES =
  /\b(?:alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b/i;

const EUROPE =
  /\b(?:europe|emea|eu|uk|united kingdom|england|scotland|ireland|dublin|london|germany|berlin|munich|france|paris|spain|madrid|barcelona|portugal|lisbon|netherlands|amsterdam|belgium|brussels|switzerland|zurich|austria|vienna|italy|milan|rome|sweden|stockholm|norway|oslo|denmark|copenhagen|finland|helsinki|poland|warsaw|czech|prague|romania|greece|estonia|lithuania|latvia)\b/i;

const NON_US =
  /\b(?:canada|toronto|vancouver|montreal|mexico|brazil|argentina|colombia|india|bangalore|bengaluru|singapore|japan|tokyo|china|australia|sydney|melbourne|israel|tel aviv|korea|seoul|philippines|uae|dubai|south africa)\b/i;

function isUS(loc: string): boolean {
  if (EUROPE.test(loc) || NON_US.test(loc)) {
    // Multi-location strings ("London or New York") still count if a US place is named.
    // (No two-letter state check here: "Toronto, CA" is Canada.)
    return /\b(?:united states|usa)\b/i.test(loc) || US_STATE_NAMES.test(loc) || anyMetro(loc, ["new york", "san francisco", "los angeles", "washington dc", "seattle", "boston"]);
  }
  return US_WORDS.test(loc) || US_STATE_ABBR.test(loc) || US_STATE_NAMES.test(loc) || anyMetro(loc, Object.keys(METROS).filter((m) => m !== "london"));
}

const word = (s: string) => new RegExp(`(?<![a-z])${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z])`, "i");

function anyMetro(loc: string, metros: string[]): boolean {
  return metros.some((m) => METROS[m].some((alias) => word(alias).test(loc)));
}

type Place = { kind: "metro"; metro: string } | { kind: "us" } | { kind: "europe" } | { kind: "text"; text: string };

function resolve(filter: string): Place {
  const f = filter.trim().toLowerCase();
  if (["united states", "us", "usa", "u.s.", "america"].includes(f)) return { kind: "us" };
  if (["europe", "eu", "emea"].includes(f)) return { kind: "europe" };
  const key = METRO_KEYS[f] ?? (METROS[f] ? f : Object.keys(METROS).find((m) => f.startsWith(m)));
  if (key) return { kind: "metro", metro: key };
  return { kind: "text", text: f };
}

function inPlace(loc: string, place: Place): boolean {
  switch (place.kind) {
    case "us": return isUS(loc);
    case "europe": return EUROPE.test(loc);
    case "metro": return anyMetro(loc, [place.metro]);
    case "text": return loc.toLowerCase().includes(place.text);
  }
}

/** Remote-flavoured location with nothing more specific: "Remote", "Anywhere". */
const BARE_REMOTE = /^\s*(?:remote|anywhere|distributed|worldwide|global)\s*$/i;

// Places a role can be tied to below country level. Field roles marked
// "remote" usually mean "live in this territory": "Remote - Texas",
// "Enterprise AE (Atlanta)", "Enterprise AE, Southeast".
const US_CITIES =
  /\b(?:atlanta|dallas|houston|austin|san antonio|chicago|denver|boulder|miami|tampa|orlando|phoenix|scottsdale|seattle|portland|boston|philadelphia|pittsburgh|nashville|charlotte|raleigh|durham|minneapolis|detroit|st\.? louis|kansas city|stl|kc|salt lake|las vegas|san diego|sacramento|columbus|cincinnati|cleveland|indianapolis|baltimore|richmond|new orleans|honolulu|anchorage|omaha|milwaukee|louisville|memphis|birmingham|jacksonville|buffalo|hartford|providence|newark|princeton|irvine|san jose|los angeles|san francisco|washington)\b/i;
const US_REGIONS =
  /\b(?:southeast|southwest|northeast|northwest|pacific northwest|midwest|mid-atlantic|mid atlantic|central|great lakes|ohio valley|rockies|mountain|gulf|new england|tri-state|tristate|east coast|west coast|east|west)\b/i;

/** Regions that include each metro — "Northeast" covers New York. */
const METRO_REGIONS: Record<string, RegExp> = {
  "new york": /\b(?:northeast|east coast|east|tri-?state|new england)\b/i,
  "san francisco": /\b(?:west coast|west|bay area|norcal|northern california)\b/i,
  "los angeles": /\b(?:west coast|west|socal|southern california)\b/i,
  "washington dc": /\b(?:mid-?atlantic|east coast|east)\b/i,
  "seattle": /\b(?:pacific northwest|northwest|west coast|west)\b/i,
  "boston": /\b(?:northeast|new england|east coast|east)\b/i,
};

/** Does this text tie the role to a US place below country level? */
function namesUsPlace(text: string): boolean {
  text = text.replace(/\b(?:north america|americas|united states|usa|us)\b/gi, " ");
  return US_STATE_NAMES.test(text) || US_STATE_ABBR.test(text) || /\((?:[A-Z]{2})\)/.test(text) || US_CITIES.test(text) || US_REGIONS.test(text);
}

/** Text names a place, and it's somewhere the user isn't. */
function namesOtherPlace(text: string, place: Place): boolean {
  if (!namesUsPlace(text)) return false;
  if (place.kind === "us") return false;
  if (place.kind === "metro") {
    if (anyMetro(text, [place.metro])) return false;
    if (METRO_REGIONS[place.metro]?.test(text)) return false;
    // "New York" also names the state.
    if (place.metro === "new york" && /\bny\b/i.test(text)) return false;
  }
  return true;
}

/**
 * Location filter as the summary line describes it: "<place> or remote" when
 * the user hasn't restricted work arrangement. A remote role counts if you
 * can do it from where you are: open anywhere / countrywide, or tied to your
 * own area — not a territory role somewhere else.
 */
export function locationOk(
  job: { location: string | null; remote: boolean; title?: string },
  filter: string,
  remoteOnly: boolean | null,
): boolean {
  const loc = (job.location ?? "").trim();
  const place = resolve(filter);
  if (!loc) return job.remote && !namesOtherPlace(job.title ?? "", place);
  if (inPlace(loc, place)) return true;
  if (!job.remote || remoteOnly === false) return false;

  const userInUS = place.kind === "us" || (place.kind === "metro" && place.metro !== "london");
  const inEurope = place.kind === "europe" || (place.kind === "metro" && place.metro === "london");

  // Remote, but the location names a specific place that isn't yours.
  const where = loc.replace(/\b(?:remote|hybrid|anywhere|distributed|office)\b/gi, " ");
  if (userInUS && namesOtherPlace(where, place)) return false;

  const countrywide = BARE_REMOTE.test(loc) || (userInUS ? isUS(loc) : inEurope ? EUROPE.test(loc) : false);
  if (!countrywide) return false;
  // Open countrywide, but the title is a territory elsewhere ("Enterprise AE, Chicago").
  return !(userInUS && namesOtherPlace(job.title ?? "", place));
}
