import type { BackendPaymentProfileModel } from '@academix-admin/domain-types';
export type { BackendPaymentProfileModel };
import { PaymentDetails } from '@/models/payment-details';
import { BackendPaymentDetails } from '@/models/payment-details';

// ---------------- Backend Interfaces ----------------
// ---------------- Frontend Models ----------------
export class PaymentProfileModel {
  paymentProfileId: string;
  paymentMethodId: string;
  usersId: string;
  sortCreatedId: string;
  paymentDetails?: PaymentDetails;

  constructor(data?: BackendPaymentProfileModel | null, usersId?: string | null, paymentDetails?: PaymentDetails | null) {
    this.paymentProfileId = data?.payment_profile_id ?? "";
    this.paymentMethodId = data?.payment_method_id ?? "";
    this.usersId = data?.users_id ?? usersId ?? "";
    this.sortCreatedId = data?.sort_created_id ?? "";
    this.paymentDetails = data?.payment_details
      ? new PaymentDetails(data.payment_details)
      : (paymentDetails ?? undefined);
  }

  static from(data: any): PaymentProfileModel {
    if (data instanceof PaymentProfileModel) return data;
    return new PaymentProfileModel(
      {
        payment_profile_id: data.paymentProfileId,
        payment_method_id: data.paymentMethodId,
        sort_created_id: data.sortCreatedId,
        users_id: data.usersId,
        payment_details: data.paymentDetails
          ? PaymentDetails.from(data.paymentDetails).toBackend()
          : null
      }
    );
  }

  toBackend(): BackendPaymentProfileModel {
    return {
      payment_profile_id: this.paymentProfileId,
      payment_method_id: this.paymentMethodId,
      sort_created_id: this.sortCreatedId,
      users_id: this.usersId,
      payment_details: this.paymentDetails ? this.paymentDetails.toBackend() : null
    };
  }

  copyWith(data: Partial<PaymentProfileModel>): PaymentProfileModel {
    return PaymentProfileModel.from({
      ...this,
      ...data,
    });
  }
}