// ========================
// Backend Interfaces
// ========================

export interface BackendOptionModel {
  options_id: string;
  options_image?: string | null;
  options_max?: number | null;
  options_min?: number | null;
  options_unit?: string | null;
  options_selected: boolean;
  options_identity: string;
}

export interface BackendQuestionModel {
  questions_id: string;
  questions_image?: string | null;
  questions_text: string;
}

export interface BackendPoolTimeModel {
  question_time_id: string;
  question_time_value: number;
}

export interface BackendPoolTypeModel {
  question_type_id: string;
  question_type_identity: string;
  question_type_local_identity: string;
}

export interface BackendPoolQuestion {
  pools_question_id: string;
  question_time?: number | null;
  question_time_data: BackendPoolTimeModel;
  question_type_data: BackendPoolTypeModel;
  question_data: BackendQuestionModel;
  options_data: BackendOptionModel[];
}

// ========================
// Frontend Models
// ========================

export class OptionModel {
  optionsId: string;
  optionsImage?: string | null;
  optionsMax?: number | null;
  optionsMin?: number | null;
  optionsUnit?: string | null;
  optionSelected: boolean;
  optionsIdentity: string;

  constructor(data?: BackendOptionModel | null) {
    this.optionsId = data?.options_id ?? "";
    this.optionsImage = data?.options_image ?? null;
    this.optionsMax = data?.options_max ?? null;
    this.optionsMin = data?.options_min ?? null;
    this.optionsUnit = data?.options_unit ?? null;
    this.optionSelected = data?.options_selected ?? false;
    this.optionsIdentity = data?.options_identity ?? "";
  }

  static from(data: any): OptionModel {
    if (data instanceof OptionModel) return data;
    return new OptionModel({
      options_id: data.optionsId,
      options_image: data.optionsImage,
      options_max: data.optionsMax,
      options_min: data.optionsMin,
      options_unit: data.optionsUnit,
      options_selected: data.optionSelected,
      options_identity: data.optionsIdentity,
    });
  }

  toBackend(): BackendOptionModel {
    return {
      options_id: this.optionsId,
      options_image: this.optionsImage ?? null,
      options_max: this.optionsMax ?? null,
      options_min: this.optionsMin ?? null,
      options_unit: this.optionsUnit ?? null,
      options_selected: this.optionSelected,
      options_identity: this.optionsIdentity,
    };
  }

  copyWith(update: Partial<OptionModel>): OptionModel {
    return new OptionModel({
      options_id: update.optionsId ?? this.optionsId,
      options_image: update.optionsImage ?? this.optionsImage,
      options_max: update.optionsMax ?? this.optionsMax,
      options_min: update.optionsMin ?? this.optionsMin,
      options_unit: update.optionsUnit ?? this.optionsUnit,
      options_selected: update.optionSelected ?? this.optionSelected,
      options_identity: update.optionsIdentity ?? this.optionsIdentity,
    });
  }

  submission(): Record<string, any> {
      return {
        options_id: this.optionsId,
        options_identity: this.optionsIdentity,
      };
  }
}

export class QuestionModel {
  questionsId: string;
  questionsImage?: string | null;
  questionsText: string;

  constructor(data?: BackendQuestionModel | null) {
    this.questionsId = data?.questions_id ?? "";
    this.questionsImage = data?.questions_image ?? null;
    this.questionsText = data?.questions_text ?? "";
  }

  static from(data: any): QuestionModel {
    if (data instanceof QuestionModel) return data;
    return new QuestionModel({
      questions_id: data.questionsId,
      questions_image: data.questionsImage,
      questions_text: data.questionsText,
    });
  }

  toBackend(): BackendQuestionModel {
    return {
      questions_id: this.questionsId,
      questions_image: this.questionsImage ?? null,
      questions_text: this.questionsText,
    };
  }

  copyWith(update: Partial<QuestionModel>): QuestionModel {
    return new QuestionModel({
      questions_id: update.questionsId ?? this.questionsId,
      questions_image: update.questionsImage ?? this.questionsImage,
      questions_text: update.questionsText ?? this.questionsText,
    });
  }
}

export class PoolTimeModel {
  questionTimeId: string;
  questionTimeValue: number;

  constructor(data?: BackendPoolTimeModel | null) {
    this.questionTimeId = data?.question_time_id ?? "";
    this.questionTimeValue = data?.question_time_value ?? 0;
  }

  static from(data: any): PoolTimeModel {
    if (data instanceof PoolTimeModel) return data;
    return new PoolTimeModel({
      question_time_id: data.questionTimeId,
      question_time_value: data.questionTimeValue,
    });
  }

