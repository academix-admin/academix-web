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
