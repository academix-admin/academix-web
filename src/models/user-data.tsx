interface RoleData {
  rolesId: string;
  rolesLevel: number;
  rolesType: string;
}

interface BackendRoleData {
  roles_id: string;
  roles_level: number;
  roles_checker: string;
}

interface LanguageData {
  languageId: string;
  languageIdentity: string;
  languageCode: string;
}

interface BackendLanguageData {
  language_id: string;
  language_identity: string;
  language_code: string;
}

interface CountryData {
  countryId: string;
  countryIdentity: string;
  countryImage: string;
  countryTwoIsoCode: string;
}

interface BackendCountryData {
  country_id: string;
  country_identity: string;
  country_image: string;
  country_two_iso_code: string;
}

interface ReferredUserData {
  usersReferredId: string;
  usersReferredStatus: string;
  usersNames: string;
  usersUsername: string;
  usersImage: string | null;
}

interface BackendReferredUserData {
  users_referred_id: string;
  users_referred_status: string;
  users_names: string;
  users_username: string;
  users_image: string | null;
}

export interface BackendUserData {
  users_id: string;
  users_username: string;
  users_names: string;
  users_email: string;
  users_phone: string | null;
  users_dob: string;
  users_sex: string;
  users_image: string | null;
  users_referred_id: string | null;
  users_verified: boolean;
  country_id: string;
  language_id: string;
  users_created_at: string;
  transaction_id: string | null;
  users_roles_access: any;
  roles_table?: BackendRoleData | null;
  language_table?: BackendLanguageData | null;
  country_table?: BackendCountryData | null;
  users_referred_details?: BackendReferredUserData | null;
}

export class UserData {
  usersId: string;
  usersUsername: string;
  usersNames: string;
  usersEmail: string;
  usersPhone: string ;
  usersDob: string;
  usersSex: string;
  usersImage: string | null;
  usersReferredId: string | null;
  usersRole: RoleData | null;
  usersVerified: boolean;
  countryId: string;
  languageId: string;
  usersCreatedAt: string;
  transactionId: string | null;
  usersRolesAccess: any;
  languageTable: LanguageData | null;
  countryTable: CountryData | null;
  usersReferredDetails: ReferredUserData | null;

  constructor(data?: BackendUserData | null) {
    this.usersId = data?.users_id ?? "";
    this.usersUsername = data?.users_username ?? "";
    this.usersNames = data?.users_names ?? "";
    this.usersEmail = data?.users_email ?? "";
    this.usersPhone = data?.users_phone ?? "";
    this.usersDob = data?.users_dob ?? "";
    this.usersSex = data?.users_sex ?? "";
    this.usersImage = data?.users_image ?? null;
    this.usersReferredId = data?.users_referred_id ?? null;
    this.usersVerified = data?.users_verified ?? false;
    this.countryId = data?.country_id ?? "";
    this.languageId = data?.language_id ?? "";
    this.usersCreatedAt = data?.users_created_at ?? new Date().toISOString();
    this.transactionId = data?.transaction_id ?? null;
    this.usersRolesAccess = data?.users_roles_access ?? null;
    this.usersRole = data?.roles_table
      ? {
          rolesId: data.roles_table.roles_id,
          rolesLevel: data.roles_table.roles_level,
          rolesType: data.roles_table.roles_checker,
        }
      : null;
    this.languageTable = data?.language_table
      ? {
          languageId: data.language_table.language_id,
          languageIdentity: data.language_table.language_identity,
          languageCode: data.language_table.language_code,
        }
      : null;
    this.countryTable = data?.country_table
      ? {
          countryId: data.country_table.country_id,
          countryIdentity: data.country_table.country_identity,
          countryImage: data.country_table.country_image,
          countryTwoIsoCode: data.country_table.country_two_iso_code,
        }
      : null;
    this.usersReferredDetails = data?.users_referred_details
      ? {
          usersReferredId: data.users_referred_details.users_referred_id,
          usersReferredStatus: data.users_referred_details.users_referred_status,
          usersNames: data.users_referred_details.users_names,
          usersUsername: data.users_referred_details.users_username,
          usersImage: data.users_referred_details.users_image,
        }
      : null;
  }

