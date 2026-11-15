import { NextRequest, NextResponse } from "next/server";

export interface UttarakhandPlace {
  id: string;
  name: string;
  category: "District" | "Tehsil" | "City" | "Town" | "Village" | "Locality";
  district: string;
  tehsil?: string;
  village?: string;
  displayName: string;
  lat: number;
  lon: number;
  zoom: number;
  source: "local" | "osm";
}

// In-memory cache to avoid duplicate remote requests
const searchCache = new Map<string, UttarakhandPlace[]>();

// Comprehensive curated dictionary of Uttarakhand's administrative centers & notable localities
const UTTARAKHAND_CORE_PLACES: UttarakhandPlace[] = [
  // 13 Districts
  { id: "dist_dehradun", name: "Dehradun", category: "District", district: "Dehradun", displayName: "Dehradun District, Uttarakhand", lat: 30.3165, lon: 78.0322, zoom: 10, source: "local" },
  { id: "dist_haridwar", name: "Haridwar", category: "District", district: "Haridwar", displayName: "Haridwar District, Uttarakhand", lat: 29.9457, lon: 78.1642, zoom: 10, source: "local" },
  { id: "dist_tehri", name: "Tehri Garhwal", category: "District", district: "Tehri Garhwal", displayName: "Tehri Garhwal District, Uttarakhand", lat: 30.3800, lon: 78.4800, zoom: 10, source: "local" },
  { id: "dist_uttarkashi", name: "Uttarkashi", category: "District", district: "Uttarkashi", displayName: "Uttarkashi District, Uttarakhand", lat: 30.7268, lon: 78.4354, zoom: 10, source: "local" },
  { id: "dist_chamoli", name: "Chamoli", category: "District", district: "Chamoli", displayName: "Chamoli District, Uttarakhand", lat: 30.4137, lon: 79.3243, zoom: 10, source: "local" },
  { id: "dist_pauri", name: "Pauri Garhwal", category: "District", district: "Pauri Garhwal", displayName: "Pauri Garhwal District, Uttarakhand", lat: 30.1500, lon: 78.7800, zoom: 10, source: "local" },
  { id: "dist_rudraprayag", name: "Rudraprayag", category: "District", district: "Rudraprayag", displayName: "Rudraprayag District, Uttarakhand", lat: 30.2844, lon: 78.9811, zoom: 10, source: "local" },
  { id: "dist_almora", name: "Almora", category: "District", district: "Almora", displayName: "Almora District, Uttarakhand", lat: 29.5971, lon: 79.6591, zoom: 10, source: "local" },
  { id: "dist_bageshwar", name: "Bageshwar", category: "District", district: "Bageshwar", displayName: "Bageshwar District, Uttarakhand", lat: 29.8400, lon: 79.7700, zoom: 10, source: "local" },
  { id: "dist_champawat", name: "Champawat", category: "District", district: "Champawat", displayName: "Champawat District, Uttarakhand", lat: 29.3300, lon: 80.1000, zoom: 10, source: "local" },
  { id: "dist_nainital", name: "Nainital", category: "District", district: "Nainital", displayName: "Nainital District, Uttarakhand", lat: 29.3803, lon: 79.4636, zoom: 10, source: "local" },
  { id: "dist_pithoragarh", name: "Pithoragarh", category: "District", district: "Pithoragarh", displayName: "Pithoragarh District, Uttarakhand", lat: 29.5800, lon: 80.2200, zoom: 10, source: "local" },
  { id: "dist_usnagar", name: "Udham Singh Nagar", category: "District", district: "Udham Singh Nagar", displayName: "Udham Singh Nagar District, Uttarakhand", lat: 28.9800, lon: 79.4000, zoom: 10, source: "local" },

  // Key Cities, Towns, Tehsils & Renowned Localities
  { id: "city_mussoorie", name: "Mussoorie", category: "Town", district: "Dehradun", tehsil: "Mussoorie", displayName: "Mussoorie, Dehradun, Uttarakhand", lat: 30.4598, lon: 78.0644, zoom: 12.5, source: "local" },
  { id: "city_rishikesh", name: "Rishikesh", category: "City", district: "Dehradun", tehsil: "Rishikesh", displayName: "Rishikesh, Dehradun, Uttarakhand", lat: 30.0869, lon: 78.2676, zoom: 12.5, source: "local" },
  { id: "town_joshimath", name: "Joshimath", category: "Town", district: "Chamoli", tehsil: "Joshimath Tehsil", displayName: "Joshimath, Chamoli, Uttarakhand", lat: 30.5556, lon: 79.5613, zoom: 12.5, source: "local" },
  { id: "town_ranikhet", name: "Ranikhet", category: "Town", district: "Almora", tehsil: "Ranikhet Tehsil", displayName: "Ranikhet, Almora, Uttarakhand", lat: 29.6434, lon: 79.4297, zoom: 12.5, source: "local" },
  { id: "town_haldwani", name: "Haldwani", category: "City", district: "Nainital", tehsil: "Haldwani", displayName: "Haldwani, Nainital, Uttarakhand", lat: 29.2183, lon: 79.5130, zoom: 12, source: "local" },
  { id: "town_roorkee", name: "Roorkee", category: "City", district: "Haridwar", tehsil: "Roorkee", displayName: "Roorkee, Haridwar, Uttarakhand", lat: 29.8543, lon: 77.8880, zoom: 12, source: "local" },
  { id: "town_kashipur", name: "Kashipur", category: "City", district: "Udham Singh Nagar", tehsil: "Kashipur", displayName: "Kashipur, Udham Singh Nagar, Uttarakhand", lat: 29.2104, lon: 78.9619, zoom: 12, source: "local" },
  { id: "town_kotdwar", name: "Kotdwar", category: "City", district: "Pauri Garhwal", tehsil: "Kotdwar", displayName: "Kotdwar, Pauri Garhwal, Uttarakhand", lat: 29.7465, lon: 78.5273, zoom: 12, source: "local" },
  { id: "town_srinagar", name: "Srinagar Garhwal", category: "City", district: "Pauri Garhwal", tehsil: "Srinagar", displayName: "Srinagar, Pauri Garhwal, Uttarakhand", lat: 30.2227, lon: 78.7847, zoom: 12.5, source: "local" },
  { id: "town_badrinath", name: "Badrinath", category: "Town", district: "Chamoli", tehsil: "Joshimath Tehsil", displayName: "Badrinath, Chamoli, Uttarakhand", lat: 30.7433, lon: 79.4938, zoom: 13, source: "local" },
  { id: "town_kedarnath", name: "Kedarnath", category: "Town", district: "Rudraprayag", tehsil: "Ukhimath", displayName: "Kedarnath, Rudraprayag, Uttarakhand", lat: 30.7352, lon: 79.0669, zoom: 13, source: "local" },
  { id: "town_gangotri", name: "Gangotri", category: "Town", district: "Uttarkashi", tehsil: "Bhatwari", displayName: "Gangotri, Uttarkashi, Uttarakhand", lat: 30.9947, lon: 78.9398, zoom: 13, source: "local" },
  { id: "town_yamunotri", name: "Yamunotri", category: "Town", district: "Uttarkashi", tehsil: "Barkot", displayName: "Yamunotri, Uttarkashi, Uttarakhand", lat: 31.0140, lon: 78.4600, zoom: 13, source: "local" },
  { id: "loc_auli", name: "Auli", category: "Locality", district: "Chamoli", tehsil: "Joshimath Tehsil", displayName: "Auli (Ski Resort), Chamoli, Uttarakhand", lat: 30.5284, lon: 79.5684, zoom: 13, source: "local" },
  { id: "loc_chopta", name: "Chopta", category: "Locality", district: "Rudraprayag", tehsil: "Ukhimath", displayName: "Chopta (Tungnath Base), Rudraprayag, Uttarakhand", lat: 30.4850, lon: 79.1800, zoom: 13, source: "local" },
  { id: "town_lansdowne", name: "Lansdowne", category: "Town", district: "Pauri Garhwal", tehsil: "Lansdowne", displayName: "Lansdowne, Pauri Garhwal, Uttarakhand", lat: 29.8377, lon: 78.6872, zoom: 13, source: "local" },
  { id: "town_dhanaulti", name: "Dhanaulti", category: "Town", district: "Tehri Garhwal", tehsil: "Dhanaulti", displayName: "Dhanaulti, Tehri Garhwal, Uttarakhand", lat: 30.4500, lon: 78.2300, zoom: 13, source: "local" },
  { id: "town_chakrata", name: "Chakrata", category: "Town", district: "Dehradun", tehsil: "Chakrata", displayName: "Chakrata, Dehradun, Uttarakhand", lat: 30.7000, lon: 77.8700, zoom: 13, source: "local" },
  { id: "town_mukteshwar", name: "Mukteshwar", category: "Town", district: "Nainital", tehsil: "Dhari", displayName: "Mukteshwar, Nainital, Uttarakhand", lat: 29.4722, lon: 79.6472, zoom: 13, source: "local" },
  { id: "town_kausani", name: "Kausani", category: "Town", district: "Bageshwar", tehsil: "Garur", displayName: "Kausani, Bageshwar, Uttarakhand", lat: 29.8542, lon: 79.6017, zoom: 13, source: "local" },
  { id: "town_munsiari", name: "Munsiari (Munsyari)", category: "Town", district: "Pithoragarh", tehsil: "Munsyari", displayName: "Munsiari, Pithoragarh, Uttarakhand", lat: 30.0667, lon: 80.2333, zoom: 13, source: "local" },
  { id: "town_dharchula", name: "Dharchula", category: "Town", district: "Pithoragarh", tehsil: "Dharchula", displayName: "Dharchula, Pithoragarh, Uttarakhand", lat: 29.8500, lon: 80.5333, zoom: 13, source: "local" },
  { id: "town_karnaprayag", name: "Karnaprayag", category: "Town", district: "Chamoli", tehsil: "Karnaprayag", displayName: "Karnaprayag, Chamoli, Uttarakhand", lat: 30.2580, lon: 79.2170, zoom: 13, source: "local" },
  { id: "town_devprayag", name: "Devprayag", category: "Town", district: "Tehri Garhwal", tehsil: "Devprayag", displayName: "Devprayag, Tehri Garhwal, Uttarakhand", lat: 30.1459, lon: 78.5989, zoom: 13, source: "local" },
  { id: "town_ramnagar", name: "Ramnagar", category: "Town", district: "Nainital", tehsil: "Ramnagar", displayName: "Ramnagar (Corbett Gate), Nainital, Uttarakhand", lat: 29.3950, lon: 79.1270, zoom: 12.5, source: "local" },
  { id: "town_bhimtal", name: "Bhimtal", category: "Town", district: "Nainital", tehsil: "Nainital", displayName: "Bhimtal, Nainital, Uttarakhand", lat: 29.3500, lon: 79.5667, zoom: 13, source: "local" },
  { id: "town_bhowali", name: "Bhowali", category: "Town", district: "Nainital", tehsil: "Nainital", displayName: "Bhowali, Nainital, Uttarakhand", lat: 29.3833, lon: 79.5167, zoom: 13, source: "local" },
  { id: "vill_kunjakharak", name: "Kunjakharak", category: "Village", district: "Nainital", tehsil: "Betalghat", displayName: "Kunjakharak, Betalghat, Nainital, Uttarakhand", lat: 29.5000, lon: 79.3000, zoom: 13.5, source: "local" },
  { id: "town_barkot", name: "Barkot", category: "Town", district: "Uttarkashi", tehsil: "Barkot", displayName: "Barkot, Uttarkashi, Uttarakhand", lat: 30.8100, lon: 78.2000, zoom: 13, source: "local" },
  { id: "town_purola", name: "Purola", category: "Town", district: "Uttarkashi", tehsil: "Purola", displayName: "Purola, Uttarkashi, Uttarakhand", lat: 30.8800, lon: 78.0800, zoom: 13, source: "local" },
  { id: "town_gopeshwar", name: "Gopeshwar", category: "City", district: "Chamoli", tehsil: "Chamoli", displayName: "Gopeshwar, Chamoli, Uttarakhand", lat: 30.4137, lon: 79.3243, zoom: 13, source: "local" },
  { id: "town_dwarahat", name: "Dwarahat", category: "Town", district: "Almora", tehsil: "Dwarahat", displayName: "Dwarahat, Almora, Uttarakhand", lat: 29.7800, lon: 79.4300, zoom: 13, source: "local" },
  { id: "town_chaukhutia", name: "Chaukhutia", category: "Town", district: "Almora", tehsil: "Chaukhutia", displayName: "Chaukhutia, Almora, Uttarakhand", lat: 29.8800, lon: 79.3500, zoom: 13, source: "local" },
  { id: "town_lohaghat", name: "Lohaghat", category: "Town", district: "Champawat", tehsil: "Lohaghat", displayName: "Lohaghat, Champawat, Uttarakhand", lat: 29.4000, lon: 80.0800, zoom: 13, source: "local" },
  { id: "town_tanakpur", name: "Tanakpur", category: "Town", district: "Champawat", tehsil: "Poornagiri", displayName: "Tanakpur, Champawat, Uttarakhand", lat: 29.0700, lon: 80.1100, zoom: 12.5, source: "local" },
  { id: "town_didihat", name: "Didihat", category: "Town", district: "Pithoragarh", tehsil: "Didihat", displayName: "Didihat, Pithoragarh, Uttarakhand", lat: 29.9700, lon: 80.2500, zoom: 13, source: "local" },
  { id: "town_berinag", name: "Berinag", category: "Town", district: "Pithoragarh", tehsil: "Berinag", displayName: "Berinag, Pithoragarh, Uttarakhand", lat: 29.8000, lon: 80.0500, zoom: 13, source: "local" },
  { id: "town_rudrapur", name: "Rudrapur", category: "City", district: "Udham Singh Nagar", tehsil: "Rudrapur", displayName: "Rudrapur, Udham Singh Nagar, Uttarakhand", lat: 28.9800, lon: 79.4000, zoom: 12, source: "local" },
  { id: "town_gairsain", name: "Gairsain (Summer Capital)", category: "Town", district: "Chamoli", tehsil: "Gairsain", displayName: "Gairsain, Chamoli, Uttarakhand", lat: 30.0500, lon: 79.2800, zoom: 13, source: "local" },
  { id: "loc_mana", name: "Mana (First Indian Village)", category: "Village", district: "Chamoli", tehsil: "Joshimath Tehsil", displayName: "Mana Village, Chamoli, Uttarakhand", lat: 30.7681, lon: 79.4967, zoom: 14, source: "local" },
  { id: "loc_harsil", name: "Harsil", category: "Village", district: "Uttarkashi", tehsil: "Bhatwari", displayName: "Harsil Valley, Uttarkashi, Uttarakhand", lat: 31.0350, lon: 78.7380, zoom: 13.5, source: "local" },
  { id: "loc_sankri", name: "Sankri", category: "Village", district: "Uttarkashi", tehsil: "Mori", displayName: "Sankri, Uttarkashi, Uttarakhand", lat: 31.0772, lon: 78.1819, zoom: 13.5, source: "local" },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawQuery = searchParams.get("q") || "";
  const query = rawQuery.trim().toLowerCase();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Check cache
  if (searchCache.has(query)) {
    return NextResponse.json({ results: searchCache.get(query)! });
  }

  const results: UttarakhandPlace[] = [];
  const seenNames = new Set<string>();

  // 1. Search in local curated Uttarakhand places (instant & guaranteed accurate)
  for (const place of UTTARAKHAND_CORE_PLACES) {
    const nameMatch = place.name.toLowerCase().includes(query);
    const districtMatch = place.district.toLowerCase().includes(query);
    const tehsilMatch = place.tehsil?.toLowerCase().includes(query) || false;
    const dispMatch = place.displayName.toLowerCase().includes(query);

    if (nameMatch || districtMatch || tehsilMatch || dispMatch) {
      const dedupeKey = `${place.name.toLowerCase()}_${place.district.toLowerCase()}`;
      if (!seenNames.has(dedupeKey)) {
        seenNames.add(dedupeKey);
        results.push(place);
      }
    }
  }

  // 2. Query Nominatim for villages, hamlets, towns, and localities throughout Uttarakhand
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      rawQuery + ", Uttarakhand, India"
    )}&format=jsonv2&addressdetails=1&limit=8&countrycodes=in&viewbox=77.2,31.6,81.3,28.4`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const resp = await fetch(osmUrl, {
      headers: {
        "User-Agent": "FireIntel-Academic-Research/1.0 (contact: research@fireintel.org)",
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const osmData = await resp.json();
      if (Array.isArray(osmData)) {
        for (const item of osmData) {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);

          // Strictly validate within Uttarakhand bounding box
          if (
            isNaN(lat) ||
            isNaN(lon) ||
            lat < 28.5 ||
            lat > 31.6 ||
            lon < 77.3 ||
            lon > 81.3
          ) {
            continue;
          }

          const addr = item.address || {};
          const state = addr.state || "";
          if (
            state &&
            !state.toLowerCase().includes("uttarakhand") &&
            !state.toLowerCase().includes("uttaranchal")
          ) {
            continue;
          }

          const cleanName =
            addr.village ||
            addr.hamlet ||
            addr.suburb ||
            addr.town ||
            addr.city ||
            item.name ||
            "";

          if (!cleanName) continue;

          const district =
            addr.county || addr.district || addr.state_district || "Uttarakhand";
          const tehsil = addr.state_district || addr.county || undefined;
          const village = addr.village || addr.hamlet || undefined;

          // Categorize administrative level
          let category: UttarakhandPlace["category"] = "Locality";
          if (item.type === "administrative" && item.category === "boundary") {
            category = addr.state_district ? "Tehsil" : "District";
          } else if (addr.city) {
            category = "City";
          } else if (addr.town) {
            category = "Town";
          } else if (addr.village || addr.hamlet) {
            category = "Village";
          }

          // Compute suitable camera zoom based on category
          let zoom = 12.5;
          if (category === "District") zoom = 10;
          else if (category === "City" || category === "Tehsil") zoom = 11.5;
          else if (category === "Town") zoom = 12.5;
          else if (category === "Village" || category === "Locality") zoom = 13.5;

          const dedupeKey = `${cleanName.toLowerCase()}_${district.toLowerCase()}`;
          if (!seenNames.has(dedupeKey)) {
            seenNames.add(dedupeKey);
            results.push({
              id: `osm_${item.place_id || Math.random().toString(36).slice(2)}`,
              name: cleanName,
              category,
              district,
              tehsil,
              village,
              displayName: item.display_name,
              lat,
              lon,
              zoom,
              source: "osm",
            });
          }
        }
      }
    }
  } catch (err) {
    // If Nominatim fails or times out, local results still deliver instantaneous matches
    console.warn("Nominatim location search notice:", err);
  }

  // Cache results
  searchCache.set(query, results);

  return NextResponse.json({ results });
}
