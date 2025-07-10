const { useState, useEffect, useSyncExternalStore, useMemo } = React;

function App() {
    const losses = useSyncExternalStore(lossesCollection.subscribe, lossesCollection.getList) || [];
    const [showDisclaimer, setShowDisclaimer] = useState(true);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        if (showDisclaimer) return;

        let animationFrameId;
        const root = document.documentElement;

        const visualize = () => {
            const frequencyData = AudioManager.getFrequencyData();
            if (frequencyData) {
                // Bass frequencies for a punchy shadow spread
                const bassFrequencies = frequencyData.slice(0, 5); // 0-~860Hz
                const averageBass = bassFrequencies.reduce((sum, value) => sum + value, 0) / bassFrequencies.length;
                const shadowIntensity = (averageBass / 255) * 35; // Max 35px spread for more impact

                // Mid frequencies for color changes
                const midFrequencies = frequencyData.slice(10, 30); // ~1700Hz-~5100Hz
                const averageMid = midFrequencies.reduce((sum, value) => sum + value, 0) / midFrequencies.length;
                
                // Map mid-range intensity to a hue value (0-360)
                // Let's use a base red hue and shift it
                const baseHue = 0; // Red
                const hueShift = (averageMid / 255) * 120; // Shift up to 120 degrees (red to green)
                const hue = (baseHue + hueShift) % 360;

                const shadowColor = `hsl(${hue}, 100%, 50%)`;
                
                root.style.setProperty('--text-shadow-intensity', `${shadowIntensity}px`);
                root.style.setProperty('--text-shadow-color', shadowColor);
            }
            animationFrameId = requestAnimationFrame(visualize);
        };

        visualize();

        return () => {
            cancelAnimationFrame(animationFrameId);
            root.style.setProperty('--text-shadow-intensity', `4px`); // Reset on cleanup
            root.style.setProperty('--text-shadow-color', `rgba(217, 4, 41, 0.5)`); // Reset color
        };
    }, [showDisclaimer]);

    const handlePlayClick = async () => {
        await lossesCollection.create({});
        setShowDisclaimer(false);
        setIsFading(true);
        
        // Initialize and play audio on user interaction
        await AudioManager.init();
        AudioManager.play();

        setTimeout(() => {
            setIsFading(false);
        }, 10000); // Corresponds to fade animation duration
    };

    const mostRecentLoss = useMemo(() => {
        return losses.length > 0 ? losses[0] : null;
    }, [losses]);

    const allTimeCount = useMemo(() => losses.length, [losses]);
    
    const mostRecentLoser = useMemo(() => {
        return mostRecentLoss ? mostRecentLoss.username : '...';
    }, [mostRecentLoss]);

    const { todayCount, weekCount } = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).setHours(0,0,0,0);

        let today = 0;
        let week = 0;

        for (const loss of losses) {
            const lossTime = new Date(loss.created_at).getTime();
            if (lossTime >= startOfToday) {
                today++;
            }
            if (lossTime >= startOfWeek) {
                week++;
            }
        }
        return { todayCount: today, weekCount: week };
    }, [losses]);

    if (showDisclaimer) {
        return (
            <DisclaimerOverlay
                onPlayClick={handlePlayClick}
                mostRecentLoss={mostRecentLoss}
                weekCount={weekCount}
            />
        );
    }

    return (
        <>
            {isFading && <FadeInOverlay />}
            <div className="corner top-left">
                <div className="counter-box">
                    <span>Most Recent Loser</span>
                    <div id="most-recent-loser" className="counter-value">{mostRecentLoser}</div>
                </div>
            </div>
            <div className="corner top-right">
                <div className="counter-box">
                    <span>Lost Today</span>
                    <div id="today-counter" className="counter-value">{todayCount}</div>
                </div>
            </div>
            <div className="corner bottom-left">
                <div className="counter-box">
                    <span>All Time Losses</span>
                    <div id="all-time-counter" className="counter-value">{allTimeCount}</div>
                </div>
            </div>
            <div className="corner bottom-right">
                 <div className="counter-box">
                    <span>Lost This Week</span>
                    <div id="week-counter" className="counter-value">{weekCount}</div>
                </div>
            </div>
            <Game />
        </>
    );
}