  copyWith(data: Partial<UserData>): UserData {
    const backendLike: BackendUserData = {
      users_id: data.usersId ?? this.usersId,
      users_username: data.usersUsername ?? this.usersUsername,
      users_names: data.usersNames ?? this.usersNames,
      users_email: data.usersEmail ?? this.usersEmail,
      users_phone: data.usersPhone ?? this.usersPhone,
      users_dob: data.usersDob ?? this.usersDob,
      users_sex: data.usersSex ?? this.usersSex,
      users_image: data.usersImage ?? this.usersImage,
      users_referred_id: data.usersReferredId ?? this.usersReferredId,
      users_verified: data.usersVerified ?? this.usersVerified,
      country_id: data.countryId ?? this.countryId,
      language_id: data.languageId ?? this.languageId,
      users_created_at: data.usersCreatedAt ?? this.usersCreatedAt,
      transaction_id: data.transactionId ?? this.transactionId,
      users_roles_access: data.usersRolesAccess ?? this.usersRolesAccess,
      roles_table: data.usersRole
        ? {
            roles_id: data.usersRole.rolesId,
            roles_level: data.usersRole.rolesLevel,
            roles_checker: data.usersRole.rolesType,
          }
        : this.usersRole
        ? {
            roles_id: this.usersRole.rolesId,
            roles_level: this.usersRole.rolesLevel,
            roles_checker: this.usersRole.rolesType,
          }
        : null,
      language_table: data.languageTable
        ? {
            language_id: data.languageTable.languageId,
            language_identity: data.languageTable.languageIdentity,
            language_code: data.languageTable.languageCode,
          }
        : this.languageTable
        ? {
            language_id: this.languageTable.languageId,
            language_identity: this.languageTable.languageIdentity,
            language_code: this.languageTable.languageCode,
          }
        : null,
      country_table: data.countryTable
        ? {
            country_id: data.countryTable.countryId,
            country_identity: data.countryTable.countryIdentity,
            country_image: data.countryTable.countryImage,
            country_two_iso_code: data.countryTable.countryTwoIsoCode,
          }
        : this.countryTable
        ? {
            country_id: this.countryTable.countryId,
            country_identity: this.countryTable.countryIdentity,
            country_image: this.countryTable.countryImage,
            country_two_iso_code: this.countryTable.countryTwoIsoCode,
          }
        : null,
      users_referred_details: data.usersReferredDetails
        ? {
            users_referred_id: data.usersReferredDetails.usersReferredId,
            users_referred_status: data.usersReferredDetails.usersReferredStatus,
            users_names: data.usersReferredDetails.usersNames,
            users_username: data.usersReferredDetails.usersUsername,
            users_image: data.usersReferredDetails.usersImage,
          }
        : this.usersReferredDetails
        ? {
            users_referred_id: this.usersReferredDetails.usersReferredId,
            users_referred_status: this.usersReferredDetails.usersReferredStatus,
            users_names: this.usersReferredDetails.usersNames,
            users_username: this.usersReferredDetails.usersUsername,
            users_image: this.usersReferredDetails.usersImage,
          }
        : null,
    };

    return new UserData(backendLike);
  }

  changeImage(newUsersImage: string | null): UserData {
    const backendLike: BackendUserData = {
      users_id: this.usersId,
      users_username: this.usersUsername,
      users_names: this.usersNames,
      users_email: this.usersEmail,
      users_phone: this.usersPhone,
      users_dob: this.usersDob,
      users_sex: this.usersSex,
      users_image: newUsersImage,
      users_referred_id: this.usersReferredId,
      users_verified: this.usersVerified,
      country_id: this.countryId,
      language_id: this.languageId,
      users_created_at: this.usersCreatedAt,
      transaction_id: this.transactionId,
      users_roles_access: this.usersRolesAccess,
      roles_table: this.usersRole ? {
                                              roles_id: this.usersRole.rolesId,
                                              roles_level: this.usersRole.rolesLevel,
                                              roles_checker: this.usersRole.rolesType,
                                            }
                                          : null,
      language_table: this.languageTable ? {
                                              language_id: this.languageTable.languageId,
                                              language_identity: this.languageTable.languageIdentity,
                                              language_code: this.languageTable.languageCode,
                                            }
                                          : null,
      country_table: this.countryTable ? {
                                              country_id: this.countryTable.countryId,
                                              country_identity: this.countryTable.countryIdentity,
                                              country_image: this.countryTable.countryImage,
                                              country_two_iso_code: this.countryTable.countryTwoIsoCode,
                                            }
                                          : null,
      users_referred_details: this.usersReferredDetails ? {
                                              users_referred_id: this.usersReferredDetails.usersReferredId,
                                              users_referred_status: this.usersReferredDetails.usersReferredStatus,
                                              users_names: this.usersReferredDetails.usersNames,
                                              users_username: this.usersReferredDetails.usersUsername,
                                              users_image: this.usersReferredDetails.usersImage,
                                            }
                                          : null
    };

    return new UserData(backendLike);
  }

  static from(data: any): UserData {
      if (data instanceof UserData) return data;

      // Frontend style (camelCase)
      return new UserData({
        users_id: data.usersId,
        users_username: data.usersUsername,
        users_names: data.usersNames,
        users_email: data.usersEmail,
        users_phone: data.usersPhone,
        users_dob: data.usersDob,
        users_sex: data.usersSex,
        users_image: data.usersImage,
        users_referred_id: data.usersReferredId,
        users_verified: data.usersVerified,
        country_id: data.countryId,
        language_id: data.languageId,
        users_created_at: data.usersCreatedAt,
        transaction_id: data.transactionId,
        users_roles_access: data.usersRolesAccess,
        roles_table: data.usersRole
          ? {
              roles_id: data.usersRole.rolesId,
              roles_level: data.usersRole.rolesLevel,
              roles_checker: data.usersRole.rolesType,
            }
          : null,
        language_table: data.languageTable
          ? {
              language_id: data.languageTable.languageId,
              language_identity: data.languageTable.languageIdentity,
              language_code: data.languageTable.languageCode,
            }
          : null,
        country_table: data.countryTable
          ? {
              country_id: data.countryTable.countryId,
              country_identity: data.countryTable.countryIdentity,
              country_image: data.countryTable.countryImage,
              country_two_iso_code: data.countryTable.countryTwoIsoCode,
            }
          : null,
        users_referred_details: data.usersReferredDetails
          ? {
              users_referred_id: data.usersReferredDetails.usersReferredId,
              users_referred_status: data.usersReferredDetails.usersReferredStatus,
              users_names: data.usersReferredDetails.usersNames,
              users_username: data.usersReferredDetails.usersUsername,
              users_image: data.usersReferredDetails.usersImage,
            }
          : null,
      });
    }

}


export type LoginModel = {
  loginType: string;
  loginDetails: string
};


export type UserLoginAccount = {
  users_email: string;
  users_phone: string
  users_names: string
  users_login_type: string
};