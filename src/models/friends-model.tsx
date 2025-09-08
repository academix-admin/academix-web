// --- Backend Interface ---
export interface BackendFriendsModel {
  users_id: string;
  users_names: string;
  users_username: string;
  users_image: string | null;
  sort_created_id: string;
  users_created_at: string;
  users_referred_status: string;
}

// --- Frontend Model ---
export class FriendsModel {
  usersId: string;
  usersNames: string;
  usersUsername: string;
  usersImage?: string;
  sortCreatedId: string;
  usersCreatedAt: string;
  usersReferredStatus: string;

  constructor(data?: BackendFriendsModel | null) {
    this.usersId = data?.users_id ?? "";
    this.usersNames = data?.users_names ?? "";
    this.usersUsername = data?.users_username ?? "";
    this.usersImage = data?.users_image ?? undefined;
    this.sortCreatedId = data?.sort_created_id ?? "";
    this.usersCreatedAt = data?.users_created_at ?? "";
    this.usersReferredStatus = data?.users_referred_status ?? "";
  }

  copyWith(data: Partial<FriendsModel>): FriendsModel {
    const backendData: BackendFriendsModel = {
      users_id: data.usersId ?? this.usersId,
      users_names: data.usersNames ?? this.usersNames,
      users_username: data.usersUsername ?? this.usersUsername,
      users_image: data.usersImage ?? this.usersImage ?? null,
      sort_created_id: data.sortCreatedId ?? this.sortCreatedId,
      users_created_at: data.usersCreatedAt ?? this.usersCreatedAt,
      users_referred_status: data.usersReferredStatus ?? this.usersReferredStatus,
    };

    return new FriendsModel(backendData);
  }
}
