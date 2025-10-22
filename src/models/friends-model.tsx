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

  /** ✅ Convert frontend model to backend payload */
  toBackend(): BackendFriendsModel {
    return {
      users_id: this.usersId,
      users_names: this.usersNames,
      users_username: this.usersUsername,
      users_image: this.usersImage ?? null,
      sort_created_id: this.sortCreatedId,
      users_created_at: this.usersCreatedAt,
      users_referred_status: this.usersReferredStatus,
    };
  }

  /** ✅ Factory to safely convert plain frontend objects */
  static from(data: any): FriendsModel {
    if (data instanceof FriendsModel) return data;
    return new FriendsModel({
      users_id: data.usersId ?? "",
      users_names: data.usersNames ?? "",
      users_username: data.usersUsername ?? "",
      users_image: data.usersImage ?? null,
      sort_created_id: data.sortCreatedId ?? "",
      users_created_at: data.usersCreatedAt ?? "",
      users_referred_status: data.usersReferredStatus ?? "",
    });
  }

  /** ✅ Immutable update */
  copyWith(data: Partial<FriendsModel>): FriendsModel {
    return FriendsModel.from({
      ...this,
      ...data,
    });
  }
}
