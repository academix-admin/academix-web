// --- Backend Interfaces ---
export interface BackendRolesActivationData {
  roles_activation_amount: number;
  roles_activation_activated: boolean;
  transaction_id?: string | null;
  roles_activation_is_fresh?: boolean;
}

// --- Frontend Models ---
export class RolesActivation {
  rolesActivationAmount: number;
  rolesActivationActivated: boolean;
  transactionId: string | null;
  rolesActivationIsFresh: boolean;

  constructor(data?: BackendRolesActivationData | null) {
    this.rolesActivationAmount = data?.roles_activation_amount ?? 0;
    this.rolesActivationActivated = data?.roles_activation_activated ?? false;
    this.transactionId = data?.transaction_id ?? null;
    this.rolesActivationIsFresh = data?.roles_activation_is_fresh ?? true;
  }

  copyWith(data: Partial<RolesActivation>): RolesActivation {
    const backendData: BackendRolesActivationData = {
      roles_activation_amount: data.rolesActivationAmount ?? this.rolesActivationAmount,
      roles_activation_activated: data.rolesActivationActivated ?? this.rolesActivationActivated,
      transaction_id: data.transactionId ?? this.transactionId,
      roles_activation_is_fresh: data.rolesActivationIsFresh ?? this.rolesActivationIsFresh,
    };

    return new RolesActivation(backendData);
  }
}