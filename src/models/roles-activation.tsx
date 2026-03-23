// --- Backend Interfaces ---
export interface BackendRolesActivationData {
  roles_activation_amount: number;
  roles_activation_activated: boolean;
}

// --- Frontend Models ---
export class RolesActivation {
  rolesActivationAmount: number;
  rolesActivationActivated: boolean;

  constructor(data?: BackendRolesActivationData | null) {
    this.rolesActivationAmount = data?.roles_activation_amount ?? 0;
    this.rolesActivationActivated = data?.roles_activation_activated ?? false;
  }

  copyWith(data: Partial<RolesActivation>): RolesActivation {
    const backendData: BackendRolesActivationData = {
      roles_activation_amount: data.rolesActivationAmount ?? this.rolesActivationAmount,
      roles_activation_activated: data.rolesActivationActivated ?? this.rolesActivationActivated,
    };

    return new RolesActivation(backendData);
  }
}