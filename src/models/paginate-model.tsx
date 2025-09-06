export interface PaginateModelProps {
  sortId?: string | null;
  direction?: "oldest" | "newest" | string; // can restrict if needed
}

export class PaginateModel {
  readonly sortId?: string | null;
  readonly direction: string;

  constructor({ sortId = null, direction = "oldest" }: PaginateModelProps = {}) {
    this.sortId = sortId;
    this.direction = direction;
  }

  static fromJson(json: Record<string, any>): PaginateModel {
    return new PaginateModel({
      sortId: json["sort_id"] ?? null,
      direction: json["direction"] ?? "oldest",
    });
  }

  toJson(): Record<string, any> {
    return {
      sort_id: this.sortId,
      direction: this.direction,
    };
  }

  copyWith({ sortId, direction }: PaginateModelProps): PaginateModel {
    return new PaginateModel({
      sortId: sortId ?? this.sortId,
      direction: direction ?? this.direction,
    });
  }
}
