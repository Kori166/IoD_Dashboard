export type LsoaCurrentRow = {
  code: string;
  label: string;
  ward_code: string | null;
  ward_name: string | null;

  bristol_rank: number;
  bristol_decile: number;
  bristol_score: number;

  ons_score: number | null;
  ons_bristol_rank: number | null;
  ons_bristol_decile: number | null;
  ons_national_rank: number | null;
  ons_national_decile: number | null;

  date: string;
};

export type WardCurrentRow = {
  code: string;
  label: string;

  bristol_score: number;
  ons_score: number;
  lsoa_count: number;
  date: string;

  bristol_score_min?: number;
  bristol_score_median?: number;
  bristol_score_max?: number;

  ons_score_min?: number;
  ons_score_median?: number;
  ons_score_max?: number;

  bristol_rank: number;
  bristol_decile: number;
  ons_bristol_rank: number;
  ons_bristol_decile: number;
};

export type TimeSeriesPoint = {
  date: string;
  rank: number;
  decile: number;
  score: number;
};

export type AreaTimeSeriesRow = {
  code: string;
  label: string;
  points: TimeSeriesPoint[];
};