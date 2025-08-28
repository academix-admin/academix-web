import { supabaseBrowser } from '@/lib/supabase/client';


export type LocationData = {
  status: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  query: string;
}


const checkLocation = async () : Promise<LocationData | null> => {
  try {
    const res = await fetch("https://ip-api.com/json");
    if (!res.ok) throw new Error("Failed to fetch location");
    const data: LocationData = await res.json();
    data.countryCode = data.countryCode.toLowerCase();
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
