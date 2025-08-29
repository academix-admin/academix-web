import { supabaseBrowser } from '@/lib/supabase/client';


// export type LocationData = {
//   status: string;
//   country: string;
//   countryCode: string;
//   region: string;
//   regionName: string;
//   city: string;
//   zip: string;
//   lat: number;
//   lon: number;
//   timezone: string;
//   isp: string;
//   org: string;
//   as: string;
//   query: string;
// }

export type LocationData = {
  ip: string;
  success: boolean;
  type: string;
  continent: string;
  continent_code: string;
  country: string;
  country_code: string;
  region: string;
  region_code: string;
  city: string;
  latitude: number;
  longitude: number;
  is_eu: boolean;
  postal: string;
  calling_code: string;
  capital: string;
  borders: string;
  flag: {
    img: string;
    emoji: string;
    emoji_unicode: string;
  };
  connection: {
    asn: number;
    org: string;
    isp: string;
    domain: string;
  };
  timezone: {
    id: string;
    abbr: string;
    is_dst: boolean;
    offset: number;
    utc: string;
    current_time: string;
  };
};



// const checkLocation = async (): Promise<LocationData | null> => {
//   try {
//     const res = await fetch("/api/location");
//     if (!res.ok) throw new Error("Failed to fetch location");
//     const data: LocationData = await res.json();
//     data.countryCode = data.countryCode?.toLowerCase?.() ?? "";
//     return data;
//   } catch (err) {
//     console.error("Location check failed:", err);
//     return null;
//   }
// };

const checkLocation = async (): Promise<LocationData | null> => {
  try {
    const res = await fetch("https://ipwho.is/");
    if (!res.ok) throw new Error("Failed to fetch location");

    const data: LocationData = await res.json();

    // Normalize country_code to lowercase for consistency
    data.country_code = data.country_code?.toLowerCase?.() ?? "";

    return data;
  } catch (err) {
    console.error("Location check failed:", err);
    return null;
  }
};


const checkFeatures = async (featureChecker: string, locale: string, country: string, gender: string, birthday: string ) : Promise<boolean> => {
          try {
                const { data: rpcResult, error } = await supabaseBrowser.rpc('get_feature_status', {
                  p_feature: featureChecker,
                  p_locale: locale ,
                  p_country: country,
                  p_gender: gender === "Gender.male" ? 'm' : 'f' ,
                  p_age: Math.floor(
                           (Date.now() - new Date(birthday).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
                         )
                });
                if (error) throw error;

                return rpcResult.features_active;

              } catch (err) {
                console.error(err);
                return false;
              }
    }

export { checkLocation, checkFeatures };
