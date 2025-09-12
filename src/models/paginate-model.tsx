export interface PaginateModelProps {
  sortId?: string | number |null;
  direction?: "oldest" | "newest" | string; // can restrict if needed
}

export class PaginateModel {
  readonly sortId?: string | number | null;
  readonly direction: string;

  constructor({ sortId = null, direction = "oldest" }: PaginateModelProps = {}) {
    this.sortId = sortId;
    this.direction = direction;
  }

  static fromJson(json: Record<string | number, any>): PaginateModel {
    return new PaginateModel({
      sortId: json["sort_id"] ?? null,
      direction: json["direction"] ?? "oldest",
    });
  }

  toJson(): Record<string | number, any> {
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
