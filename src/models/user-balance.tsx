// --- Backend Interface ---
export interface BackendUserBalanceModel {
  users_id: string;
  users_balance_amount: number;
  users_balance_updated_at: string;
}

// --- Frontend Model ---
export class UserBalanceModel {
  usersId: string;
  usersBalanceAmount: number;
  usersBalanceUpdatedAt: string;

  constructor(data?: BackendUserBalanceModel | null) {
    this.usersId = data?.users_id ?? "";
    this.usersBalanceAmount = data?.users_balance_amount ?? 0;
    this.usersBalanceUpdatedAt = data?.users_balance_updated_at ?? "";
  }

  /** ✅ Convert from any frontend object into a fully initialized UserBalanceModel */
  static from(data: any): UserBalanceModel {
    if (data instanceof UserBalanceModel) return data;
    return new UserBalanceModel({
      users_id: data.usersId ?? "",
      users_balance_amount: data.usersBalanceAmount ?? 0,
      users_balance_updated_at: data.usersBalanceUpdatedAt ?? "",
    });
  }

  /** ✅ Convert to backend-friendly format */
  toBackend(): BackendUserBalanceModel {
    return {
      users_id: this.usersId,
      users_balance_amount: this.usersBalanceAmount,
      users_balance_updated_at: this.usersBalanceUpdatedAt,
    };
  }

  /** ✅ Create a new instance with partial field overrides */
  copyWith(data: Partial<UserBalanceModel>): UserBalanceModel {
    const backendData: BackendUserBalanceModel = {
      users_id: data.usersId ?? this.usersId,
      users_balance_amount: data.usersBalanceAmount ?? this.usersBalanceAmount,
      users_balance_updated_at:
        data.usersBalanceUpdatedAt ?? this.usersBalanceUpdatedAt,
    };

    return new UserBalanceModel(backendData);
  }
}
