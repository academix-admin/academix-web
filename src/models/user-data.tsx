export interface UserData {
  usersId: string;
  usersUsername: string;
  userNames: string;
  usersEmail: string;
  usersPhone: string | null;
  usersDob: string;
  usersSex: string;
  userImage: string | null;
  usersReferredId: string | null;
  userRole: {
    rolesId: string;
    rolesLevel: number;
    rolesType: string;
  };
  usersVerified: boolean;
  countryId: string;
  languageId: string;
  usersCreatedAt: string;
}
