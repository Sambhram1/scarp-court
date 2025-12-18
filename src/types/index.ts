export interface CauseListEntry {
    case_number: string;
    case_type: string;
    petitioner: string;
    respondent: string;
    advocates: {
        petitioner_counsel: string;
        respondent_counsel: string;
    };
    bench_type: 'Single' | 'Division' | 'Full' | 'Unknown';
    judge_name: string;
    court_hall: string;
    cause_list_date: string;
    item_number?: string;
    source_type: 'HTML' | 'PDF' | 'JSON';
}

export interface ScrapeOptions {
    date?: string; // YYYY-MM-DD
    forceRefresh?: boolean;
}
