import React, { useEffect, useState } from 'react';
import { Court } from './types';

export const CourtList: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [courts, setCourts] = useState<Court[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/courts')
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch courts');
                return res.json();
            })
            .then(data => {
                setCourts(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="loading">Loading courts...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="court-list-container">
            <div className="court-list-header">
                <button onClick={onBack} className="btn-back">← Back to Search</button>
                <h2>supported Courts</h2>
            </div>
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>State</th>
                            <th>Court Name</th>
                            <th>State Code</th>
                            <th>Court Code</th>
                        </tr>
                    </thead>
                    <tbody>
                        {courts.map((court, index) => (
                            <tr key={index}>
                                <td>{court.state_name}</td>
                                <td>{court.name}</td>
                                <td>{court.state_code}</td>
                                <td>{court.court_code || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <style>{`
                .court-list-header {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }
                .btn-back {
                    background: none;
                    border: 1px solid #ddd;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .btn-back:hover {
                    background: #f0f0f0;
                }
            `}</style>
        </div>
    );
};
