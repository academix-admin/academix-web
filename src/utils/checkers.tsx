import { supabaseBrowser } from '@/lib/supabase/client';
import { LoginModel } from '@/models/user-data';
import { UserLoginAccount } from '@/models/user-data';
import { UserData } from '@/models/user-data';

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


export type ParamaticalData = {
  usersId: string;
  locale: string;
  country: string;
  age: number;
  gender: string;
}

const checkLocation = async (): Promise<LocationData | null> => {
  try {
//     const res = await fetch("/api/ipwho");
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



const getParamatical = async (usersId: string, locale: string, gender: string, birthday: string  ): Promise<ParamaticalData | null> => {
  try {

    const location: LocationData | null = await checkLocation();

    if(!location) throw Error('Unable to get ParamaticalData');


    return {
          usersId: usersId,
          locale: locale,
          country: location.country_code,
          age: Math.floor(
                                          (Date.now() - new Date(birthday).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
                                        ),
          gender: gender === "Gender.male" ? 'm' : 'f'

        };
  } catch (err) {
    console.error('Unable to get ParamaticalData');
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

const fetchUserPartialDetails = async (email?: string, phone?: string) => {
        let params = null;
        if (email) {
          params = {
              p_login_type: 'UserLoginType.email',
              p_login_check: email
          }
        } else if (phone) {
          params = {
             p_login_type: 'UserLoginType.phone',
             p_login_check: phone
          }
        }else{
          console.error('Error getting user details');
          return null;
        }

        const { data, error } = await supabaseBrowser.rpc('get_partial_user_record', params);
        if (error) throw error;
        return data;
    };

const fetchUserDetails = async (loginModel: LoginModel): Promise<UserLoginAccount | null> => {
        const { data, error } = await supabaseBrowser.rpc('get_user_login_record', {
          p_login_type: loginModel.loginType,
          p_login_check: loginModel.loginDetails,
        });

        if (error) throw error;
        return data;
};

const fetchUserData = async (usersId: string): Promise<UserData | null> => {
        const { data: userData, error: userError } = await supabaseBrowser.rpc("get_user_record", {
          p_user_id: usersId
        });

        if (userError) throw userError;
        return userData;
};

export { checkLocation, checkFeatures, fetchUserPartialDetails, fetchUserDetails, fetchUserData, getParamatical };
