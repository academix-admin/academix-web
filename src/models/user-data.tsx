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

interface BackendUserData {
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
  roles_table?: BackendRoleData | null;
}

export class UserData {
  usersId: string;
  usersUsername: string;
  usersNames: string;
  usersEmail: string;
  usersPhone: string | null;
  usersDob: string;
  usersSex: string;
  usersImage: string | null;
  usersReferredId: string | null;
  usersRole: RoleData | null;
  usersVerified: boolean;
  countryId: string;
  languageId: string;
  usersCreatedAt: string;

  constructor(data?: BackendUserData | null) {
    this.usersId = data?.users_id ?? "";
    this.usersUsername = data?.users_username ?? "";
    this.usersNames = data?.users_names ?? "";
    this.usersEmail = data?.users_email ?? "";
    this.usersPhone = data?.users_phone ?? null;
    this.usersDob = data?.users_dob ?? "";
    this.usersSex = data?.users_sex ?? "";
    this.usersImage = data?.users_image ?? null;
    this.usersReferredId = data?.users_referred_id ?? null;
    this.usersVerified = data?.users_verified ?? false;
    this.countryId = data?.country_id ?? "";
    this.languageId = data?.language_id ?? "";
    this.usersCreatedAt = data?.users_created_at ?? new Date().toISOString();
    this.usersRole = data?.roles_table
      ? {
          rolesId: data.roles_table.roles_id,
          rolesLevel: data.roles_table.roles_level,
          rolesType: data.roles_table.roles_checker,
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
      roles_table: this.usersRole ? {
                                              roles_id: this.usersRole.rolesId,
                                              roles_level: this.usersRole.rolesLevel,
                                              roles_checker: this.usersRole.rolesType,
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
        roles_table: data.usersRole
          ? {
              roles_id: data.usersRole.rolesId,
              roles_level: data.usersRole.rolesLevel,
              roles_checker: data.usersRole.rolesType,
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