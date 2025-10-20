// Backend Interfaces
export interface BackendUserRoleDetails {
  roles_id: string;
  roles_level: number;
  roles_identity: string;
}

export interface BackendUserDetails {
  users_id: string;
  users_image: string | null;
  users_names: string;
  users_username: string;
  roles_details: BackendUserRoleDetails;
}

export interface BackendPoolMemberModel {
  pools_members_id: string;
  sort_created_id: string;
  pools_id: string;
  users_details: BackendUserDetails;
  pools_members_rank: number;
  pools_members_points: number;
  pools_members_price: number;
  pools_members_is_user: boolean;
  pools_members_created_at: string;
  pools_members_paid_amount: number | null;
  pools_completed_question_tracker_size: number;
  pools_completed_question_tracker_time: number;
}

// Frontend Models
export class UserRoleDetails {
  roleId: string;
  level: number;
  identity: string;

  constructor(data?: BackendUserRoleDetails | null) {
    this.roleId = data?.roles_id ?? "";
    this.level = data?.roles_level ?? 0;
    this.identity = data?.roles_identity ?? "";
  }

  static from(data: any): UserRoleDetails {
    if (data instanceof UserRoleDetails) return data;
    return new UserRoleDetails({
      roles_id: data.roleId,
      roles_level: data.level,
      roles_identity: data.identity,
    });
  }

  toBackend(): BackendUserRoleDetails {
    return {
      roles_id: this.roleId,
      roles_level: this.level,
      roles_identity: this.identity,
    };
  }
}

export class UserDetails {
  userId: string;
  image?: string | null;
  name: string;
  username: string;
  rolesDetails: UserRoleDetails;

  constructor(data?: BackendUserDetails | null) {
    this.userId = data?.users_id ?? "";
    this.image = data?.users_image ?? null;
    this.name = data?.users_names ?? "";
    this.username = data?.users_username ?? "";
    this.rolesDetails = new UserRoleDetails(data?.roles_details ?? null);
  }

  static from(data: any): UserDetails {
    if (data instanceof UserDetails) return data;
    return new UserDetails({
      users_id: data.userId,
      users_image: data.image,
      users_names: data.name,
      users_username: data.username,
      roles_details: UserRoleDetails.from(data.rolesDetails).toBackend(),
    });
  }

  toBackend(): BackendUserDetails {
    return {
      users_id: this.userId,
      users_image: this.image ?? null,
      users_names: this.name,
      users_username: this.username,
      roles_details: this.rolesDetails.toBackend(),
    };
  }
}

export class PoolMemberModel {
  poolsMemberId: string;
  sortCreatedId: string;
  poolsId: string;
  userDetails: UserDetails;
  poolsMembersRank: number;
  poolsMembersPoints: number;
  poolsMembersPrice: number;
  poolsMembersIsUser: boolean;
  poolsMembersCreatedAt: string;
  poolsMembersPaidAmount: number;
  poolsCompletedQuestionTrackerSize: number;
  poolsCompletedQuestionTrackerTime: number;

  constructor(data?: BackendPoolMemberModel | null) {
    this.poolsMemberId = data?.pools_members_id ?? "";
    this.sortCreatedId = data?.sort_created_id ?? "";
    this.poolsId = data?.pools_id ?? "";
    this.userDetails = new UserDetails(data?.users_details ?? null);
    this.poolsMembersRank = data?.pools_members_rank ?? 0;
    this.poolsMembersPoints = data?.pools_members_points ?? 0;
    this.poolsMembersPrice = data?.pools_members_price ?? 0;
    this.poolsMembersIsUser = data?.pools_members_is_user ?? false;
    this.poolsMembersCreatedAt = data?.pools_members_created_at ?? "";
    this.poolsMembersPaidAmount = data?.pools_members_paid_amount ?? 0;
    this.poolsCompletedQuestionTrackerSize = data?.pools_completed_question_tracker_size ?? 0;
    this.poolsCompletedQuestionTrackerTime = data?.pools_completed_question_tracker_time ?? 0;
  }

  static from(data: any): PoolMemberModel {
    if (data instanceof PoolMemberModel) return data;
    return new PoolMemberModel({
      pools_members_id: data.poolsMemberId,
      sort_created_id: data.sortCreatedId,
      pools_id: data.poolsId,
      users_details: UserDetails.from(data.userDetails).toBackend(),
      pools_members_rank: data.poolsMembersRank,
      pools_members_points: data.poolsMembersPoints,
      pools_members_price: data.poolsMembersPrice,
      pools_members_is_user: data.poolsMembersIsUser,
      pools_members_created_at: data.poolsMembersCreatedAt,
      pools_members_paid_amount: data.poolsMembersPaidAmount,
      pools_completed_question_tracker_size: data.poolsCompletedQuestionTrackerSize,
      pools_completed_question_tracker_time: data.poolsCompletedQuestionTrackerTime,
    });
  }

  toBackend(): BackendPoolMemberModel {
    return {
      pools_members_id: this.poolsMemberId,
      sort_created_id: this.sortCreatedId,
      pools_id: this.poolsId,
      users_details: this.userDetails.toBackend(),
      pools_members_rank: this.poolsMembersRank,
      pools_members_points: this.poolsMembersPoints,
      pools_members_price: this.poolsMembersPrice,
      pools_members_is_user: this.poolsMembersIsUser,
      pools_members_created_at: this.poolsMembersCreatedAt,
      pools_members_paid_amount: this.poolsMembersPaidAmount,
      pools_completed_question_tracker_size: this.poolsCompletedQuestionTrackerSize,
      pools_completed_question_tracker_time: this.poolsCompletedQuestionTrackerTime,
    };
  }

  copyWith(data: Partial<PoolMemberModel>): PoolMemberModel {
    return PoolMemberModel.from({
      ...this,
      ...data,
    });
  }
}
