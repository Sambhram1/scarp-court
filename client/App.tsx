import React, { useState, useEffect } from 'react';

interface Case {
    case_number: string;
    petitioner: string;
    respondent: string;
    advocates: {
        petitioner_counsel: string;
        respondent_counsel: string;
    };
    judge_name: string;
}

const COURT_OPTIONS = [
    "ALL COURTS",
    "COURT NO. 01", "COURT NO. 02", "COURT NO. 03 a", "COURT NO. 03 b", "COURT NO. 04",
    "COURT NO. 05", "COURT NO. 06 a", "COURT NO. 06 b", "COURT NO. 07 a", "COURT NO. 07 b",
    "COURT NO. 09", "COURT NO. 10", "COURT NO. 11 a", "COURT NO. 11 b", "COURT NO. 12",
    "COURT NO. 21 a", "COURT NO. 21 b", "COURT NO. 26", "COURT NO. 32 a", "COURT NO. 32 b",
    "COURT NO. 32 c", "COURT NO. 33 a", "COURT NO. 33 b", "COURT NO. 34 a", "COURT NO. 34 b",
    "COURT NO. 37", "COURT NO. 38 a", "COURT NO. 38 b", "COURT NO. 39", "COURT NO. 41",
    "COURT NO. 42", "COURT NO. 43", "COURT NO. 45", "COURT NO. 47", "COURT NO. 50",
    "COURT NO. 51 a", "COURT NO. 51 b", "COURT NO. 51 c", "COURT NO. 51 d", "COURT NO. 52",
    "ADMCJ VIDEO CONFERENCING", "KGTJ CHAMBERS", "NSKJ CHAMBERS", "RSKJ CHAMBERS"
];

function App() {
    const [courtId, setCourtId] = useState('madras');
    const [courtroom, setCourtroom] = useState(COURT_OPTIONS[0]);
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [results, setResults] = useState<Case[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setHasSearched(true);
        setResults([]);

        const url = `/api/cause-list?date=${date}&court=${encodeURIComponent(courtroom)}&courtId=${courtId}&_t=${Date.now()}`;
        console.log(`[Frontend] Fetching: ${url}`);

        try {
            // Include courtId in the request
            // For Delhi, we pass courtId=delhi. The 'court' param (courtroom) is less relevant but we keep it for API compatibility or logging.
            const response = await fetch(url);
            console.log(`[Frontend] Response Status: ${response.status}`);

            if (!response.ok) {
                const text = await response.text();
                console.error(`[Frontend] Error Response: ${text}`);
                throw new Error(`Server returned ${response.status}: ${text}`);
            }

            const data = await response.json();
            console.log(`[Frontend] Data received:`, data);

            if (data.data && data.data.length > 0) {
                setResults(data.data);
            } else {
                setResults([]);
            }
        } catch (err: any) {
            console.error(`[Frontend] Fetch Error:`, err);
            setError(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <div className="header">
                <h1>🏛️ {courtId === 'delhi' ? 'Delhi' : (courtId === 'calcutta' ? 'Calcutta' : (courtId === 'mumbai' ? 'Mumbai' : 'Madras'))} High Court</h1>
                <p>Daily Cause List</p>
            </div>

            <div className="search-card">
                <form onSubmit={handleSearch}>
                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="court-select">High Court</label>
                            <select
                                id="court-select"
                                value={courtId}
                                onChange={(e) => {
                                    setCourtId(e.target.value);
                                    // Reset courtroom if switching to Delhi, Calcutta, or Mumbai
                                    if (['delhi', 'calcutta', 'mumbai'].includes(e.target.value)) {
                                        setCourtroom('ALL COURTS');
                                    } else {
                                        setCourtroom(COURT_OPTIONS[0]);
                                    }
                                }}
                            >
                                <option value="madras">Madras High Court</option>
                                <option value="delhi">Delhi High Court</option>
                                <option value="calcutta">Calcutta High Court</option>
                                <option value="mumbai">Mumbai High Court</option>
                            </select>
                        </div>

                        {courtId === 'madras' && (
                            <div className="form-group">
                                <label htmlFor="courtroom">Courtroom</label>
                                <select
                                    id="courtroom"
                                    required
                                    value={courtroom}
                                    onChange={(e) => setCourtroom(e.target.value)}
                                >
                                    {COURT_OPTIONS.map((court) => (
                                        <option key={court} value={court}>
                                            {court}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Calcutta specific dropdown removed to match Delhi style (Unified List) */}

                        <div className="form-group">
                            <label htmlFor="date">Date</label>
                            <input
                                type="date"
                                id="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>

                        <button type="submit" className="btn-search" disabled={loading}>
                            {loading ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                </form>
            </div>

            {(hasSearched || results.length > 0) && (
                <div className={`results-card ${hasSearched ? 'show' : ''}`}>
                    <div className="results-header">
                        <div className="results-count">
                            {results.length} Case{results.length !== 1 ? 's' : ''} Found - {courtroom}
                        </div>
                    </div>

                    {loading && (
                        <div className="loading">
                            Loading...
                        </div>
                    )}

                    {error && (
                        <div className="error">
                            {error}
                        </div>
                    )}

                    {!loading && !error && results.length > 0 && (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Case Number</th>
                                        <th>Petitioner</th>
                                        <th>Respondent</th>
                                        <th>Pet. Counsel</th>
                                        <th>Resp. Counsel</th>
                                        <th>Judge</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((entry, index) => (
                                        <tr key={index}>
                                            <td>{index + 1}</td>
                                            <td className="case-number">{entry.case_number}</td>
                                            <td>{entry.petitioner}</td>
                                            <td>{entry.respondent}</td>
                                            <td>{entry.advocates.petitioner_counsel || '-'}</td>
                                            <td>{entry.advocates.respondent_counsel || '-'}</td>
                                            <td>{entry.judge_name || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loading && !error && hasSearched && results.length === 0 && (
                        <div className="no-data">
                            No cases found for the selected date and courtroom.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default App;
