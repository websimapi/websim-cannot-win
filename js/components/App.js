const { useState, useEffect, useSyncExternalStore, useMemo, useCallback } = React;

function App() {
    const losses = useSyncExternalStore(lossesCollection.subscribe, lossesCollection.getList) || [];
    const [gameStarted, setGameStarted] = useState(false);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        if (gameStarted) {
            document.body.classList.add('game-started');
        }
    }, [gameStarted]);

    const handlePlayClick = useCallback(async () => {
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isTouchDevice && screen.orientation && screen.orientation.lock) {
            // This is a "nice-to-have" for landscape-first games, but we now support portrait.
            // We can leave this as some users might prefer landscape. The browser will handle it.
            // Or we could remove it to not suggest a preference. Let's keep it for now.
            try {
                // await screen.orientation.lock('landscape'); // Optional: can be removed
            } catch (err) {
                console.warn("Could not lock orientation. User can choose orientation.", err);
            }
        }

        await lossesCollection.create({});
        setGameStarted(true);
        setIsFading(true);
        
        // Initialize and play audio on user interaction
        await AudioManager.init();
        AudioManager.play();

        setTimeout(() => {
            setIsFading(false);
        }, 10000); // Corresponds to fade animation duration
    }, []);

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

    if (!gameStarted) {
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
            
            {/* Status bar for mobile landscape */}
            <div className="status-bar">
                <div className="status-item">
                    <span>Recent Loser</span>
                    <div className="status-value">{mostRecentLoser}</div>
                </div>
                <div className="status-item">
                    <span>Lost Today</span>
                    <div className="status-value">{todayCount}</div>
                </div>
                <div className="status-item">
                    <span>This Week</span>
                    <div className="status-value">{weekCount}</div>
                </div>
                 <div className="status-item">
                    <span>All Time</span>
                    <div className="status-value">{allTimeCount}</div>
                </div>
            </div>

            {/* Corner boxes for desktop */}
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