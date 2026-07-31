// =====================================================
// =============== BACKEND INTERFACES ==================
// =====================================================
// Single source of truth for the wire contracts is @academix-admin/domain-types (Phase 2).
// Imported for the models below and re-exported so existing importers (e.g. payout/page) keep working.
import type { BackendChallengeOption, BackendChallengeConfig } from '@academix-admin/domain-types';
export type { BackendChallengeOption, BackendChallengeConfig };

// =====================================================
// ================= FRONTEND MODELS ====================
// =====================================================

/**
 * Dynamic RoleShare Model
 */
export class ChallengeRoleShare {
  roles: Record<string, number>;

  constructor(data?: Record<string, number> | null) {
    this.roles = { ...(data ?? {}) };
  }

  /** Convert to backend format */
  toBackend(): Record<string, number> {
    return { ...this.roles };
  }

  /** Create from plain object */
  static from(data: any): ChallengeRoleShare {
    if (data instanceof ChallengeRoleShare) return data;
    return new ChallengeRoleShare({ ...(data ?? {}) });
  }

  /** Immutable update - strict type safe */
  copyWith(changes: Partial<Record<string, number>>): ChallengeRoleShare {
    const merged: Record<string, number> = { ...this.roles };

    Object.entries(changes).forEach(([key, value]) => {
      if (typeof value === "number") {
        merged[key] = value;
      }
    });

    return new ChallengeRoleShare(merged);
  }
}

// -------------------------

export class ChallengeOption {
  challengePrice: number;
  challengeIdentity: string;
  challengeBotShare: number;
  challengeMidShare: number;
  challengeTopShare: number;
  challengeRoleShare: ChallengeRoleShare;
  challengeCreatorShare: number;
  challengeQuestionCount: number;
  challengeReviewerShare: number;
  challengeMaxParticipants: number;
  challengeMinParticipants: number;
  challengeDevelopmentCharge: number;

  constructor(data?: BackendChallengeOption | null) {
    this.challengePrice = data?.challenge_price ?? 0;
    this.challengeIdentity = data?.challenge_identity ?? "";
    this.challengeBotShare = data?.challenge_bot_share ?? 0;
    this.challengeMidShare = data?.challenge_mid_share ?? 0;
    this.challengeTopShare = data?.challenge_top_share ?? 0;
    this.challengeRoleShare = new ChallengeRoleShare(data?.challenge_role_share);
    this.challengeCreatorShare = data?.challenge_creator_share ?? 0;
    this.challengeQuestionCount = data?.challenge_question_count ?? 0;
    this.challengeReviewerShare = data?.challenge_reviewer_share ?? 0;
    this.challengeMaxParticipants = data?.challenge_max_participants ?? 0;
    this.challengeMinParticipants = data?.challenge_min_participants ?? 0;
    this.challengeDevelopmentCharge = data?.challenge_development_charge ?? 0;
  }

  toBackend(): BackendChallengeOption {
    return {
      challenge_price: this.challengePrice,
      challenge_identity: this.challengeIdentity,
      challenge_bot_share: this.challengeBotShare,
      challenge_mid_share: this.challengeMidShare,
      challenge_top_share: this.challengeTopShare,
      challenge_role_share: this.challengeRoleShare.toBackend(),
      challenge_creator_share: this.challengeCreatorShare,
      challenge_question_count: this.challengeQuestionCount,
      challenge_reviewer_share: this.challengeReviewerShare,
      challenge_max_participants: this.challengeMaxParticipants,
      challenge_min_participants: this.challengeMinParticipants,
      challenge_development_charge: this.challengeDevelopmentCharge,
    };
  }

  static from(data: any): ChallengeOption {
    if (data instanceof ChallengeOption) return data;

    return new ChallengeOption({
      challenge_price: data.challengePrice,
      challenge_identity: data.challengeIdentity,
      challenge_bot_share: data.challengeBotShare,
      challenge_mid_share: data.challengeMidShare,
      challenge_top_share: data.challengeTopShare,
      challenge_role_share: data.challengeRoleShare
        ? ChallengeRoleShare.from(data.challengeRoleShare).toBackend()
        : {},
      challenge_creator_share: data.challengeCreatorShare,
      challenge_question_count: data.challengeQuestionCount,
      challenge_reviewer_share: data.challengeReviewerShare,
      challenge_max_participants: data.challengeMaxParticipants,
      challenge_min_participants: data.challengeMinParticipants,
      challenge_development_charge: data.challengeDevelopmentCharge,
    });
  }

  copyWith(data: Partial<ChallengeOption>): ChallengeOption {
    return ChallengeOption.from({
      challengePrice: data.challengePrice ?? this.challengePrice,
      challengeIdentity: data.challengeIdentity ?? this.challengeIdentity,
      challengeBotShare: data.challengeBotShare ?? this.challengeBotShare,
      challengeMidShare: data.challengeMidShare ?? this.challengeMidShare,
      challengeTopShare: data.challengeTopShare ?? this.challengeTopShare,
      challengeRoleShare: data.challengeRoleShare ?? this.challengeRoleShare,
      challengeCreatorShare: data.challengeCreatorShare ?? this.challengeCreatorShare,
      challengeQuestionCount: data.challengeQuestionCount ?? this.challengeQuestionCount,
      challengeReviewerShare: data.challengeReviewerShare ?? this.challengeReviewerShare,
      challengeMaxParticipants: data.challengeMaxParticipants ?? this.challengeMaxParticipants,
      challengeMinParticipants: data.challengeMinParticipants ?? this.challengeMinParticipants,
      challengeDevelopmentCharge:
        data.challengeDevelopmentCharge ?? this.challengeDevelopmentCharge,
    });
  }
}

// -------------------------

export class ChallengeConfig {
  challengeOptions: ChallengeOption[];
  gameModeChecker: string;
  gameModeIdentity: string;

  constructor(data?: BackendChallengeConfig | null) {
    this.challengeOptions = (data?.challenge_options ?? []).map(
      (o: BackendChallengeOption) => new ChallengeOption(o)
    );
    this.gameModeChecker = data?.game_mode_checker ?? "";
    this.gameModeIdentity = data?.game_mode_identity ?? "";
  }

  toBackend(): BackendChallengeConfig {
    return {
      challenge_options: this.challengeOptions.map(o => o.toBackend()),
      game_mode_checker: this.gameModeChecker,
      game_mode_identity: this.gameModeIdentity,
    };
  }

  static from(data: any): ChallengeConfig {
    if (data instanceof ChallengeConfig) return data;

    return new ChallengeConfig({
      challenge_options: (data.challengeOptions ?? []).map(
        (o: any) => ChallengeOption.from(o).toBackend()
      ),
      game_mode_checker: data.gameModeChecker,
      game_mode_identity: data.gameModeIdentity,
    });
  }

  copyWith(data: Partial<ChallengeConfig>): ChallengeConfig {
    return ChallengeConfig.from({
      challengeOptions: data.challengeOptions ?? this.challengeOptions,
      gameModeChecker: data.gameModeChecker ?? this.gameModeChecker,
      gameModeIdentity: data.gameModeIdentity ?? this.gameModeIdentity,
    });
  }
}