  toBackend(): BackendPoolTimeModel {
    return {
      question_time_id: this.questionTimeId,
      question_time_value: this.questionTimeValue,
    };
  }

  copyWith(update: Partial<PoolTimeModel>): PoolTimeModel {
    return new PoolTimeModel({
      question_time_id: update.questionTimeId ?? this.questionTimeId,
      question_time_value: update.questionTimeValue ?? this.questionTimeValue,
    });
  }
}

export class PoolTypeModel {
  questionTypeId: string;
  questionTypeIdentity: string;
  questionTypeLocalIdentity: string;

  constructor(data?: BackendPoolTypeModel | null) {
    this.questionTypeId = data?.question_type_id ?? "";
    this.questionTypeIdentity = data?.question_type_identity ?? "";
    this.questionTypeLocalIdentity = data?.question_type_local_identity ?? "";
  }

  static from(data: any): PoolTypeModel {
    if (data instanceof PoolTypeModel) return data;
    return new PoolTypeModel({
      question_type_id: data.questionTypeId,
      question_type_identity: data.questionTypeIdentity,
      question_type_local_identity: data.questionTypeLocalIdentity,
    });
  }

  toBackend(): BackendPoolTypeModel {
    return {
      question_type_id: this.questionTypeId,
      question_type_identity: this.questionTypeIdentity,
      question_type_local_identity: this.questionTypeLocalIdentity,
    };
  }

  copyWith(update: Partial<PoolTypeModel>): PoolTypeModel {
    return new PoolTypeModel({
      question_type_id: update.questionTypeId ?? this.questionTypeId,
      question_type_identity: update.questionTypeIdentity ?? this.questionTypeIdentity,
      question_type_local_identity: update.questionTypeLocalIdentity ?? this.questionTypeLocalIdentity,
    });
  }
}

export class PoolQuestion {
  poolsQuestionId: string;
  questionTime?: number | null;
  timeData: PoolTimeModel;
  typeData: PoolTypeModel;
  questionData: QuestionModel;
  optionData: OptionModel[];

  private _timeTaken: number | null = null;

  constructor(data?: BackendPoolQuestion | null) {
    this.poolsQuestionId = data?.pools_question_id ?? "";
    this.questionTime = data?.question_time ?? null;
    this.timeData = new PoolTimeModel(data?.question_time_data ?? null);
    this.typeData = new PoolTypeModel(data?.question_type_data ?? null);
    this.questionData = new QuestionModel(data?.question_data ?? null);
    this.optionData = data?.options_data?.map(o => new OptionModel(o)) ?? [] ;
  }

  static from(data: any): PoolQuestion {
    if (data instanceof PoolQuestion) return data;
    return new PoolQuestion({
      pools_question_id: data.poolsQuestionId,
      question_time: data.questionTime,
      question_time_data: PoolTimeModel.from(data.timeData).toBackend(),
      question_type_data: PoolTypeModel.from(data.typeData).toBackend(),
      question_data: QuestionModel.from(data.questionData).toBackend(),
      options_data: data.optionData?.map((o: any) => OptionModel.from(o).toBackend()) ?? [],
    });
  }

  toBackend(): BackendPoolQuestion {
    return {
      pools_question_id: this.poolsQuestionId,
      question_time: this.questionTime ?? null,
      question_time_data: this.timeData.toBackend(),
      question_type_data: this.typeData.toBackend(),
      question_data: this.questionData.toBackend(),
      options_data: this.optionData.map(o => o.toBackend()),
    };
  }

  copyWith(update: Partial<PoolQuestion>): PoolQuestion {
    return new PoolQuestion({
      pools_question_id: update.poolsQuestionId ?? this.poolsQuestionId,
      question_time: update.questionTime ?? this.questionTime,
      question_time_data: (update.timeData ?? this.timeData).toBackend(),
      question_type_data: (update.typeData ?? this.typeData).toBackend(),
      question_data: (update.questionData ?? this.questionData).toBackend(),
      options_data: (update.optionData ?? this.optionData).map(o => o.toBackend()),
    });
  }

  submission(timeTaken: number): Record<string, any> {
      this._timeTaken = timeTaken;

      return {
        pools_question_id: this.poolsQuestionId,
        time_taken: timeTaken.toFixed(6),
        option_data: this.optionData
         .filter((o) => o.optionSelected)
         .map((o) => o.submission()),
      };
    }

  get timeTaken(): number | null {
      return this._timeTaken;
  }
}
