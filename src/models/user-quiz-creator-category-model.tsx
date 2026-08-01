/**
 * Web port of Flutter `UserQuizCreatorCategoryModel` (academix-app).
 * Maps a `fetch_categories` row (post category_group removal — topic_category is top-level).
 * Keys mirror the RPC output; see supabase-export/functions/public/fetch_categories.sql.
 */

export interface BackendCreatorCategoryRow {
  topic_category_id: string;
  topic_category_image: string | null;
  topic_category_created_at: string;
  topic_category_updated_at: string;
  topic_category_identity: string;
  sort_created_id: string;
  sort_updated_id: string;
  reviewer_id: string | null;
  approval: string | null;
  user_created_topic: number | null;
  user_created_question: number | null;
  topic_settings?: {
    is_favourite?: boolean | null;
    is_recents?: boolean | null;
    settings_updated_at?: string | null;
  } | null;
  creator_details?: {
    users_id?: string | null;
    users_names?: string | null;
    users_username?: string | null;
    users_image?: string | null;
  } | null;
  age_control?: unknown;
  country_control?: unknown;
  language_control?: unknown;
  gender_control?: unknown;
}

/** Visual bucket for an approval badge. */
export type ApprovalBucket = 'approved' | 'rejected' | 'pending';

// The server stores a canonical enum key (e.g. "Approval.approved"), locale-independent — so we map by
// exact enum name, never by substring. Anything unlisted falls through to 'pending' (in-review).
const APPROVAL_BUCKET: Record<string, ApprovalBucket> = {
  approved: 'approved',
  rejected: 'rejected',
  failure: 'rejected',
  error: 'rejected',
};

export class UserQuizCreatorCategoryModel {
  sortCreatedId: string;
  sortUpdatedId: string;
  topicCategoryId: string;
  topicCategoryIdentity: string;
  topicCategoryCreatedAt: string;
  topicCategoryUpdatedAt: string;
  topicCategoryImageUrl: string | null;
  approvalStatus: string;
  approvalBucket: ApprovalBucket;
  isFavourite: boolean;
  isRecent: boolean;
  settingsUpdatedAt: string | null;
  topicsCount: number;
  questionsCount: number;
  reviewerId: string | null;
  creatorId: string;
  fullNameText: string;
  usernameText: string;
  userImageUrl: string | null;

  constructor(row: BackendCreatorCategoryRow) {
    const settings = row.topic_settings ?? {};
    const creator = row.creator_details ?? {};

    this.sortCreatedId = row.sort_created_id;
    this.sortUpdatedId = row.sort_updated_id;
    this.topicCategoryId = row.topic_category_id;
    this.topicCategoryIdentity = row.topic_category_identity ?? '';
    this.topicCategoryCreatedAt = row.topic_category_created_at;
    this.topicCategoryUpdatedAt = row.topic_category_updated_at;
    this.topicCategoryImageUrl = row.topic_category_image ?? null;
    this.approvalStatus = row.approval ?? '';
    // canonical enum name (strip the "Approval." prefix the server stores), then bucket by exact match.
    const approvalName = (row.approval ?? '').split('.').pop() ?? '';
    this.approvalBucket = APPROVAL_BUCKET[approvalName] ?? 'pending';
    this.isFavourite = settings.is_favourite ?? false;
    this.isRecent = settings.is_recents ?? false;
    this.settingsUpdatedAt = settings.settings_updated_at ?? null;
    this.topicsCount = row.user_created_topic ?? 0;
    this.questionsCount = row.user_created_question ?? 0;
    this.reviewerId = row.reviewer_id ?? null;
    this.creatorId = creator.users_id ?? '';
    this.fullNameText = creator.users_names ?? '';
    this.usernameText = creator.users_username ?? '';
    this.userImageUrl = creator.users_image ?? null;
  }
}
